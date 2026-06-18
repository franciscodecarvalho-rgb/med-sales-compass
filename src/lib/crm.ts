import { Database } from "@/integrations/supabase/types";

export type DealStage = Database["public"]["Enums"]["deal_stage"];
export type DealResultado = Database["public"]["Enums"]["deal_resultado"];
export type UnidadeTipo = Database["public"]["Enums"]["unidade_tipo"];
export type UnidadeStatus = Database["public"]["Enums"]["unidade_status"];
export type DiscoveryStatus = Database["public"]["Enums"]["discovery_status"];
export type TarefaStatus = Database["public"]["Enums"]["tarefa_status"];
export type TarefaPrioridade = Database["public"]["Enums"]["tarefa_prioridade"];
export type ChamadoPrioridade = Database["public"]["Enums"]["chamado_prioridade"];
export type ChamadoStatus = Database["public"]["Enums"]["chamado_status"];
export type InstalacaoTipo = Database["public"]["Enums"]["instalacao_tipo"];
export type InstalacaoStatus = Database["public"]["Enums"]["instalacao_status"];
export type ContratoStatus = Database["public"]["Enums"]["contrato_status"];
export type GarantiaStatus = Database["public"]["Enums"]["garantia_status"];

export const CHAMADO_PRIORIDADE_LABELS: Record<ChamadoPrioridade, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
export const CHAMADO_PRIORIDADE_BADGE: Record<ChamadoPrioridade, string> = {
  critica: "bg-destructive/20 text-destructive border-destructive/40",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};
export const CHAMADO_STATUS_LABELS: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};
export const CHAMADO_STATUS_BADGE: Record<ChamadoStatus, string> = {
  aberto: "bg-info/15 text-info border-info/30",
  em_atendimento: "bg-primary/15 text-primary border-primary/30",
  resolvido: "bg-success/15 text-success border-success/30",
  fechado: "bg-muted text-muted-foreground border-border",
};

export const INSTALACAO_TIPO_LABELS: Record<InstalacaoTipo, string> = {
  instalacao: "Instalação",
  aplicacao: "Aplicação",
};
export const INSTALACAO_STATUS_LABELS: Record<InstalacaoStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
export const INSTALACAO_STATUS_BADGE: Record<InstalacaoStatus, string> = {
  pendente: "bg-info/15 text-info border-info/30",
  em_andamento: "bg-warning/15 text-warning border-warning/30",
  concluido: "bg-success/15 text-success border-success/30",
};

export const CONTRATO_STATUS_LABELS: Record<ContratoStatus, string> = {
  ativo: "Ativo",
  vencido: "Vencido",
  a_vencer: "A vencer",
};
export const CONTRATO_STATUS_BADGE: Record<ContratoStatus, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  a_vencer: "bg-warning/15 text-warning border-warning/30",
};

export const GARANTIA_STATUS_LABELS: Record<GarantiaStatus, string> = {
  ativa: "Ativa",
  vencida: "Vencida",
  a_vencer: "A vencer",
};
export const GARANTIA_STATUS_BADGE: Record<GarantiaStatus, string> = {
  ativa: "bg-success/15 text-success border-success/30",
  vencida: "bg-destructive/15 text-destructive border-destructive/30",
  a_vencer: "bg-warning/15 text-warning border-warning/30",
};

/** Retorna 'vencida'|'a_vencer'|'ativa' calculado pela data fim. */
export function computeVigenciaStatus(dataFim: string): "ativa" | "a_vencer" | "vencida" {
  const fim = new Date(dataFim);
  const hoje = new Date();
  const diff = (fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencida";
  if (diff <= 30) return "a_vencer";
  return "ativa";
}

/** Cor para a nota do NPS. */
export function npsColorClass(nota: number): string {
  if (nota <= 6) return "bg-destructive/15 text-destructive border-destructive/30";
  if (nota <= 8) return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

export const STAGE_ORDER: DealStage[] = [
  "prospeccao",
  "qualificacao",
  "demonstracao",
  "negociacao",
  "decisao",
  "fechamento",
  "finalizado",
];

export const STAGE_LABELS: Record<DealStage, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  demonstracao: "Demonstração",
  negociacao: "Negociação",
  decisao: "Decisão",
  fechamento: "Fechamento",
  finalizado: "Finalizado",
};

export const RESULTADO_LABELS: Record<DealResultado, string> = {
  em_andamento: "Em andamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const UNIDADE_TIPO_LABELS: Record<UnidadeTipo, string> = {
  hospital: "Hospital",
  clinica: "Clínica",
  ubs: "UBS",
  laboratorio: "Laboratório",
  outro: "Outro",
};

export const UNIDADE_STATUS_LABELS: Record<UnidadeStatus, string> = {
  lead: "Lead",
  cliente: "Cliente",
  inativo: "Inativo",
  nao_interessado: "Não interessado",
};

export const UNIDADE_STATUS_BADGE: Record<UnidadeStatus, string> = {
  lead: "bg-info/15 text-info border-info/30",
  cliente: "bg-warning/15 text-warning border-warning/30",
  inativo: "bg-muted text-muted-foreground border-border",
  nao_interessado: "bg-destructive/15 text-destructive border-destructive/30",
};

export const DISCOVERY_STATUS_LABELS: Record<DiscoveryStatus, string> = {
  em_pesquisa: "Em Pesquisa",
  oficializado: "Oficializado",
  descartado: "Descartado",
  nao_interessado: "Não interessado",
};

export const DISCOVERY_STATUS_BADGE: Record<DiscoveryStatus, string> = {
  em_pesquisa: "bg-info/15 text-info border-info/30",
  oficializado: "bg-success/15 text-success border-success/30",
  descartado: "bg-muted text-muted-foreground border-border",
  nao_interessado: "bg-destructive/15 text-destructive border-destructive/30",
};

// Backward-compat aliases (deprecated, prefer *_STATUS_*)
export type UnidadeCiclo = UnidadeStatus;
export const UNIDADE_CICLO_LABELS = UNIDADE_STATUS_LABELS;
export const UNIDADE_CICLO_BADGE = UNIDADE_STATUS_BADGE;

export const TAREFA_STATUS_LABELS: Record<TarefaStatus, string> = {
  pendente: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  atrasada: "Atrasada",
};

export const TAREFA_STATUS_BADGE: Record<TarefaStatus, string> = {
  pendente: "bg-info/15 text-info border-info/30",
  em_andamento: "bg-primary/15 text-primary border-primary/30",
  concluida: "bg-success/15 text-success border-success/30",
  cancelada: "bg-muted text-muted-foreground border-border",
  atrasada: "bg-destructive/15 text-destructive border-destructive/30",
};

export const TAREFA_PRIORIDADE_BADGE: Record<TarefaPrioridade, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

export const TAREFA_PRIORIDADE_LABELS: Record<TarefaPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export const REGIAO_LABELS: Record<string, string> = {
  ne1: "Nordeste 1 (BA, SE, AL)",
  ne2: "Nordeste 2 (PE, PB, RN)",
  ne3: "Nordeste 3 (CE, PI, MA)",
  outros: "Outros",
};

export function regiaoFromEstado(estado?: string | null): string {
  const uf = (estado || "").toUpperCase();
  if (["BA", "SE", "AL"].includes(uf)) return "ne1";
  if (["PE", "PB", "RN"].includes(uf)) return "ne2";
  if (["CE", "PI", "MA"].includes(uf)) return "ne3";
  if (!uf) return "ne1";
  return "outros";
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(value ?? 0);
}

/**
 * Taxa de conversão canônica: ganhos sobre deals DECIDIDOS (ganhos + perdidos),
 * em %. Deals em andamento NÃO entram no denominador. Usada em todos os dashboards
 * para evitar fórmulas divergentes. Retorna 0 quando não há deals decididos.
 */
export function taxaConversao(ganhos: number, perdidos: number): number {
  const decididos = ganhos + perdidos;
  return decididos > 0 ? (ganhos / decididos) * 100 : 0;
}

/**
 * Busca TODAS as linhas de uma query paginando de pageSize em pageSize, em vez de
 * confiar no teto silencioso do PostgREST (1000) ou num .limit() arbitrário.
 * `buildQuery(from, to)` deve aplicar .range(from, to) e uma ordenação determinística.
 */
export async function fetchAllPaginated<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export function daysBetween(from: string | Date, to: Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  return Math.floor((to.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function stageColorClass(days: number, verde: number, amarelo: number): string {
  if (days <= verde) return "text-success bg-success/10 border-success/30";
  if (days <= amarelo) return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}

// ── Módulo Recorrência de Consumíveis ──────────────────────

export type ConsumiveiStatus = "ativo" | "atencao" | "em_risco" | "inativo" | "pausado";
export type ConsumiveiEstagio = "interesse" | "convertido";
export type OrigemEquipamento = "proprio" | "concorrente" | "desconhecido";

export const CONSUMIVEL_STATUS_LABELS: Record<ConsumiveiStatus, string> = {
  ativo:    "Ativo",
  atencao:  "Atenção",
  em_risco: "Em Risco",
  inativo:  "Inativo",
  pausado:  "Pausado",
};

export const CONSUMIVEL_STATUS_BADGE: Record<ConsumiveiStatus, string> = {
  ativo:    "bg-success/15 text-success border-success/30",
  atencao:  "bg-warning/15 text-warning border-warning/30",
  em_risco: "bg-destructive/15 text-destructive border-destructive/30",
  inativo:  "bg-muted text-muted-foreground border-border",
  pausado:  "bg-secondary/20 text-secondary-foreground border-secondary/40",
};

export const CONSUMIVEL_ESTAGIO_LABELS: Record<ConsumiveiEstagio, string> = {
  interesse: "Interesse",
  convertido: "Convertido",
};

export const CONSUMIVEL_ESTAGIO_BADGE: Record<ConsumiveiEstagio, string> = {
  interesse:  "bg-info/15 text-info border-info/30",
  convertido: "bg-success/15 text-success border-success/30",
};

export const ORIGEM_EQUIPAMENTO_LABELS: Record<OrigemEquipamento, string> = {
  proprio:       "Equipamento próprio",
  concorrente:   "Equipamento concorrente",
  desconhecido:  "Origem desconhecida",
};
