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
import { ArrowLeft, Clock, Plus, Trash2, History, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  STAGE_ORDER, STAGE_LABELS, formatCurrency, daysBetween, stageColorClass, DealStage, RESULTADO_LABELS,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [d, eq, de, h, an, tk] = await Promise.all([
      supabase.from("deals").select(`
        *,
        unidades_saude(id, nome, cidade, estado),
        linhas_produto(id, nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_vendedor_id_fkey(nome),
        motivos_perda(nome)
      `).eq("id", id).maybeSingle(),
      supabase.from("equipamentos").select("id, nome, valor_referencia, linha_id").is("archived_at", null),
      supabase.from("deal_equipamentos").select("*, equipamentos(nome)").eq("deal_id", id),
      supabase.from("deal_stage_history").select("*, profiles!deal_stage_history_changed_by_fkey(nome)").eq("deal_id", id).order("changed_at", { ascending: false }),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_id_fkey(nome)").eq("deal_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("tarefas").select("*").eq("deal_id", id).order("data_vencimento", { ascending: true, nullsFirst: false }),
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
            <h1 className="text-3xl font-bold tracking-tight">{deal.titulo}</h1>
            {isFinalizado && (
              <Badge variant={deal.resultado === "ganho" ? "default" : "destructive"}>
                {RESULTADO_LABELS[deal.resultado as keyof typeof RESULTADO_LABELS]}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link to={`/unidades/${deal.unidades_saude?.id}`} className="font-medium text-foreground hover:underline">
              {deal.unidades_saude?.nome}
            </Link>
            <span>·</span>
            <span style={{ color: deal.linhas_produto?.cor }}>{deal.linhas_produto?.nome}</span>
            <span>·</span>
            <span>👤 {deal.profiles?.nome}</span>
          </div>
        </div>
        <Card className="border-primary/30">
          <CardContent className="p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(deal.valor_total)}</div>
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
                      await supabase.from("deal_equipamentos").delete().eq("id", de.id);
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
          {tarefas.map((t) => (
            <Card key={t.id}>
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
        <FinalizarInline deal={deal} onClose={() => { setOpenFinal(false); void load(); }} />
      </Dialog>
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

function FinalizarInline({ deal, onClose }: { deal: any; onClose: () => void }) {
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
    setSaving(true);
    const motivoNome = motivos.find((m) => m.id === motivoId)?.nome ?? "";
    const { error } = await supabase.from("deals").update({
      estagio: "finalizado",
      resultado,
      motivo_perda_id: resultado === "perdido" ? motivoId : null,
      motivo_perda: resultado === "perdido" ? (motivoExtra ? `${motivoNome} — ${motivoExtra}` : motivoNome) : null,
      data_fechamento: new Date().toISOString(),
    }).eq("id", deal.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(resultado === "ganho" ? "Deal ganho! 🎉" : "Deal encerrado");
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

