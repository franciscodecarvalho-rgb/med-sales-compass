// LAB — Edge function: proxy + enriquecimento + controle de chamadas
// Ações:
//  - "search":  busca lista de CNPJs na Casa dos Dados
//  - "enrich":  enriquece UM CNPJ via CNPJa (consome 1 chamada)
//  - "places":  busca avaliação Google Places (consome 1 chamada)
//  - "usage":   retorna uso atual (não consome)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CNPJA_KEY = Deno.env.get("CNPJA_API_KEY") ?? "";
const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserAndCheckRole(req: Request): Promise<{ userId: string | null; allowed: boolean }> {
  const auth = req.headers.get("Authorization");
  if (!auth) return { userId: null, allowed: false };
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await sb.auth.getUser();
  const userId = data.user?.id ?? null;
  if (!userId) return { userId: null, allowed: false };
  const [{ data: isManager }, { data: isVendedor }] = await Promise.all([
    sb.rpc("is_admin_or_gerente", { _user_id: userId }),
    sb.rpc("has_role", { _user_id: userId, _role: "vendedor" }),
  ]);
  return { userId, allowed: Boolean(isManager) || Boolean(isVendedor) };
}

async function getUsage(admin: ReturnType<typeof createClient>) {
  const { data } = await admin
    .from("lab_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function bumpUsage(
  admin: ReturnType<typeof createClient>,
  n: number,
) {
  const { data, error } = await admin.rpc("lab_increment_chamadas", { _n: n });
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "usage") {
      return json({ usage: await getUsage(admin) });
    }

    // ========== SEARCH (via CNPJa /office) ==========
    if (action === "search") {
      const { cnae, uf, municipioId, situacao = "ATIVA" } = body;
      const cnaeArr = (Array.isArray(cnae) ? cnae : [cnae])
        .map((c: any) => String(c ?? "").replace(/\D/g, ""))
        .filter(Boolean);
      if (!cnaeArr.length || !uf || !municipioId) {
        return json({ error: "cnae, uf e municipioId são obrigatórios" }, 400);
      }
      // Mapeia situação -> status.id (1=NULA, 2=ATIVA, 3=SUSPENSA, 4=INAPTA, 8=BAIXADA)
      const statusMap: Record<string, string> = {
        ATIVA: "2", SUSPENSA: "3", INAPTA: "4", BAIXADA: "8",
      };
      const statusParam = statusMap[String(situacao).toUpperCase()];

      const usage = await getUsage(admin);
      if (usage && usage.chamadas_mes_atual >= usage.limite_mensal) {
        return json({ error: "limit_reached", usage }, 429);
      }

      const MAX_RECORDS = 150;
      const out: any[] = [];
      const seen = new Set<string>();

      // Busca em CNAE principal e secundário (dois filtros independentes, deduplicando)
      const filters: Array<{ key: string; label: string }> = [
        { key: "mainActivity.id.in", label: "main" },
        { key: "sideActivities.id.in", label: "side" },
      ];

      for (const flt of filters) {
        if (out.length >= MAX_RECORDS) break;
        let cursor: string | null = null;
        for (let page = 0; page < 5 && out.length < MAX_RECORDS; page++) {
          const params = new URLSearchParams();
          if (cursor) {
            // token é mutuamente exclusivo com outros filtros
            params.set("token", cursor);
          } else {
            params.set("limit", "30");
            params.set(flt.key, cnaeArr.join(","));
            params.set("address.state.in", String(uf));
            params.set("address.municipality.in", String(municipioId));
            if (statusParam) params.set("status.id.in", statusParam);
          }

          const r = await fetch(`https://api.cnpja.com/office?${params}`, {
            headers: { Authorization: CNPJA_KEY },
          });
          if (!r.ok) {
            const text = await r.text();
            // Se o filtro secundário falhar, segue só com o principal
            if (flt.label === "side") { console.warn("side activity search failed", r.status, text); break; }
            return json({ error: `CNPJa ${r.status}: ${text}` }, 502);
          }
          const data = await r.json();
          const list: any[] = data?.records ?? [];
          if (!list.length) break;
          for (const item of list) {
            const id = String(item?.taxId ?? "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push(item);
            if (out.length >= MAX_RECORDS) break;
          }
          cursor = data?.next ?? null;
          if (!cursor) break;
        }
      }

      // Cobra uso pela quantidade de registros retornados
      const newUsage = out.length > 0 ? await bumpUsage(admin, out.length) : usage;

      // Mapeia para o formato esperado pelo front (já enriquecido)
      const results = out.map((d: any) => {
        const company = d.company ?? {};
        const members = (company.members ?? []).map((m: any) => ({
          nome: m?.person?.name,
          qualificacao: m?.role?.text,
          entrada: m?.since,
        }));
        const tel = d.phones?.[0]
          ? `${d.phones[0].area}${d.phones[0].number}`
          : null;
        return {
          cnpj: d.taxId,
          razao_social: company.name,
          nome_fantasia: d.alias,
          municipio: d.address?.city,
          uf: d.address?.state,
          atividade_principal: d.mainActivity?.text,
          // payload completo p/ pular enrich
          _enriched: true,
          _data: d,
          _mapped: {
            capital_social: company.equity,
            data_abertura: d.founded,
            porte: company.size?.text,
            cnae_codigo: d.mainActivity?.id ? String(d.mainActivity.id) : undefined,
            cnae_descricao: d.mainActivity?.text,
            email: d.emails?.[0]?.address,
            telefone: tel,
            telefone_receita: tel,
            endereco: [
              d.address?.street, d.address?.number, d.address?.district,
              d.address?.city, d.address?.state,
            ].filter(Boolean).join(", "),
            socios: members,
          },
        };
      });
      return json({ results, usage: newUsage });
    }

    // ========== ENRICH (CNPJa) ==========
    if (action === "enrich") {
      const cnpj = String(body.cnpj || "").replace(/\D/g, "");
      if (!cnpj) return json({ error: "cnpj obrigatório" }, 400);

      const usage = await getUsage(admin);
      if (usage && usage.chamadas_mes_atual >= usage.limite_mensal) {
        return json({ error: "limit_reached", usage }, 429);
      }

      const r = await fetch(`https://api.cnpja.com/office/${cnpj}`, {
        headers: { Authorization: CNPJA_KEY },
      });
      const newUsage = await bumpUsage(admin, 1);
      if (!r.ok) {
        const text = await r.text();
        return json({ error: `CNPJa ${r.status}: ${text}`, usage: newUsage }, 502);
      }
      const data = await r.json();
      return json({ data, usage: newUsage });
    }

    // ========== GOOGLE PLACES ==========
    if (action === "places") {
      const q = String(body.query || "").trim();
      if (!q) return json({ error: "query obrigatória" }, 400);

      const usage = await getUsage(admin);
      if (usage && usage.chamadas_mes_atual >= usage.limite_mensal) {
        return json({ error: "limit_reached", usage }, 429);
      }

      // Find Place
      const findUrl =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${encodeURIComponent(q)}&inputtype=textquery` +
        `&fields=place_id,name,rating,user_ratings_total` +
        `&key=${PLACES_KEY}`;
      const fr = await fetch(findUrl);
      const fdata = await fr.json();
      const placeId = fdata?.candidates?.[0]?.place_id;
      let detail: any = null;
      if (placeId) {
        const dUrl =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${placeId}` +
          `&fields=name,rating,user_ratings_total,website,formatted_phone_number,formatted_address` +
          `&key=${PLACES_KEY}`;
        const dr = await fetch(dUrl);
        const dj = await dr.json();
        detail = dj?.result ?? null;
      }
      const newUsage = await bumpUsage(admin, 1);
      return json({ place: detail, usage: newUsage });
    }

    return json({ error: "ação inválida" }, 400);
  } catch (e) {
    console.error("lab-search error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
