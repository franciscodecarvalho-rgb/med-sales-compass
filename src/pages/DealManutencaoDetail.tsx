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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Clock, Plus, XCircle, Wrench, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { STAGE_ORDER, STAGE_LABELS, formatCurrency, daysBetween, stageColorClass, DealStage, RESULTADO_LABELS } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DealManutencaoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<any>(null);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");
  const [openFinal, setOpenFinal] = useState(false);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [d, an] = await Promise.all([
      supabase.from("deals_manutencao").select(`
        *,
        unidades_saude(id, nome, cidade, estado),
        linhas_produto(id, nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_manutencao_vendedor_id_fkey(nome),
        motivos_perda(nome),
        garantias!deals_manutencao_garantia_origem_id_fkey(id, descricao_equipamento, data_fim, data_inicio)
      `).eq("id", id).maybeSingle(),
      // Anotações livres de manutenção (sem vínculo com deal de vendas)
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_id_fkey(nome)")
        .is("archived_at", null).is("deal_id", null)
        .like("texto", `%[manut:${id}]%`).order("created_at", { ascending: false }),
    ]);
    setDeal(d.data);
    setAnotacoes(an.data ?? []);
  }

  async function moverParaEstagio(novo: DealStage) {
    if (novo === "finalizado") { setOpenFinal(true); return; }
    const { error } = await supabase.from("deals_manutencao")
      .update({ estagio: novo, resultado: "em_andamento" }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success(`Movido para ${STAGE_LABELS[novo]}`);
    void load();
  }

  async function addAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnot.trim() || !user) return;
    // Anotação livre marcada com tag para vincular ao deal de manutenção
    const { error } = await supabase.from("anotacoes").insert({
      autor_id: user.id,
      texto: `[manut:${id}] ${novaAnot}`,
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
  const isFinalizado = deal.estagio === "finalizado";

  return (
    <div className="space-y-6 p-6">
      <Link to="/funil-manutencao" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao funil de manutenção
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="h-7 w-7 text-success" />
            <h1 className="text-3xl font-bold tracking-tight">{deal.titulo}</h1>
            <Badge variant="outline" className="bg-success/15 text-success border-success/40 font-bold">MANUTENÇÃO</Badge>
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
        <Card className="border-success/30">
          <CardContent className="p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</div>
            <div className="text-2xl font-bold text-success">{formatCurrency(deal.valor_total)}</div>
            <Badge className={`mt-1 gap-1 ${colorClass}`}>
              <Clock className="h-3 w-3" /> {days}d no estágio
            </Badge>
          </CardContent>
        </Card>
      </div>

      {deal.garantias && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-warning" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">Originado da garantia</div>
              <div className="text-muted-foreground">
                {deal.garantias.descricao_equipamento} · vigente até {format(new Date(deal.garantias.data_fim), "dd/MM/yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <button key={s} onClick={() => moverParaEstagio(s)}
                    className={`flex flex-col items-center rounded-md p-2 text-center transition-all hover:bg-muted ${
                      current ? "bg-success/10 ring-2 ring-success" : reached ? "bg-muted/50" : ""
                    }`}>
                    <div className={`h-2 w-full rounded-full ${reached ? "bg-success" : "bg-muted"}`} />
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

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotações ({anotacoes.length})</TabsTrigger>
          <TabsTrigger value="unidade">Unidade</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Info label="Estágio" value={STAGE_LABELS[deal.estagio as DealStage]} />
                <Info label="Resultado" value={RESULTADO_LABELS[deal.resultado as keyof typeof RESULTADO_LABELS]} />
                <Info label="Valor total" value={formatCurrency(deal.valor_total)} />
                <Info label="Previsão fechamento" value={deal.data_previsao_fechamento ? format(new Date(deal.data_previsao_fechamento), "dd/MM/yyyy") : "—"} />
                <Info label="Criado em" value={format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
                <Info label="Última mudança" value={format(new Date(deal.data_entrada_estagio), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
              </div>
              {deal.observacoes && (
                <div className="pt-3 border-t">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Observações</div>
                  <p className="text-sm whitespace-pre-wrap">{deal.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anotacoes">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">Nova anotação</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addAnotacao} className="space-y-3">
                <Textarea rows={3} value={novaAnot} onChange={(e) => setNovaAnot(e.target.value)} required
                  placeholder="Sobre esse deal de manutenção..." />
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
                  <p className="text-sm whitespace-pre-wrap">{a.texto.replace(/^\[manut:[^\]]+\]\s*/, "")}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {a.profiles?.nome} · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {a.proximo_contato && <> · próx. {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {anotacoes.length === 0 && <p className="text-sm text-muted-foreground">Sem anotações.</p>}
          </div>
        </TabsContent>

        <TabsContent value="unidade">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold text-lg">{deal.unidades_saude?.nome}</div>
              <div className="text-sm text-muted-foreground">
                {[deal.unidades_saude?.cidade, deal.unidades_saude?.estado].filter(Boolean).join(" - ")}
              </div>
              <Link to={`/unidades/${deal.unidades_saude?.id}`}>
                <Button variant="outline" size="sm" className="mt-2">Ver detalhes da unidade</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openFinal} onOpenChange={setOpenFinal}>
        <FinalizarInline deal={deal} onClose={() => { setOpenFinal(false); void load(); }} />
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
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
    const { error } = await supabase.from("deals_manutencao").update({
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
      <DialogHeader><DialogTitle>Finalizar deal de manutenção</DialogTitle></DialogHeader>
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
