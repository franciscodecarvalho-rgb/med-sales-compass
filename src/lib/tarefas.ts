import { isToday } from "date-fns";

/**
 * Ordenação canônica de tarefas, usada em todas as listas:
 * atrasadas (0) → hoje (1) → futuras (2) → sem data (3) → concluídas (4);
 * dentro de cada grupo, por data de vencimento crescente.
 */
export interface TarefaOrdenavel {
  status: string;
  data_vencimento?: string | null;
}

export function tarefaScore(t: TarefaOrdenavel): number {
  if (t.status === "concluida") return 4;
  if (!t.data_vencimento) return t.status === "atrasada" ? 0 : 3;
  const d = new Date(t.data_vencimento);
  if (t.status === "atrasada" || (d.getTime() < Date.now() && !isToday(d))) return 0;
  if (isToday(d)) return 1;
  return 2;
}

export function sortTarefas<T extends TarefaOrdenavel>(tarefas: T[]): T[] {
  return [...tarefas].sort((a, b) => {
    const sa = tarefaScore(a);
    const sb = tarefaScore(b);
    if (sa !== sb) return sa - sb;
    const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity;
    const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity;
    return da - db;
  });
}
