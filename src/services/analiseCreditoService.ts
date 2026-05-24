// src/services/analiseCreditoService.ts
// Camada isolada de integração com a API Lovable de análise de crédito.
// Quando VITE_LOVABLE_ANALISE_URL e VITE_LOVABLE_ANALISE_KEY não estiverem
// configurados, o serviço usa o mock abaixo para desenvolvimento.

export type StatusAnalise =
  | "aprovado"
  | "reprovado"
  | "pendente"
  | "limite_insuficiente"
  | "erro_api";

export interface AnaliseCreditoResponse {
  numero_analise: string;
  status: StatusAnalise;
  limite_aprovado: number | null;
  parcelas_maximas: number | null;
  prazo_maximo_dias: number | null;
  validade_analise: string | null; // ISO date (yyyy-MM-dd)
  observacoes: string | null;
  cliente_consultado: string | null;
}

const API_URL = import.meta.env.VITE_LOVABLE_ANALISE_URL as string | undefined;
const API_KEY = import.meta.env.VITE_LOVABLE_ANALISE_KEY as string | undefined;
const USE_MOCK = !API_URL || !API_KEY;

/**
 * Consulta a análise de crédito pelo número.
 * Nunca lança exceção — erros de rede/API são capturados e retornados
 * como status = 'erro_api' para gravação no histórico.
 */
export async function consultarAnaliseCredito(
  numero: string
): Promise<AnaliseCreditoResponse> {
  if (USE_MOCK) return mockAnalise(numero);

  try {
    const res = await fetch(
      `${API_URL}/analise-credito/${encodeURIComponent(numero)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000), // 15s timeout
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as AnaliseCreditoResponse;
  } catch (err) {
    return {
      numero_analise: numero,
      status: "erro_api",
      limite_aprovado: null,
      parcelas_maximas: null,
      prazo_maximo_dias: null,
      validade_analise: null,
      observacoes: `Erro: ${err instanceof Error ? err.message : "desconhecido"}`,
      cliente_consultado: null,
    };
  }
}

// ---------------------------------------------------------------------------
// MOCK — remover quando a API real estiver disponível
// Lógica baseada no último dígito do número da análise:
//   0 → reprovado
//   1 → pendente
//   2 → limite_insuficiente (aprovado com limite baixo)
//   demais → aprovado com limite 500.000
// ---------------------------------------------------------------------------
function mockAnalise(numero: string): AnaliseCreditoResponse {
  const ultimo = numero.trim().slice(-1);

  if (ultimo === "0") {
    return {
      numero_analise: numero,
      status: "reprovado",
      limite_aprovado: 0,
      parcelas_maximas: null,
      prazo_maximo_dias: null,
      validade_analise: null,
      observacoes: "Restrição no Serasa.",
      cliente_consultado: "CLIENTE MOCK",
    };
  }

  if (ultimo === "1") {
    return {
      numero_analise: numero,
      status: "pendente",
      limite_aprovado: null,
      parcelas_maximas: null,
      prazo_maximo_dias: null,
      validade_analise: null,
      observacoes: "Aguardando documentação.",
      cliente_consultado: "CLIENTE MOCK",
    };
  }

  if (ultimo === "2") {
    return {
      numero_analise: numero,
      status: "aprovado",
      limite_aprovado: 5000, // propositalmente baixo para testar "limite insuficiente"
      parcelas_maximas: 12,
      prazo_maximo_dias: 360,
      validade_analise: new Date(Date.now() + 90 * 86400_000)
        .toISOString()
        .slice(0, 10),
      observacoes: "Aprovado com limite reduzido.",
      cliente_consultado: "CLIENTE MOCK",
    };
  }

  return {
    numero_analise: numero,
    status: "aprovado",
    limite_aprovado: 500_000,
    parcelas_maximas: 48,
    prazo_maximo_dias: 1440,
    validade_analise: new Date(Date.now() + 90 * 86400_000)
      .toISOString()
      .slice(0, 10),
    observacoes: "Análise aprovada.",
    cliente_consultado: "CLIENTE MOCK",
  };
}
