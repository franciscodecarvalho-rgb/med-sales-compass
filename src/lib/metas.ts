import { startOfDay, startOfWeek, startOfMonth, endOfMonth, addDays, isBefore, isWeekend } from "date-fns";

// Dias úteis = segunda a sexta. Semana do painel: segunda a sexta da semana corrente.

export type FarolCor = "verde" | "amarelo" | "vermelho";

export interface PeriodoMeta {
  label: string;
  inicio: Date;       // inclusive
  fim: Date;          // exclusive
  diasUteisTotal: number;
  diasUteisDecorridos: number;  // inclui hoje
}

function contarDiasUteis(inicio: Date, fimExclusivo: Date): number {
  let count = 0;
  let d = startOfDay(inicio);
  while (isBefore(d, fimExclusivo)) {
    if (!isWeekend(d)) count++;
    d = addDays(d, 1);
  }
  return count;
}

export function getPeriodos(agora: Date = new Date()): { hoje: PeriodoMeta; semana: PeriodoMeta; mes: PeriodoMeta } {
  const hojeIni = startOfDay(agora);
  const amanha = addDays(hojeIni, 1);

  const segunda = startOfWeek(agora, { weekStartsOn: 1 });
  const sabado = addDays(segunda, 5); // exclusivo → cobre seg–sex

  const mesIni = startOfMonth(agora);
  const mesFim = addDays(startOfDay(endOfMonth(agora)), 1);

  return {
    hoje: {
      label: "Hoje",
      inicio: hojeIni,
      fim: amanha,
      diasUteisTotal: isWeekend(hojeIni) ? 0 : 1,
      diasUteisDecorridos: isWeekend(hojeIni) ? 0 : 1,
    },
    semana: {
      label: "Semana",
      inicio: segunda,
      fim: sabado,
      diasUteisTotal: 5,
      diasUteisDecorridos: contarDiasUteis(segunda, amanha),
    },
    mes: {
      label: "Mês",
      inicio: mesIni,
      fim: mesFim,
      diasUteisTotal: contarDiasUteis(mesIni, mesFim),
      diasUteisDecorridos: contarDiasUteis(mesIni, amanha),
    },
  };
}

// Farol pró-rata: compara o realizado com a meta proporcional aos dias úteis
// já decorridos — assim o mês não fica vermelho até a última semana.
export function calcularFarol(realizado: number, metaDia: number, p: PeriodoMeta): {
  cor: FarolCor;
  metaPeriodo: number;     // meta cheia do período
  metaProRata: number;     // meta esperada até hoje
  pct: number;             // realizado / pró-rata (0–100+)
} {
  const metaPeriodo = metaDia * p.diasUteisTotal;
  const metaProRata = metaDia * Math.max(p.diasUteisDecorridos, 0);

  if (metaProRata === 0) {
    // fim de semana no cartão "hoje" — sem expectativa
    return { cor: "verde", metaPeriodo, metaProRata, pct: 100 };
  }

  const pct = (realizado / metaProRata) * 100;
  const cor: FarolCor = pct >= 100 ? "verde" : pct >= 60 ? "amarelo" : "vermelho";
  return { cor, metaPeriodo, metaProRata, pct };
}

export const FAROL_CLASSES: Record<FarolCor, { border: string; bar: string; text: string }> = {
  verde:    { border: "border-l-4 border-l-success",     bar: "bg-success",     text: "text-success" },
  amarelo:  { border: "border-l-4 border-l-warning",     bar: "bg-warning",     text: "text-warning" },
  vermelho: { border: "border-l-4 border-l-destructive", bar: "bg-destructive", text: "text-destructive" },
};
