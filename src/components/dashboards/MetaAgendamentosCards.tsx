import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Phone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodos, calcularFarol, FAROL_CLASSES, type PeriodoMeta } from "@/lib/metas";
import { format, subDays, startOfDay, addDays, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  userId: string;
  showHistorico?: boolean; // mini-barras dos últimos 7 dias úteis
  canRegister?: boolean;   // mostra botão "+1 Ligação" (apenas no próprio painel)
}

interface Contagens { hoje: number; semana: number; mes: number }
type HistItem = { dia: string; count: number };

export default function MetaAgendamentosCards({ userId, showHistorico = false, canRegister = false }: Props) {
  const [metaAg, setMetaAg] = useState<number | null>(null);
  const [metaLig, setMetaLig] = useState<number | null>(null);
  const [contAg, setContAg] = useState<Contagens | null>(null);
  const [contLig, setContLig] = useState<Contagens | null>(null);
  const [histAg, setHistAg] = useState<HistItem[]>([]);
  const [histLig, setHistLig] = useState<HistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => { void load(); }, [userId]);

  async function load() {
    setLoading(true);
    const periodos = getPeriodos();

    const [metaRes, agHoje, agSem, agMes, ligHoje, ligSem, ligMes] = await Promise.all([
      supabase.from("metas_atividade")
        .select("meta_agendamentos_dia, meta_ligacoes_dia")
        .eq("user_id", userId).eq("ativo", true)
        .maybeSingle(),
      contarAgendamentos(userId, periodos.hoje),
      contarAgendamentos(userId, periodos.semana),
      contarAgendamentos(userId, periodos.mes),
      contarLigacoes(userId, periodos.hoje),
      contarLigacoes(userId, periodos.semana),
      contarLigacoes(userId, periodos.mes),
    ]);

    setMetaAg(metaRes.data?.meta_agendamentos_dia ?? null);
    setMetaLig(metaRes.data?.meta_ligacoes_dia ?? null);
    setContAg({ hoje: agHoje, semana: agSem, mes: agMes });
    setContLig({ hoje: ligHoje, semana: ligSem, mes: ligMes });

    if (showHistorico) {
      const dias = ultimos7DiasUteis();
      const [agCounts, ligCounts] = await Promise.all([
        Promise.all(dias.map(x => contarAgendamentosRange(userId, x.ini, x.fim))),
        Promise.all(dias.map(x => contarLigacoesRange(userId, x.ini, x.fim))),
      ]);
      setHistAg(dias.map((x, i) => ({ dia: x.dia, count: agCounts[i] })));
      setHistLig(dias.map((x, i) => ({ dia: x.dia, count: ligCounts[i] })));
    }
    setLoading(false);
  }

  async function contarAgendamentos(uid: string, p: PeriodoMeta) {
    return contarAgendamentosRange(uid, p.inicio, p.fim);
  }
  async function contarAgendamentosRange(uid: string, ini: Date, fim: Date): Promise<number> {
    const { count } = await supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("criador_id", uid)
      .not("tipo_agendamento", "is", null)
      .gte("created_at", ini.toISOString())
      .lt("created_at", fim.toISOString());
    return count ?? 0;
  }

  async function contarLigacoes(uid: string, p: PeriodoMeta) {
    return contarLigacoesRange(uid, p.inicio, p.fim);
  }
  async function contarLigacoesRange(uid: string, ini: Date, fim: Date): Promise<number> {
    const { count } = await supabase
      .from("ligacoes")
      .select("id", { count: "exact", head: true })
      .eq("vendedor_id", uid)
      .gte("created_at", ini.toISOString())
      .lt("created_at", fim.toISOString());
    return count ?? 0;
  }

  async function registrarLigacao() {
    setRegistrando(true);
    const { error } = await supabase.from("ligacoes").insert({ vendedor_id: userId });
    setRegistrando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ligação registrada");
    void load();
  }

  if (loading) return null;

  // Nenhuma meta definida → aviso discreto
  if (metaAg === null && metaLig === null) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <CalendarCheck className="h-4 w-4 shrink-0" />
          Metas de atividade não definidas para você. Peça ao gestor para configurar em Configurações.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {metaLig !== null && contLig && (
        <FunilGrupo
          titulo="Ligações"
          legenda={`${metaLig}/dia`}
          icone={<Phone className="h-4 w-4 text-primary" />}
          metaDia={metaLig}
          contagens={contLig}
          historico={showHistorico ? histLig : []}
          acao={canRegister ? (
            <Button size="sm" onClick={() => void registrarLigacao()} disabled={registrando}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Ligação
            </Button>
          ) : undefined}
        />
      )}

      {metaAg !== null && contAg && (
        <FunilGrupo
          titulo="Agendamentos"
          legenda={`${metaAg}/dia · call + visita`}
          icone={<CalendarCheck className="h-4 w-4 text-primary" />}
          metaDia={metaAg}
          contagens={contAg}
          historico={showHistorico ? histAg : []}
        />
      )}
    </div>
  );
}

function ultimos7DiasUteis(): Array<{ dia: string; ini: Date; fim: Date }> {
  const dias: Array<{ dia: string; ini: Date; fim: Date }> = [];
  let d = startOfDay(new Date());
  while (dias.length < 7) {
    if (!isWeekend(d)) dias.unshift({ dia: format(d, "EEEEEE", { locale: ptBR }), ini: d, fim: addDays(d, 1) });
    d = subDays(d, 1);
  }
  return dias;
}

interface FunilGrupoProps {
  titulo: string;
  legenda: string;
  icone: React.ReactNode;
  metaDia: number;
  contagens: Contagens;
  historico: HistItem[];
  acao?: React.ReactNode;
}

function FunilGrupo({ titulo, legenda, icone, metaDia, contagens, historico, acao }: FunilGrupoProps) {
  const periodos = getPeriodos();
  const cards = [
    { p: periodos.hoje, realizado: contagens.hoje },
    { p: periodos.semana, realizado: contagens.semana },
    { p: periodos.mes, realizado: contagens.mes },
  ];
  const maxHist = Math.max(...historico.map(h => h.count), metaDia);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icone}
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <span className="text-xs text-muted-foreground">({legenda})</span>
        {acao && <div className="ml-auto">{acao}</div>}
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
                  <p className="text-[10px] text-muted-foreground">Esperado até hoje: {f.metaProRata}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {historico.length > 0 && (
        <div className="flex items-end gap-2 pt-1">
          {historico.map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 rounded-t",
                  h.count >= metaDia ? "bg-success" : h.count > 0 ? "bg-warning" : "bg-muted"
                )}
                style={{ height: `${Math.max(4, (h.count / Math.max(maxHist, 1)) * 48)}px` }}
                title={`${h.count}`}
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
