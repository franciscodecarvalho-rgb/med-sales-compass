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

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
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

    // ========== SEARCH ==========
    if (action === "search") {
      const { cnae, uf, municipio, situacao = "ATIVA" } = body;
      if (!cnae || !uf || !municipio) {
        return json({ error: "cnae, uf e municipio são obrigatórios" }, 400);
      }
      const out: any[] = [];
      for (let page = 1; page <= 5; page++) {
        const r = await fetch(
          "https://api.casadosdados.com.br/v2/public/cnpj/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: {
                atividade_principal: Array.isArray(cnae) ? cnae : [cnae],
                uf: [uf],
                municipio: [municipio],
                situacao_cadastral: situacao,
              },
              page,
            }),
          },
        );
        if (!r.ok) {
          const text = await r.text();
          return json({ error: `Casa dos Dados ${r.status}: ${text}` }, 502);
        }
        const data = await r.json();
        const list = data?.data ?? data?.cnpj ?? [];
        if (!list.length) break;
        out.push(...list);
        if (list.length < 20) break;
      }
      return json({ results: out });
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
