import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Calendar } from "lucide-react";
import { toast } from "sonner";
import { TAREFA_PRIORIDADE_BADGE, TAREFA_PRIORIDADE_LABELS, TAREFA_STATUS_BADGE, TAREFA_STATUS_LABELS, TarefaPrioridade, TarefaStatus } from "@/lib/crm";
import { EditarTarefaDialog } from "@/components/EditarTarefaDialog";
import { StakeholderDialog } from "./Stakeholders";

export default function StakeholderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [openEdit, setOpenEdit] = useState(false);
  const [openNova, setOpenNova] = useState(false);
  const [tarefaAberta, setTarefaAberta] = useState<any>(null);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [sR, tR] = await Promise.all([
      supabase.from("stakeholders").select("*").eq("id", id).maybeSingle(),
      supabase.from("tarefas").select("*, stakeholders(id, nome)").eq("stakeholder_id", id).is("archived_at", null).order("data_vencimento", { ascending: true, nullsFirst: false }),
    ]);
    setS(sR.data);
    setTarefas(tR.data ?? []);
  }

  if (!s) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-6 p-6">
      <Link to="/stakeholders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{s.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {s.cargo && <span>{s.cargo}</span>}
            {s.organizacao && <><span>·</span><span>{s.organizacao}</span></>}
            {s.tipo && <><span>·</span><Badge variant="outline">{s.tipo}</Badge></>}
          </div>
        </div>
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogTrigger asChild>
            <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
          </DialogTrigger>
          <StakeholderDialog
            stakeholder={s}
            userId={user?.id}
            onSaved={() => { setOpenEdit(false); void load(); }}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {s.email ?? "—"}</div>
            <div><span className="text-muted-foreground">Telefone:</span> {s.telefone ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{s.observacoes ?? "—"}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tarefas ({tarefas.length})</CardTitle>
          <Dialog open={openNova} onOpenChange={setOpenNova}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova tarefa</Button>
            </DialogTrigger>
            <NovaTarefaStakeholderDialog stakeholderId={s.id} userId={user?.id} onSaved={() => { setOpenNova(false); void load(); }} />
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {tarefas.map((t) => (
            <button
              key={t.id}
              onClick={() => setTarefaAberta(t)}
              className="w-full text-left rounded-md border p-3 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{t.titulo}</div>
                <Badge variant="outline" className={TAREFA_STATUS_BADGE[t.status as TarefaStatus]}>
                  {TAREFA_STATUS_LABELS[t.status as TarefaStatus]}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className={TAREFA_PRIORIDADE_BADGE[t.prioridade as TarefaPrioridade]}>
                  {TAREFA_PRIORIDADE_LABELS[t.prioridade as TarefaPrioridade]}
                </Badge>
                {t.data_vencimento && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(t.data_vencimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </button>
          ))}
          {tarefas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
        </CardContent>
      </Card>

      {tarefaAberta && (
        <EditarTarefaDialog
          tarefa={tarefaAberta}
          open={!!tarefaAberta}
          onOpenChange={(o) => !o && setTarefaAberta(null)}
          onSaved={() => { setTarefaAberta(null); void load(); }}
        />
      )}
    </div>
  );
}

function NovaTarefaStakeholderDialog({
  stakeholderId, userId, onSaved,
}: { stakeholderId: string; userId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    titulo: "", descricao: "", data: "", prioridade: "media" as TarefaPrioridade,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.titulo.trim()) { toast.error("Descreva a tarefa"); return; }
    setSaving(true);
    const { error } = await supabase.from("tarefas").insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao || null,
      responsavel_id: userId,
      criador_id: userId,
      prioridade: form.prioridade,
      data_vencimento: form.data || null,
      stakeholder_id: stakeholderId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa criada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Nova tarefa para stakeholder</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
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
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.titulo.trim()}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
