/**
 * Criação de uma Saída Advance + suas 7 áreas (modelo v2).
 *
 * Cada área tem campos e regra de conclusão próprios — nada de
 * checkbox livre. A regra vive em areaEstaConcluida() e é aplicada
 * pela tela de detalhe a cada salvamento.
 *
 * Usado em dois lugares:
 *  - EnviarParaFaturamentoModal (saída puxada de um deal ganho do funil)
 *  - AdicionarSaidaDiretaModal  (saída avulsa, criada fora do funil, sem deal)
 */
import { supabase } from "@/integrations/supabase/client";

export type FormaPagamento =
  | "a_vista_cartao"
  | "financiado_interno"
  | "financiamento_externo";

export type ChaveArea =
  | "margem"
  | "credito"
  | "legal"
  | "faturamento"
  | "logistica"
  | "instalacao_aplicacao"
  | "nps";

export interface AreaMeta {
  chave: ChaveArea;
  titulo: string;
  descricao: string;
  ordem: number;
  cor: string; // classe tailwind usada na barra segmentada da lista
}

// As 7 áreas de toda saída Advance
export const AREAS_ADVANCE: AreaMeta[] = [
  { chave: "margem",               titulo: "Margem",                 descricao: "Informe a margem e anexe a imagem de comprovação.",            ordem: 1, cor: "bg-blue-400" },
  { chave: "credito",              titulo: "Crédito",                descricao: "À vista: confirme. Financiado: cole o token da análise.",      ordem: 2, cor: "bg-violet-400" },
  { chave: "legal",                titulo: "Legal",                  descricao: "Empresa: anexe a comprovação. Médico: informe o CRM.",         ordem: 3, cor: "bg-rose-400" },
  { chave: "faturamento",          titulo: "Faturamento",            descricao: "Fotografe a caixa e preencha os dados da Nota Fiscal.",        ordem: 4, cor: "bg-orange-400" },
  { chave: "logistica",            titulo: "Logística",              descricao: "Informe o custo da logística e conclua.",                      ordem: 5, cor: "bg-amber-400" },
  { chave: "instalacao_aplicacao", titulo: "Instalação e Aplicação", descricao: "Aguarda instalação e aplicação registradas no Pós-Venda.",     ordem: 6, cor: "bg-teal-400" },
  { chave: "nps",                  titulo: "NPS",                    descricao: "Gere o link da pesquisa e aguarde a resposta do cliente.",     ordem: 7, cor: "bg-green-400" },
];

export const TOTAL_AREAS = AREAS_ADVANCE.length;

/**
 * Regra de conclusão de cada área, derivada dos dados — o status
 * nunca é um checkbox livre.
 *
 * Áreas 6 (instalação/aplicação) e 7 (NPS) não passam por aqui:
 * são concluídas pela verificação no Pós-Venda e pela resposta do
 * cliente (função nps_responder_publico no banco), respectivamente.
 */
export function areaEstaConcluida(
  chave: ChaveArea,
  dados: any,
  temAnexo: boolean
): boolean {
  const d = dados ?? {};
  switch (chave) {
    case "margem":
      return !!String(d.margem ?? "").trim() && temAnexo;
    case "credito":
      return d.forma_pagamento === "a_vista_cartao"
        ? !!d.a_vista_confirmado
        : !!String(d.token ?? "").trim();
    case "legal":
      return d.tipo_cliente === "medico"
        ? !!String(d.crm ?? "").trim()
        : temAnexo;
    case "faturamento":
      return (
        !!String(d.numero_nf ?? "").trim() &&
        !!d.data &&
        d.valor != null && d.valor !== ""
      );
    case "logistica":
      return d.custo != null && d.custo !== "" && !!d.concluido;
    default:
      return false;
  }
}

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
  // Detalhes do financiamento (semeiam a área de crédito)
  analiseDbId?: string | null;
  instituicao?: string | null;
  obsExterno?: string | null;
}

/**
 * Insere a saida_advance e suas 7 áreas. Lança em caso de erro.
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

  // 2. Pré-cria as 7 áreas; a de crédito nasce semeada com a forma de
  //    pagamento e os dados do financiamento coletados no modal.
  const areas = AREAS_ADVANCE.map((area) => ({
    saida_id: saida.id,
    bloco: area.chave,
    chave_item: area.chave,
    ordem: area.ordem,
    concluido: false,
    dados_extras:
      area.chave === "credito"
        ? {
            forma_pagamento: forma,
            analise_credito_id: forma === "financiado_interno" ? analiseDbId : null,
            instituicao: forma === "financiamento_externo" ? instituicao : null,
            observacoes: forma === "financiamento_externo" ? obsExterno : null,
          }
        : null,
  }));

  // Cast: types.ts ainda declara bloco como enum antigo; a migration
  // 20260701090000 converteu a coluna para text (Lovable regenera os types).
  const { error: errAreas } = await supabase
    .from("saidas_advance_itens")
    .insert(areas as any);

  if (errAreas) throw new Error(errAreas.message);

  return saida.id;
}
