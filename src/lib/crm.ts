import { Database } from "@/integrations/supabase/types";

export type DealStage = Database["public"]["Enums"]["deal_stage"];
export type DealResultado = Database["public"]["Enums"]["deal_resultado"];
export type UnidadeTipo = Database["public"]["Enums"]["unidade_tipo"];
export type UnidadeCiclo = Database["public"]["Enums"]["unidade_ciclo"];
export type TarefaStatus = Database["public"]["Enums"]["tarefa_status"];
export type TarefaPrioridade = Database["public"]["Enums"]["tarefa_prioridade"];

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

export const UNIDADE_CICLO_LABELS: Record<UnidadeCiclo, string> = {
  discovery: "Discovery",
  lead: "Ativo",
  cliente: "Cliente",
};

export const UNIDADE_CICLO_BADGE: Record<UnidadeCiclo, string> = {
  discovery: "bg-info/15 text-info border-info/30",
  lead: "bg-success/15 text-success border-success/30",
  cliente: "bg-primary/15 text-primary border-primary/30",
};

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

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(value ?? 0);
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
