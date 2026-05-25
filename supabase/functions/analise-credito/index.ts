// Proxy seguro para a API Lovable de análise de crédito.
// A chave (LOVABLE_ANALISE_KEY) NUNCA é exposta ao cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const API_URL = Deno.env.get("LOVABLE_ANALISE_URL");
const API_KEY = Deno.env.get("LOVABLE_ANALISE_KEY");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mockAnalise(numero: string) {
  const ultimo = numero.trim().slice(-1);
  if (ultimo === "0") {
    return { numero_analise: numero, status: "reprovado", limite_aprovado: 0, parcelas_maximas: null, prazo_maximo_dias: null, validade_analise: null, observacoes: "Restrição no Serasa.", cliente_consultado: "CLIENTE MOCK" };
  }
  if (ultimo === "1") {
    return { numero_analise: numero, status: "pendente", limite_aprovado: null, parcelas_maximas: null, prazo_maximo_dias: null, validade_analise: null, observacoes: "Aguardando documentação.", cliente_consultado: "CLIENTE MOCK" };
  }
  if (ultimo === "2") {
    return { numero_analise: numero, status: "aprovado", limite_aprovado: 5000, parcelas_maximas: 12, prazo_maximo_dias: 360, validade_analise: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10), observacoes: "Aprovado com limite reduzido.", cliente_consultado: "CLIENTE MOCK" };
  }
  return { numero_analise: numero, status: "aprovado", limite_aprovado: 500_000, parcelas_maximas: 48, prazo_maximo_dias: 1440, validade_analise: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10), observacoes: "Análise aprovada.", cliente_consultado: "CLIENTE MOCK" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return json({ error: "Sessão inválida" }, 401);

    // Apenas admin/gerente/vendedor podem consultar análise de crédito
    const [{ data: isManager }, { data: isVendedor }] = await Promise.all([
      sb.rpc("is_admin_or_gerente", { _user_id: userData.user.id }),
      sb.rpc("has_role", { _user_id: userData.user.id, _role: "vendedor" }),
    ]);
    if (!isManager && !isVendedor) return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const numero = String(body?.numero ?? "").trim();
    if (!numero || numero.length > 64) return json({ error: "numero inválido" }, 400);

    if (!API_URL || !API_KEY) {
      return json(mockAnalise(numero));
    }

    try {
      const r = await fetch(`${API_URL}/analise-credito/${encodeURIComponent(numero)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return json(await r.json());
    } catch (err) {
      return json({
        numero_analise: numero,
        status: "erro_api",
        limite_aprovado: null,
        parcelas_maximas: null,
        prazo_maximo_dias: null,
        validade_analise: null,
        observacoes: `Erro: ${err instanceof Error ? err.message : "desconhecido"}`,
        cliente_consultado: null,
      });
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
