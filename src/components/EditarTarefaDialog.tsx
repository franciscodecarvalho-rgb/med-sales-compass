import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Briefcase, Building2, UserRound, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TAREFA_PRIORIDADE_LABELS, TAREFA_STATUS_LABELS, TAREFA_STATUS_BADGE,
  TarefaPrioridade, TarefaStatus,
} from "@/lib/crm";

const VINCULO_CLS = {
  deal: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900",
  unidade: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900",
  medico: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
  discovery: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
};

export function EditarTarefaDialogContent({ tarefa, onSaved }: { tarefa: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    titulo: tarefa.titulo ?? "",
    data: tarefa.data_vencimento ? new Date(tarefa.data_vencimento).toISOString().slice(0, 16) : "",
    prioridade: (tarefa.prioridade ?? "media") as TarefaPrioridade,
  });
  const [novaNota, setNovaNota] = useState("");
  const [saving, setSaving] = useState(false);

  const historico = (tarefa.descricao ?? "").trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let descricaoFinal = historico;
    if (novaNota.trim()) {
      const stamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const entrada = `[${stamp}] ${novaNota.trim()}`;
      descricaoFinal = historico ? `${historico}\n\n${entrada}` : entrada;
    }
    const { error } = await supabase.from("tarefas").update({
      titulo: form.titulo,
      descricao: descricaoFinal || null,
      data_vencimento: form.data || null,
      prioridade: form.prioridade,
      status: tarefa.status === "atrasada" && form.data && new Date(form.data) > new Date()
        ? "pendente" as TarefaStatus : tarefa.status,
    }).eq("id", tarefa.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa atualizada");
    setNovaNota("");
    onSaved();
  };

  const vinculo = tarefa.deal_id
    ? { to: `/deals/${tarefa.deal_id}`, label: tarefa.deals?.titulo ?? "Deal", tipo: "Deal", icon: <Briefcase className="h-3.5 w-3.5" />, cls: VINCULO_CLS.deal }
    : tarefa.discovery_id
    ? { to: `/discovery/${tarefa.discovery_id}`, label: tarefa.discovery?.nome ?? "Discovery", tipo: "Discovery", icon: <SearchIcon className="h-3.5 w-3.5" />, cls: VINCULO_CLS.discovery }
    : tarefa.unidade_id
    ? { to: `/unidades/${tarefa.unidade_id}`, label: tarefa.unidades_saude?.nome ?? "Unidade", tipo: "Unidade", icon: <Building2 className="h-3.5 w-3.5" />, cls: VINCULO_CLS.unidade }
    : tarefa.medico_id
    ? { to: `/medicos/${tarefa.medico_id}`, label: tarefa.medicos?.nome ? `Dr. ${tarefa.medicos.nome}` : "Médico", tipo: "Médico", icon: <UserRound className="h-3.5 w-3.5" />, cls: VINCULO_CLS.medico }
    : null;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        {vinculo && (
          <Link
            to={vinculo.to}
            onClick={() => onSaved()}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:opacity-80 transition-opacity ${vinculo.cls}`}
          >
            {vinculo.icon}
            <span className="text-[10px] uppercase tracking-wider opacity-70">{vinculo.tipo}</span>
            <span className="font-medium truncate flex-1">{vinculo.label}</span>
            <span className="text-xs opacity-70">Abrir →</span>
          </Link>
        )}
        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Adicionar nota</Label>
          <Textarea
            rows={2}
            placeholder="Digite uma nova nota..."
            value={novaNota}
            onChange={(e) => setNovaNota(e.target.value)}
          />
        </div>
        {historico && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Histórico de notas</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
              {historico}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as TarefaPrioridade })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">{TAREFA_PRIORIDADE_LABELS.alta}</SelectItem>
                <SelectItem value="media">{TAREFA_PRIORIDADE_LABELS.media}</SelectItem>
                <SelectItem value="baixa">{TAREFA_PRIORIDADE_LABELS.baixa}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Status atual: <Badge variant="outline" className={TAREFA_STATUS_BADGE[tarefa.status as TarefaStatus]}>
            {TAREFA_STATUS_LABELS[tarefa.status as TarefaStatus]}
          </Badge>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Wrapper Dialog + Trigger por estado */
export function EditarTarefaDialog({
  tarefa, open, onOpenChange, onSaved,
}: {
  tarefa: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditarTarefaDialogContent tarefa={tarefa} onSaved={onSaved} />
    </Dialog>
  );
}
