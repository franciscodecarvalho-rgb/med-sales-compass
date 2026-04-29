// Edge function: Discovery Import via Lovable AI Gateway
// Recebe linhas brutas (texto colado de planilha) + listas de referência (tipos, estados),
// devolve array estruturado de discoveries prontos para inserir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Tipo { id: string; nome: string }
interface Estado { id: string; sigla: string; nome: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Texto vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [tiposRes, estadosRes] = await Promise.all([
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null),
    ]);
    const tipos = (tiposRes.data ?? []) as Tipo[];
    const estados = (estadosRes.data ?? []) as Estado[];

    const systemPrompt = `Você é um extrator de dados de unidades de saúde a partir de texto bruto colado de planilhas.
Sua tarefa é identificar cada linha que representa uma unidade (hospital, clínica, laboratório, etc) e extrair campos estruturados.

REGRAS:
- Ignore cabeçalhos, linhas em branco e separadores.
- Para cada unidade encontrada, retorne UM objeto.
- Campos: nome (obrigatório), cidade, estado_sigla (UF de 2 letras), tipo_nome, telefone, site, informacoes_adicionais.
- "tipo_nome" deve ser EXATAMENTE um dos seguintes (ou null se nenhum encaixar): ${tipos.map(t => `"${t.nome}"`).join(", ") || "(nenhum cadastrado)"}.
- "estado_sigla" deve ser EXATAMENTE uma dessas siglas (ou null): ${estados.map(e => e.sigla).join(", ")}.
- "informacoes_adicionais" deve conter qualquer dado extra que não se encaixou nos campos acima (ex: número de leitos, observações, contatos secundários).
- NÃO invente dados. Se um campo não está claro, deixe null.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia as unidades do seguinte texto:\n\n${rawText}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "registrar_unidades",
            description: "Registra a lista de unidades extraídas do texto.",
            parameters: {
              type: "object",
              properties: {
                unidades: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nome: { type: "string" },
                      cidade: { type: ["string", "null"] },
                      estado_sigla: { type: ["string", "null"] },
                      tipo_nome: { type: ["string", "null"] },
                      telefone: { type: ["string", "null"] },
                      site: { type: ["string", "null"] },
                      informacoes_adicionais: { type: ["string", "null"] },
                    },
                    required: ["nome"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["unidades"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "registrar_unidades" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações → Workspace → Uso." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou dados estruturados" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const unidadesBrutas: any[] = args.unidades ?? [];

    // Mapear nomes/siglas para IDs
    const tipoMap = new Map(tipos.map(t => [t.nome.toLowerCase(), t.id]));
    const estadoMap = new Map(estados.map(e => [e.sigla.toUpperCase(), e.id]));

    const enriched = unidadesBrutas.map((u) => ({
      nome: u.nome?.trim(),
      cidade: u.cidade?.trim() || null,
      estado_id: u.estado_sigla ? estadoMap.get(u.estado_sigla.toUpperCase()) ?? null : null,
      estado_sigla: u.estado_sigla ?? null,
      tipo_unidade_id: u.tipo_nome ? tipoMap.get(u.tipo_nome.toLowerCase()) ?? null : null,
      tipo_nome: u.tipo_nome ?? null,
      telefone: u.telefone ?? null,
      site: u.site ?? null,
      informacoes_adicionais: u.informacoes_adicionais ?? null,
    })).filter(u => u.nome);

    return new Response(JSON.stringify({ unidades: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discovery-import-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
