import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Calendar } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TAREFA_STATUS_LABELS, TAREFA_STATUS_BADGE,
  TAREFA_PRIORIDADE_LABELS, TAREFA_PRIORIDADE_BADGE,
  TarefaStatus, TarefaPrioridade,
} from "@/lib/crm";

type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  data_vencimento?: string | null;
};

export function TarefasList({ tarefas, onChange }: { tarefas: Tarefa[]; onChange: () => void }) {
  if (tarefas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>;
  }

  async function toggleConcluida(t: Tarefa, checked: boolean) {
    const { error } = await supabase.from("tarefas").update({
      status: checked ? "concluida" : "pendente",
      concluida_em: checked ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success(checked ? "Tarefa concluída" : "Tarefa reaberta");
    onChange();
  }

  // Sort: atrasada > hoje > futuras > concluida
  const ordered = [...tarefas].sort((a, b) => {
    const score = (t: Tarefa) => {
      if (t.status === "concluida") return 4;
      if (t.status === "atrasada") return 0;
      if (t.data_vencimento && isToday(new Date(t.data_vencimento))) return 1;
      if (t.data_vencimento && isPast(new Date(t.data_vencimento))) return 0;
      return 2;
    };
    const sa = score(a), sb = score(b);
    if (sa !== sb) return sa - sb;
    const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity;
    const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity;
    return da - db;
  });

  return (
    <div className="space-y-2">
      {ordered.map((t) => {
        const concluida = t.status === "concluida";
        const atrasada = t.status === "atrasada" ||
          (!concluida && t.data_vencimento && isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento)));
        const hoje = !concluida && t.data_vencimento && isToday(new Date(t.data_vencimento));
        return (
          <Card key={t.id} className={atrasada ? "border-destructive/40 bg-destructive/5" : ""}>
            <CardContent className="p-3 flex items-start gap-3">
              <Checkbox
                checked={concluida}
                onCheckedChange={(v) => toggleConcluida(t, !!v)}
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${concluida ? "line-through text-muted-foreground" : ""}`}>
                  {t.titulo}
                </div>
                {t.descricao && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className={TAREFA_PRIORIDADE_BADGE[t.prioridade]}>
                    {TAREFA_PRIORIDADE_LABELS[t.prioridade]}
                  </Badge>
                  <Badge variant="outline" className={TAREFA_STATUS_BADGE[t.status]}>
                    {TAREFA_STATUS_LABELS[t.status]}
                  </Badge>
                  {hoje && <Badge className="bg-warning/20 text-warning border-warning/40" variant="outline">HOJE</Badge>}
                  {t.data_vencimento && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(t.data_vencimento), "dd MMM HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              {!concluida && (
                <Button size="sm" variant="ghost" onClick={() => toggleConcluida(t, true)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
