import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodos, calcularFarol, FAROL_CLASSES, type PeriodoMeta } from "@/lib/metas";
import { format, subDays, startOfDay, addDays, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  userId: string;
  showHistorico?: boolean; // mini-barras dos últimos 7 dias úteis
}

interface Contagens { hoje: number; semana: number; mes: number }

export default function MetaAgendamentosCards({ userId, showHistorico = false }: Props) {
  const [metaDia, setMetaDia] = useState<number | null>(null);
  const [contagens, setContagens] = useState<Contagens | null>(null);
  const [historico, setHistorico] = useState<Array<{ dia: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, [userId]);

  async function load() {
    setLoading(true);
    const periodos = getPeriodos();

    const [metaRes, hojeRes, semanaRes, mesRes] = await Promise.all([
      supabase.from("metas_atividade")
        .select("meta_agendamentos_dia")
        .eq("user_id", userId).eq("ativo", true)
        .maybeSingle(),
      contar(userId, periodos.hoje),
      contar(userId, periodos.semana),
      contar(userId, periodos.mes),
    ]);

    setMetaDia(metaRes.data?.meta_agendamentos_dia ?? null);
    setContagens({ hoje: hojeRes, semana: semanaRes, mes: mesRes });

    if (showHistorico) {
      // últimos 7 dias úteis com contagem
      const dias: Array<{ dia: string; ini: Date; fim: Date }> = [];
      let d = startOfDay(new Date());
      while (dias.length < 7) {
        if (!isWeekend(d)) {
          dias.unshift({ dia: format(d, "EEEEEE", { locale: ptBR }), ini: d, fim: addDays(d, 1) });
        }
        d = subDays(d, 1);
      }
      const counts = await Promise.all(dias.map(x => contarRange(userId, x.ini, x.fim)));
      setHistorico(dias.map((x, i) => ({ dia: x.dia, count: counts[i] })));
    }
    setLoading(false);
  }

  async function contar(uid: string, p: PeriodoMeta): Promise<number> {
    return contarRange(uid, p.inicio, p.fim);
  }

  async function contarRange(uid: string, ini: Date, fim: Date): Promise<number> {
    const { count } = await supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", uid)
      .not("tipo_agendamento", "is", null)
      .gte("created_at", ini.toISOString())
      .lt("created_at", fim.toISOString());
    return count ?? 0;
  }

  if (loading) return null;
  if (metaDia === null) {
    // Sem meta definida → mostra aviso discreto em vez de sumir sem explicação
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <CalendarCheck className="h-4 w-4 shrink-0" />
          Meta de agendamentos não definida para você. Peça ao gestor para configurar em Configurações.
        </CardContent>
      </Card>
    );
  }

  const periodos = getPeriodos();
  const cards = [
    { p: periodos.hoje, realizado: contagens!.hoje },
    { p: periodos.semana, realizado: contagens!.semana },
    { p: periodos.mes, realizado: contagens!.mes },
  ];

  const maxHist = Math.max(...historico.map(h => h.count), metaDia);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Meta de Agendamentos</h2>
        <span className="text-xs text-muted-foreground">({metaDia}/dia · call + visita)</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(({ p, realizado }) => {
          const f = calcularFarol(realizado, metaDia, p);
          const cls = FAROL_CLASSES[f.cor];
          const barPct = Math.min(100, (realizado / Math.max(f.metaPeriodo, 1)) * 100);
          return (
            <Card key={p.label} className={cls.border}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{p.label}</span>
                  <span className={cn("text-xs font-medium", cls.text)}>
                    {f.metaProRata > 0 ? `${Math.round(f.pct)}%` : "—"}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {realizado}
                  <span className="text-sm font-normal text-muted-foreground"> / {f.metaPeriodo}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full transition-all", cls.bar)} style={{ width: `${barPct}%` }} />
                </div>
                {p.label !== "Hoje" && f.metaProRata > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Esperado até hoje: {f.metaProRata}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showHistorico && historico.length > 0 && (
        <div className="flex items-end gap-2 pt-1">
          {historico.map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 rounded-t",
                  h.count >= metaDia ? "bg-success" : h.count > 0 ? "bg-warning" : "bg-muted"
                )}
                style={{ height: `${Math.max(4, (h.count / Math.max(maxHist, 1)) * 48)}px` }}
                title={`${h.count} agendamentos`}
              />
              <span className="text-[9px] text-muted-foreground">{h.dia}</span>
            </div>
          ))}
          <span className="ml-2 self-center text-[10px] text-muted-foreground">últimos 7 dias úteis</span>
        </div>
      )}
    </div>
  );
}
