import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { format, startOfDay, isSameDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { userId: string }

interface Agendamento {
  id: string;
  titulo: string;
  data_vencimento: string;
  tipo_agendamento: "call" | "visita";
  status: string;
  deal_id: string | null;
  medico_id: string | null;
  unidade_id: string | null;
  deals: { titulo: string } | null;
  medicos: { nome: string } | null;
  unidades_saude: { nome: string } | null;
}

const TIPO_META: Record<string, { label: string; emoji: string; badge: string }> = {
  call:   { label: "Call",   emoji: "📞", badge: "border-info text-info" },
  visita: { label: "Visita", emoji: "🏥", badge: "border-primary text-primary" },
};

export default function AgendaTab({ userId }: Props) {
  const [itens, setItens] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, [userId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("tarefas")
      .select("id, titulo, data_vencimento, tipo_agendamento, status, deal_id, medico_id, unidade_id, deals(titulo), medicos(nome), unidades_saude(nome)")
      .eq("responsavel_id", userId)
      .not("tipo_agendamento", "is", null)
      .not("data_vencimento", "is", null)
      .neq("status", "concluida")
      .is("archived_at", null)
      .order("data_vencimento", { ascending: true })
      .limit(150);
    setItens((data ?? []) as Agendamento[]);
    setLoading(false);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando agenda...</div>;

  const hojeIni = startOfDay(new Date());
  const atrasados = itens.filter(i => new Date(i.data_vencimento) < hojeIni);
  const futuros = itens.filter(i => new Date(i.data_vencimento) >= hojeIni);

  // Agrupa futuros por dia
  const grupos: Array<{ dia: Date; itens: Agendamento[] }> = [];
  for (const it of futuros) {
    const d = startOfDay(new Date(it.data_vencimento));
    const g = grupos.find(x => isSameDay(x.dia, d));
    if (g) g.itens.push(it);
    else grupos.push({ dia: d, itens: [it] });
  }

  function rotuloDia(d: Date): string {
    if (isSameDay(d, hojeIni)) return "Hoje";
    if (isSameDay(d, addDays(hojeIni, 1))) return "Amanhã";
    return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }

  if (atrasados.length === 0 && futuros.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <CalendarDays className="h-5 w-5 shrink-0" />
          Nenhuma call ou visita agendada. Crie agendamentos em Tarefas para vê-los aqui.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Agenda de calls e visitas</h2>
      </div>

      {atrasados.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" /> Atrasados ({atrasados.length})
          </div>
          {atrasados.map(it => <ItemAgenda key={it.id} it={it} atrasado />)}
        </div>
      )}

      {grupos.map(g => (
        <div key={g.dia.toISOString()} className="space-y-2">
          <div className="text-sm font-medium capitalize">
            {rotuloDia(g.dia)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{g.itens.length} agendamento{g.itens.length > 1 ? "s" : ""}</span>
          </div>
          {g.itens.map(it => <ItemAgenda key={it.id} it={it} />)}
        </div>
      ))}
    </div>
  );
}

function ItemAgenda({ it, atrasado = false }: { it: Agendamento; atrasado?: boolean }) {
  const tipo = TIPO_META[it.tipo_agendamento];
  const entidade = it.deals?.titulo || it.medicos?.nome || it.unidades_saude?.nome;
  const link = it.deal_id ? `/deals/${it.deal_id}` : it.medico_id ? `/medicos/${it.medico_id}` : it.unidade_id ? `/unidades/${it.unidade_id}` : "/tarefas";
  const dt = new Date(it.data_vencimento);

  return (
    <Link to={link} className="block">
      <div className={`flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40 ${atrasado ? "border-destructive/40 bg-destructive/5" : ""}`}>
        <div className="flex w-14 shrink-0 flex-col items-center">
          <span className="text-sm font-semibold">{format(dt, "HH:mm")}</span>
          <span className="text-[10px] text-muted-foreground">{format(dt, "dd/MM")}</span>
        </div>
        <Badge variant="outline" className={`shrink-0 text-[11px] ${tipo.badge}`}>{tipo.emoji} {tipo.label}</Badge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{it.titulo}</div>
          {entidade && <div className="truncate text-[11px] text-muted-foreground">{entidade}</div>}
        </div>
      </div>
    </Link>
  );
}
