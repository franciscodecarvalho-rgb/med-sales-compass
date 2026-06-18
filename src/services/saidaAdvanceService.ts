/**
 * Criação de uma Saída Advance + seus 11 itens de checklist.
 *
 * Centraliza a lógica usada em dois lugares:
 *  - EnviarParaFaturamentoModal (saída puxada de um deal ganho do funil)
 *  - AdicionarSaidaDiretaModal  (saída avulsa, criada fora do funil, sem deal)
 */
import { supabase } from "@/integrations/supabase/client";

export type FormaPagamento =
  | "a_vista_cartao"
  | "financiado_interno"
  | "financiamento_externo";

// Itens pré-definidos de cada saída Advance (4 blocos, 11 itens)
export const ITENS_ADVANCE = [
  { bloco: "cadastro",          chave: "cadastro_completo_cliente", ordem: 1  },
  { bloco: "cadastro",          chave: "checagem_regulatoria",      ordem: 2  },
  { bloco: "margem_financeiro", chave: "validacao_margem",          ordem: 3  },
  { bloco: "margem_financeiro", chave: "financiamento",             ordem: 4  },
  { bloco: "margem_financeiro", chave: "validacao_pagamento",       ordem: 5  },
  { bloco: "faturamento",       chave: "validacao_estoque_lotes",   ordem: 6  },
  { bloco: "faturamento",       chave: "inspecao_saida",            ordem: 7  },
  { bloco: "faturamento",       chave: "upload_fotos",              ordem: 8  },
  { bloco: "faturamento",       chave: "nota_fiscal",               ordem: 9  },
  { bloco: "logistica",         chave: "transportadora",            ordem: 10 },
  { bloco: "logistica",         chave: "abrir_contas_pagar",        ordem: 11 },
] as const;

export interface CriarSaidaParams {
  criadoPor: string;
  forma: FormaPagamento;
  // Origem do funil (saída puxada de um deal ganho)
  dealId?: string | null;
  // Saída avulsa (sem deal) — dados informados na mão
  titulo?: string | null;
  unidadeId?: string | null;
  linhaProdutoId?: string | null;
  valorTotal?: number | null;
  tipoSaida?: string | null;
  // Detalhes do financiamento
  analiseDbId?: string | null;
  instituicao?: string | null;
  obsExterno?: string | null;
}

/**
 * Insere a saida_advance e seus 11 itens. Lança em caso de erro.
 * Retorna o id da saída criada.
 */
export async function criarSaidaAdvance(params: CriarSaidaParams): Promise<string> {
  const {
    criadoPor, forma, dealId = null,
    titulo = null, unidadeId = null, linhaProdutoId = null,
    valorTotal = null, tipoSaida = null,
    analiseDbId = null, instituicao = null, obsExterno = null,
  } = params;

  // 1. Cria a saída. Campos manuais só fazem sentido quando não há deal,
  //    mas gravá-los junto não atrapalha (o deal tem prioridade na exibição).
  const { data: saida, error: errSaida } = await supabase
    .from("saidas_advance")
    .insert({
      deal_id: dealId,
      criado_por: criadoPor,
      status: "em_andamento",
      titulo: dealId ? null : titulo,
      unidade_id: dealId ? null : unidadeId,
      linha_produto_id: dealId ? null : linhaProdutoId,
      valor_total: dealId ? null : valorTotal,
      forma_pagamento: forma,
      tipo_saida: (tipoSaida as any) ?? null,
    })
    .select("id")
    .single();

  if (errSaida || !saida) {
    throw new Error(errSaida?.message ?? "Erro ao criar saída Advance");
  }

  // 2. Pré-cria os 11 itens, com os dados do financiamento no item correspondente.
  const itens = ITENS_ADVANCE.map((item) => ({
    saida_id: saida.id,
    bloco: item.bloco,
    chave_item: item.chave,
    ordem: item.ordem,
    concluido: false,
    dados_extras:
      item.chave === "financiamento"
        ? {
            forma_pagamento: forma,
            analise_credito_id: forma === "financiado_interno" ? analiseDbId : null,
            instituicao: forma === "financiamento_externo" ? instituicao : null,
            observacoes: forma === "financiamento_externo" ? obsExterno : null,
          }
        : null,
  }));

  const { error: errItens } = await supabase
    .from("saidas_advance_itens")
    .insert(itens);

  if (errItens) throw new Error(errItens.message);

  return saida.id;
}
