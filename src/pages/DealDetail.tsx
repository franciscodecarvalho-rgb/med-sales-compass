import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Clock, Plus, Trash2, History, XCircle, Pencil, Check, X } from "lucide-react";
import { EnviarParaFaturamentoModal } from "@/components/EnviarParaFaturamentoModal";
import { toast } from "sonner";
import {
  STAGE_ORDER, STAGE_LABELS, formatCurrency, daysBetween, stageColorClass, DealStage, RESULTADO_LABELS, ESTADOS_BR, regiaoFromEstado, REGIAO_LABELS, TarefaPrioridade,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditarTarefaDialog } from "@/components/EditarTarefaDialog";
import UnidadeCombobox from "@/components/UnidadeCombobox";
import PlaybookTab from "@/components/deals/PlaybookTab";

export default function DealDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<any>(null);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [dealEquips, setDealEquips] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");
  const [openFinal, setOpenFinal] = useState(false);
  const [openAdvance, setOpenAdvance] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editTarefa, setEditTarefa] = useState<any | null>(null);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [d, eq, de, h, an, tk] = await Promise.all([
      supabase.from("deals").select(`
        *,
        unidades_saude(id, nome, cidade, estado),
        medicos(id, nome, crm, especialidade),
        linhas_produto(id, nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_vendedor_profile_fkey(nome),
        motivos_perda(nome)
      `).eq("id", id).maybeSingle(),
      supabase.from("equipamentos").select("id, nome, valor_referencia, linha_id").is("archived_at", null),
      supabase.from("deal_equipamentos").select("*, equipamentos(nome)").eq("deal_id", id),
      supabase.from("deal_stage_history").select("*, profiles!deal_stage_history_changed_by_profile_fkey(nome)").eq("deal_id", id).order("changed_at", { ascending: false }),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_profile_fkey(nome)").eq("deal_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("tarefas").select("*, deals(id, titulo)").eq("deal_id", id).order("data_vencimento", { ascending: true, nullsFirst: false }),
    ]);
    setDeal(d.data);
    setEquipamentos(eq.data ?? []);
    setDealEquips(de.data ?? []);
    setHistorico(h.data ?? []);
    setAnotacoes(an.data ?? []);
    setTarefas(tk.data ?? []);
  }

  async function moverParaEstagio(novo: DealStage) {
    if (novo === "finalizado") { setOpenFinal(true); return; }
    const { error } = await supabase.from("deals")
      .update({ estagio: novo, resultado: "em_andamento" }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success(`Movido para ${STAGE_LABELS[novo]}`);
    void load();
  }

  async function addAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnot.trim() || !user) return;
    const { error } = await supabase.from("anotacoes").insert({
      autor_id: user.id, texto: novaAnot, deal_id: id!,
      proximo_contato: proxContato || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Anotação adicionada");
    setNovaAnot(""); setProxContato("");
    void load();
  }

  if (!deal) return <div className="p-6">Carregando...</div>;

  const days = daysBetween(deal.data_entrada_estagio);
  const colorClass = stageColorClass(days,
    deal.linhas_produto?.limite_verde_dias ?? 7,
    deal.linhas_produto?.limite_amarelo_dias ?? 14);
  const eqDaLinha = equipamentos.filter((e) => e.linha_id === deal.linha_id);
  const isFinalizado = deal.estagio === "finalizado";

  return (
    <div className="space-y-6 p-6">
      <Link to="/funil-vendas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao funil
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {(deal as any).numero != null && (
                <span className="text-muted-foreground font-mono mr-2">#{(deal as any).numero}</span>
              )}
              {deal.titulo}
            </h1>
            {isFinalizado && (
              <Badge variant={deal.resultado === "ganho" ? "default" : "destructive"}>
                {RESULTADO_LABELS[deal.resultado as keyof typeof RESULTADO_LABELS]}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setOpenEdit(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {deal.unidades_saude && (
              <Link to={`/unidades/${deal.unidades_saude.id}`} className="font-medium text-foreground hover:underline">
                🏥 {deal.unidades_saude.nome}
              </Link>
            )}
            {deal.medicos && (
              <Link to={`/medicos/${deal.medicos.id}`} className="font-medium text-foreground hover:underline">
                👨‍⚕️ Dr. {deal.medicos.nome}{deal.medicos.crm ? ` (CRM ${deal.medicos.crm})` : ""}
              </Link>
            )}
            <span>·</span>
            <span style={{ color: deal.linhas_produto?.cor }}>{deal.linhas_produto?.nome}</span>
            <span>·</span>
            <span>👤 {deal.profiles?.nome}</span>
          </div>
        </div>
        <Card className="border-primary/30 min-w-[200px]">
          <CardContent className="p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</div>
            <ValorTotalEditor
              dealId={deal.id}
              valor={Number(deal.valor_total ?? 0)}
              temEquipamentos={dealEquips.length > 0}
              onSaved={load}
            />
            <Badge className={`mt-1 gap-1 ${colorClass}`}>
              <Clock className="h-3 w-3" /> {days}d no estágio
            </Badge>
          </CardContent>
        </Card>

      </div>

      {/* Pipeline visual */}
      {!isFinalizado && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {STAGE_ORDER.map((s) => {
                const idx = STAGE_ORDER.indexOf(deal.estagio as DealStage);
                const myIdx = STAGE_ORDER.indexOf(s);
                const reached = myIdx <= idx;
                const current = s === deal.estagio;
                return (
                  <button
                    key={s}
                    onClick={() => moverParaEstagio(s)}
                    className={`flex flex-col items-center rounded-md p-2 text-center transition-all hover:bg-muted ${
                      current ? "bg-primary/10 ring-2 ring-primary" : reached ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className={`h-2 w-full rounded-full ${reached ? "bg-primary" : "bg-muted"}`} />
                    <span className="mt-2 text-[11px] font-medium">{STAGE_LABELS[s]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => setOpenFinal(true)}>
                <XCircle className="mr-2 h-4 w-4" /> Encerrar deal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="equipamentos">
        <TabsList>
          <TabsTrigger value="equipamentos">Equipamentos ({dealEquips.length})</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotações ({anotacoes.length})</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas ({tarefas.length})</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="equipamentos" className="space-y-3">
          <DealEquipAdd dealId={id!} equipamentos={eqDaLinha} onAdded={load} />
          <div className="space-y-2">
            {dealEquips.map((de) => (
              <Card key={de.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">{de.equipamentos?.nome ?? de.descricao ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Qtd: {de.quantidade} {Number(de.valor_unitario) > 0 && <>× {formatCurrency(de.valor_unitario)}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(de.quantidade * Number(de.valor_unitario))}</span>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (!confirm(`Remover "${de.equipamentos?.nome ?? de.descricao ?? "equipamento"}" do deal?`)) return;
                      const { error } = await supabase.from("deal_equipamentos").delete().eq("id", de.id);
                      if (error) { toast.error(error.message); return; }
                      // Recalcula valor total do deal (mesma regra do adicionar)
                      const { data: items } = await supabase.from("deal_equipamentos").select("quantidade, valor_unitario").eq("deal_id", id!);
                      const total = (items ?? []).reduce((s, i) => s + i.quantidade * Number(i.valor_unitario), 0);
                      await supabase.from("deals").update({ valor_total: total }).eq("id", id!);
                      void load();
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {dealEquips.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento. Adicione acima.</p>}
          </div>
        </TabsContent>

        <TabsContent value="anotacoes">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">Nova anotação</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addAnotacao} className="space-y-3">
                <Textarea rows={3} value={novaAnot} onChange={(e) => setNovaAnot(e.target.value)} required
                  placeholder="Sobre esse deal..." />
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Próximo contato (gera tarefa)</Label>
                    <Input type="datetime-local" value={proxContato} onChange={(e) => setProxContato(e.target.value)} />
                  </div>
                  <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {anotacoes.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{a.texto}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {a.profiles?.nome} · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {a.proximo_contato && <> · próx. {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-2">
          <div className="flex justify-end">
            <NovaTarefaDealDialog dealId={id!} userId={user?.id} onCreated={load} />
          </div>
          {tarefas.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setEditTarefa(t)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{t.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.data_vencimento && format(new Date(t.data_vencimento), "dd/MM HH:mm")}
                    </div>
                  </div>
                  <Badge variant={t.status === "concluida" ? "secondary" : "default"}>{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {tarefas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
          {editTarefa && (
            <EditarTarefaDialog
              tarefa={editTarefa}
              open={!!editTarefa}
              onOpenChange={(v) => !v && setEditTarefa(null)}
              onSaved={() => { setEditTarefa(null); void load(); }}
            />
          )}
        </TabsContent>

        <TabsContent value="playbook">
          <PlaybookTab dealId={id!} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-2">
          {historico.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <History className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="text-muted-foreground">
                    {h.estagio_anterior ? STAGE_LABELS[h.estagio_anterior as DealStage] : "—"}
                  </span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{STAGE_LABELS[h.estagio_novo as DealStage]}</span>
                  {h.resultado_novo !== "em_andamento" && (
                    <Badge className="ml-2" variant={h.resultado_novo === "ganho" ? "default" : "destructive"}>
                      {RESULTADO_LABELS[h.resultado_novo as keyof typeof RESULTADO_LABELS]}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {h.profiles?.nome} · {format(new Date(h.changed_at), "dd/MM HH:mm")}
                </div>
              </CardContent>
            </Card>
          ))}
          {historico.length === 0 && <p className="text-sm text-muted-foreground">Sem mudanças registradas ainda.</p>}
        </TabsContent>
      </Tabs>

      {(deal.motivos_perda?.nome || deal.motivo_perda) && deal.resultado === "perdido" && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-sm text-destructive">Motivo da perda</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{deal.motivos_perda?.nome ?? "—"}</p>
            {deal.motivo_perda && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{deal.motivo_perda}</p>}
          </CardContent>
        </Card>
      )}

      <Dialog open={openFinal} onOpenChange={setOpenFinal}>
        <FinalizarInline
          deal={deal}
          onClose={() => { setOpenFinal(false); void load(); }}
          onGanho={() => { setOpenFinal(false); setOpenAdvance(true); }}
        />
      </Dialog>

      <EnviarParaFaturamentoModal
        open={openAdvance}
        deal={deal}
        onClose={() => { setOpenAdvance(false); void load(); }}
        onSuccess={() => { setOpenAdvance(false); void load(); }}
      />

      <EditDealDialog
        open={openEdit}
        deal={deal}
        onClose={() => setOpenEdit(false)}
        onSaved={() => { setOpenEdit(false); void load(); }}
      />
    </div>
  );
}

function ValorTotalEditor({
  dealId, valor, temEquipamentos, onSaved,
}: { dealId: string; valor: number; temEquipamentos: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(valor.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVal(valor.toString()); }, [valor]);

  const save = async () => {
    const num = Number(val.replace(",", "."));
    if (isNaN(num) || num < 0) { toast.error("Valor inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("deals").update({ valor_total: num }).eq("id", dealId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Valor atualizado");
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <Input
          type="number" step="0.01" min="0" autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void save(); }
            if (e.key === "Escape") { setEditing(false); setVal(valor.toString()); }
          }}
          className="h-9 text-right text-lg font-bold"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={save} disabled={saving}>
          <Check className="h-4 w-4 text-success" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(false); setVal(valor.toString()); }}>
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 text-2xl font-bold text-primary hover:opacity-80"
        title="Clique para editar"
      >
        {formatCurrency(valor)}
        <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60" />
      </button>
      {temEquipamentos && (
        <div className="text-[10px] text-muted-foreground">Calculado dos equipamentos</div>
      )}
    </div>
  );
}


function DealEquipAdd({ dealId, equipamentos, onAdded }: { dealId: string; equipamentos: any[]; onAdded: () => void }) {
  const [form, setForm] = useState({ equipamento_id: "", quantidade: "1", valor_unitario: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipamento_id) return;
    const { error } = await supabase.from("deal_equipamentos").insert({
      deal_id: dealId,
      equipamento_id: form.equipamento_id,
      quantidade: Number(form.quantidade),
      valor_unitario: form.valor_unitario ? Number(form.valor_unitario) : 0,
    });
    if (error) { toast.error(error.message); return; }
    // Recalcula valor total do deal
    const { data: items } = await supabase.from("deal_equipamentos").select("quantidade, valor_unitario").eq("deal_id", dealId);
    const total = (items ?? []).reduce((s, i) => s + i.quantidade * Number(i.valor_unitario), 0);
    await supabase.from("deals").update({ valor_total: total }).eq("id", dealId);
    setForm({ equipamento_id: "", quantidade: "1", valor_unitario: "" });
    onAdded();
  };
  const eq = equipamentos.find((x) => x.id === form.equipamento_id);
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-4">
          <Select value={form.equipamento_id} onValueChange={(v) => {
            const e = equipamentos.find((x) => x.id === v);
            setForm({ ...form, equipamento_id: v, valor_unitario: e?.valor_referencia?.toString() ?? form.valor_unitario });
          }}>
            <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
            <SelectContent>
              {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min="1" value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })} placeholder="Qtd" />
          <Input type="number" step="0.01" value={form.valor_unitario}
            onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })}
            placeholder={eq?.valor_referencia ? `Ref: ${formatCurrency(eq.valor_referencia)}` : "Valor unitário"} />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FinalizarInline({ deal, onClose, onGanho }: { deal: any; onClose: () => void; onGanho: () => void }) {
  const [resultado, setResultado] = useState<"ganho" | "perdido">("ganho");
  const [motivoId, setMotivoId] = useState<string>("");
  const [motivoExtra, setMotivoExtra] = useState("");
  const [motivos, setMotivos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("motivos_perda").select("*").is("archived_at", null).order("nome")
      .then(({ data }) => setMotivos(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resultado === "perdido" && !motivoId) {
      toast.error("Selecione um motivo de perda"); return;
    }
    // Se GANHO → delega para o modal Advance
    if (resultado === "ganho") {
      onGanho();
      return;
    }

    setSaving(true);
    const motivoNome = motivos.find((m) => m.id === motivoId)?.nome ?? "";
    const { error } = await supabase.from("deals").update({
      estagio: "finalizado",
      resultado: "perdido",
      motivo_perda_id: motivoId || null,
      motivo_perda: motivoExtra ? `${motivoNome} — ${motivoExtra}` : motivoNome,
      data_fechamento: new Date().toISOString(),
    }).eq("id", deal.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal encerrado");
    onClose();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Finalizar deal</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted-foreground">{deal.titulo}</p>
        <div className="space-y-2">
          <Label>Resultado *</Label>
          <Select value={resultado} onValueChange={(v: "ganho" | "perdido") => setResultado(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ganho">Ganho</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {resultado === "ganho" && (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary font-medium">
            ✅ Você será direcionado para enviar o deal ao Vendas Advance.
          </p>
        )}
        {resultado === "perdido" && (
          <>
            <div className="space-y-2">
              <Label>Motivo da perda *</Label>
              <Select value={motivoId} onValueChange={setMotivoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {motivos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhes (opcional)</Label>
              <Textarea rows={2} value={motivoExtra} onChange={(e) => setMotivoExtra(e.target.value)} />
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditDealDialog({
  open, deal, onClose, onSaved,
}: { open: boolean; deal: any; onClose: () => void; onSaved: () => void }) {
  const { isAdminOrGerente } = useAuth();
  const [unidades, setUnidades] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [medicoSearch, setMedicoSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "", unidade_id: "", medico_id: "", linha_id: "", valor_total: "",
    data_previsao_fechamento: "", vendedor_id: "", estado: "",
  });

  useEffect(() => {
    if (!open || !deal) return;
    setForm({
      titulo: deal.titulo ?? "",
      unidade_id: deal.unidade_id ?? "",
      medico_id: deal.medico_id ?? "",
      linha_id: deal.linha_id ?? "",
      valor_total: deal.valor_total?.toString() ?? "",
      data_previsao_fechamento: deal.data_previsao_fechamento ?? "",
      vendedor_id: deal.vendedor_id ?? "",
      estado: deal.estado ?? "",
    });
  }, [open, deal]);

  useEffect(() => {
    if (!open) return;
    supabase.from("unidades_saude").select("id, nome, cidade, estado, cnpj").is("archived_at", null).order("nome")
      .then(({ data }) => setUnidades(data ?? []));
    supabase.from("medicos").select("id, nome, crm, especialidade").is("archived_at", null).order("nome")
      .then(({ data }) => setMedicos(data ?? []));
    supabase.from("linhas_produto").select("id, nome").is("archived_at", null).order("nome")
      .then(({ data }) => setLinhas(data ?? []));
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setVendedores(data ?? []));
  }, [open]);

  const medicosFiltrados = medicoSearch
    ? medicos.filter((m) => m.nome.toLowerCase().includes(medicoSearch.toLowerCase()) || (m.crm ?? "").toLowerCase().includes(medicoSearch.toLowerCase()))
    : medicos;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.linha_id) { toast.error("Preencha título e linha."); return; }
    setSaving(true);
    const { error } = await supabase.from("deals").update({
      titulo: form.titulo.trim(),
      unidade_id: form.unidade_id || null,
      medico_id: form.medico_id || null,
      linha_id: form.linha_id,
      vendedor_id: form.vendedor_id,
      valor_total: form.valor_total ? Number(form.valor_total) : 0,
      data_previsao_fechamento: form.data_previsao_fechamento || null,
      regiao: regiaoFromEstado(form.estado),
      estado: form.estado || null,
    }).eq("id", deal.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal atualizado");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar deal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nome do deal *</Label>
            <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Unidade de saúde</Label>
            <UnidadeCombobox unidades={unidades} value={form.unidade_id} onChange={(v) => setForm({ ...form, unidade_id: v })} />
          </div>
          <div className="space-y-2">
            <Label>Médico</Label>
            <Input placeholder="Buscar por nome ou CRM..." value={medicoSearch} onChange={(e) => setMedicoSearch(e.target.value)} />
            <Select value={form.medico_id || "__none__"} onValueChange={(v) => setForm({ ...form, medico_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__none__">— sem médico —</SelectItem>
                {medicosFiltrados.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Dr. {m.nome}{m.crm ? ` · CRM ${m.crm}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Linha *</Label>
              <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor total (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_total}
                onChange={(e) => setForm({ ...form, valor_total: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data prevista de fechamento</Label>
              <Input type="date" value={form.data_previsao_fechamento}
                onChange={(e) => setForm({ ...form, data_previsao_fechamento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              {isAdminOrGerente ? (
                <Select value={form.vendedor_id} onValueChange={(v) => setForm({ ...form, vendedor_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled value={vendedores.find((v) => v.id === form.vendedor_id)?.nome ?? "—"} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado || "__none__"} onValueChange={(v) => setForm({ ...form, estado: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none__">— sem estado —</SelectItem>
                  {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Região (automática)</Label>
              <Input disabled value={REGIAO_LABELS[regiaoFromEstado(form.estado)]} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaTarefaDealDialog({ dealId, userId, onCreated }: { dealId: string; userId?: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>("media");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast.error("Usuário não autenticado"); return; }
    setSaving(true);
    const { error } = await supabase.from("tarefas").insert({
      titulo,
      descricao: descricao || null,
      data_vencimento: data || null,
      prioridade,
      deal_id: dealId,
      criador_id: userId,
      responsavel_id: userId,
      status: "pendente",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa criada");
    setTitulo(""); setDescricao(""); setData(""); setPrioridade("media");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova tarefa</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TarefaPrioridade)}>
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
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


