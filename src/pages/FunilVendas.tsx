import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import {
  STAGE_ORDER, STAGE_LABELS, formatCurrency, daysBetween, stageColorClass, DealStage, ESTADOS_BR, RESULTADO_LABELS,
} from "@/lib/crm";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

export default function FunilVendas() {
  const { user, isAdminOrGerente } = useAuth();
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<any[]>([]);
  const [linhaId, setLinhaId] = useState<string>("");
  const [deals, setDeals] = useState<any[]>([]);
  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [activeDeal, setActiveDeal] = useState<any>(null);
  const [perdaDeal, setPerdaDeal] = useState<any>(null);

  useEffect(() => { void loadInitial(); }, []);
  useEffect(() => { if (linhaId) void loadDeals(); }, [linhaId]);

  async function loadInitial() {
    const [ln, vd] = await Promise.all([
      supabase.from("linhas_produto").select("*").is("archived_at", null).order("nome"),
      supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setLinhas(ln.data ?? []);
    setVendedores(vd.data ?? []);
    if (ln.data && ln.data.length > 0) setLinhaId(ln.data[0].id);
  }

  async function loadDeals() {
    const { data, error } = await supabase
      .from("deals")
      .select(`
        *,
        unidades_saude(nome, cidade, estado),
        linhas_produto(nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_vendedor_id_fkey(nome)
      `)
      .eq("linha_id", linhaId)
      .is("archived_at", null)
      .order("data_entrada_estagio", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setDeals(data ?? []);
  }

  const filtered = useMemo(() => deals.filter((d) => {
    if (search && !d.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !d.unidades_saude?.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEstado !== "all" && d.unidades_saude?.estado !== filterEstado) return false;
    if (filterVendedor !== "all" && d.vendedor_id !== filterVendedor) return false;
    return true;
  }), [deals, search, filterEstado, filterVendedor]);

  const linhaAtual = linhas.find((l) => l.id === linhaId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    const d = filtered.find((x) => x.id === e.active.id);
    setActiveDeal(d);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    if (!e.over) return;
    const newStage = e.over.id as DealStage;
    const deal = filtered.find((d) => d.id === e.active.id);
    if (!deal || deal.estagio === newStage) return;

    if (newStage === "finalizado") {
      // pergunta resultado
      setPerdaDeal({ ...deal, _toStage: newStage });
      return;
    }
    const { error } = await supabase
      .from("deals")
      .update({ estagio: newStage, resultado: "em_andamento" })
      .eq("id", deal.id);
    if (error) { toast.error(error.message); return; }
    void loadDeals();
  }

  function exportarExcel() {
    const rows = filtered.map((d) => ({
      Título: d.titulo,
      Unidade: d.unidades_saude?.nome,
      Cidade: d.unidades_saude?.cidade,
      Estado: d.unidades_saude?.estado,
      Linha: d.linhas_produto?.nome,
      Vendedor: d.profiles?.nome,
      Estágio: STAGE_LABELS[d.estagio as DealStage],
      Resultado: RESULTADO_LABELS[d.resultado as keyof typeof RESULTADO_LABELS],
      Valor: Number(d.valor_total),
      "Dias no estágio": daysBetween(d.data_entrada_estagio),
      "Criado em": format(new Date(d.created_at), "dd/MM/yyyy"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, `funil-vendas-${linhaAtual?.nome || "geral"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} deals · {formatCurrency(filtered.reduce((s, d) => s + Number(d.valor_total || 0), 0))}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdminOrGerente && (
            <Button variant="outline" onClick={exportarExcel}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
          )}
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo deal</Button>
            </DialogTrigger>
            <NewDealDialog
              linhas={linhas}
              defaultLinhaId={linhaId}
              onSaved={(id) => { setOpenNew(false); navigate(`/deals/${id}`); }}
            />
          </Dialog>
        </div>
      </div>

      {/* Tabs por linha */}
      <div className="flex flex-wrap gap-2">
        {linhas.map((l) => (
          <button
            key={l.id}
            onClick={() => setLinhaId(l.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              linhaId === l.id ? "text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
            style={linhaId === l.id ? { backgroundColor: l.cor } : undefined}
          >
            {l.nome}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar deal ou unidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos UF</SelectItem>
            {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdminOrGerente && (
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="tabela">Tabela</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGE_ORDER.map((stage) => {
              const dealsStage = filtered.filter((d) => d.estagio === stage);
              return <Column key={stage} stage={stage} deals={dealsStage} linha={linhaAtual} />;
            })}
          </div>
          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} linha={linhaAtual} dragging />}
          </DragOverlay>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const days = daysBetween(d.data_entrada_estagio);
                  return (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/deals/${d.id}`)}>
                      <TableCell className="font-medium">{d.titulo}</TableCell>
                      <TableCell>{d.unidades_saude?.nome}<div className="text-xs text-muted-foreground">{d.unidades_saude?.cidade}-{d.unidades_saude?.estado}</div></TableCell>
                      <TableCell>{d.profiles?.nome}</TableCell>
                      <TableCell><Badge variant="secondary">{STAGE_LABELS[d.estagio as DealStage]}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(d.valor_total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={stageColorClass(days, linhaAtual?.limite_verde_dias ?? 7, linhaAtual?.limite_amarelo_dias ?? 14)}>
                          {days}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum deal.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de motivo de perda quando arrasta para Finalizado */}
      <Dialog open={!!perdaDeal} onOpenChange={(o) => !o && setPerdaDeal(null)}>
        <FinalizarDialog deal={perdaDeal} onClose={() => { setPerdaDeal(null); void loadDeals(); }} />
      </Dialog>
    </div>
  );
}

function Column({ stage, deals, linha }: { stage: DealStage; deals: any[]; linha: any }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  return (
    <div ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-2 transition-colors ${isOver ? "bg-primary/5 border-primary/40" : ""}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold">{STAGE_LABELS[stage]}</div>
          <div className="text-[11px] text-muted-foreground">{deals.length} · {formatCurrency(total)}</div>
        </div>
      </div>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 350px)" }}>
        {deals.map((d) => <DealCard key={d.id} deal={d} linha={linha} />)}
      </div>
    </div>
  );
}

function DealCard({ deal, linha, dragging }: { deal: any; linha: any; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const navigate = useNavigate();
  const days = daysBetween(deal.data_entrada_estagio);
  const colorClass = stageColorClass(days, linha?.limite_verde_dias ?? 7, linha?.limite_amarelo_dias ?? 14);

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : { opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-all ${dragging ? "ring-2 ring-primary" : ""}`}
      onClick={(e) => {
        if (!isDragging) { e.stopPropagation(); navigate(`/deals/${deal.id}`); }
      }}
    >
      <div className="font-medium text-sm leading-tight">{deal.titulo}</div>
      <div className="mt-1 text-xs text-muted-foreground truncate">{deal.unidades_saude?.nome}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{formatCurrency(deal.valor_total)}</span>
        <Badge className={`text-[10px] gap-1 ${colorClass}`}>
          <Clock className="h-3 w-3" /> {days}d
        </Badge>
      </div>
      {deal.profiles?.nome && (
        <div className="mt-1 text-[10px] text-muted-foreground truncate">👤 {deal.profiles.nome}</div>
      )}
    </div>
  );
}

function NewDealDialog({ linhas, defaultLinhaId, onSaved }: { linhas: any[]; defaultLinhaId: string; onSaved: (id: string) => void }) {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState<any[]>([]);
  const [form, setForm] = useState({ titulo: "", unidade_id: "", linha_id: defaultLinhaId, valor_total: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome")
      .then(({ data }) => setUnidades(data ?? []));
  }, []);

  useEffect(() => { setForm((f) => ({ ...f, linha_id: defaultLinhaId })); }, [defaultLinhaId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("deals").insert({
      titulo: form.titulo,
      unidade_id: form.unidade_id,
      linha_id: form.linha_id,
      vendedor_id: user.id,
      valor_total: form.valor_total ? Number(form.valor_total) : 0,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal criado");
    onSaved(data.id);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo deal</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Hospital ABC - 2 ultrassons" />
        </div>
        <div className="space-y-2">
          <Label>Unidade *</Label>
          <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Linha</Label>
            <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_total}
              onChange={(e) => setForm({ ...form, valor_total: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.unidade_id || !form.linha_id}>
            {saving ? "Salvando..." : "Criar deal"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FinalizarDialog({ deal, onClose }: { deal: any; onClose: () => void }) {
  const [resultado, setResultado] = useState<"ganho" | "perdido">("ganho");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!deal) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resultado === "perdido" && !motivo.trim()) {
      toast.error("Motivo de perda é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("deals").update({
      estagio: "finalizado",
      resultado,
      motivo_perda: resultado === "perdido" ? motivo : null,
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
          <div className="space-y-2">
            <Label>Motivo da perda *</Label>
            <Textarea required rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
