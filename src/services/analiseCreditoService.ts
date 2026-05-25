// src/services/analiseCreditoService.ts
// Wrapper que invoca a edge function `analise-credito`. A chave da API
// nunca trafega no cliente — fica armazenada como secret no servidor.

import { supabase } from "@/integrations/supabase/client";

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
  validade_analise: string | null;
  observacoes: string | null;
  cliente_consultado: string | null;
}

export async function consultarAnaliseCredito(
  numero: string
): Promise<AnaliseCreditoResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("analise-credito", {
      body: { numero },
    });
    if (error) throw error;
    return data as AnaliseCreditoResponse;
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
