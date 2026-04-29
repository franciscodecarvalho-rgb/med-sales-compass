import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Clock, Search, XCircle, ArrowUpDown, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  STAGE_ORDER, STAGE_LABELS, formatCurrency, DealStage, ESTADOS_BR, RESULTADO_LABELS,
} from "@/lib/crm";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import * as XLSX from "xlsx";

// ---------- Live counter helpers ----------
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
function formatElapsed(fromIso: string, now: number) {
  const ms = Math.max(0, now - new Date(fromIso).getTime());
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
function counterColorClass(fromIso: string, now: number, verdeDias: number, amareloDias: number) {
  const days = (now - new Date(fromIso).getTime()) / 86400000;
  if (days <= verdeDias) return "text-success bg-success/10 border-success/30";
  if (days <= amareloDias) return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}

// ---------- Sort helpers ----------
type SortKey = "titulo" | "unidade" | "vendedor" | "estagio" | "valor" | "tempo" | "status";
type SortDir = "asc" | "desc";

export default function FunilVendas() {
  const { isAdminOrGerente } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const unidadePreSel = searchParams.get("unidade");

  const [linhas, setLinhas] = useState<any[]>([]);
  const [linhaId, setLinhaId] = useState<string>("");
  const [deals, setDeals] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [configContador, setConfigContador] = useState<{ verde: number; amarelo: number }>({ verde: 30, amarelo: 60 });

  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [openNew, setOpenNew] = useState(!!unidadePreSel);
  const [activeDeal, setActiveDeal] = useState<any>(null);
  const [perdaDeal, setPerdaDeal] = useState<any>(null);

  const [sortKey, setSortKey] = useState<SortKey>("tempo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => { void loadInitial(); }, []);
  useEffect(() => { if (linhaId) void loadDeals(); }, [linhaId]);

  async function loadInitial() {
    const [ln, vd, cc] = await Promise.all([
      supabase.from("linhas_produto").select("*").is("archived_at", null).order("nome"),
      supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("config_contador").select("limite_verde_dias, limite_amarelo_dias").eq("is_default", true).maybeSingle(),
    ]);
    setLinhas(ln.data ?? []);
    setVendedores(vd.data ?? []);
    if (cc.data) setConfigContador({ verde: cc.data.limite_verde_dias, amarelo: cc.data.limite_amarelo_dias });
    if (ln.data && ln.data.length > 0) setLinhaId(ln.data[0].id);
  }

  async function loadDeals() {
    const { data, error } = await supabase
      .from("deals")
      .select(`
        *,
        unidades_saude(id, nome, cidade, estado),
        linhas_produto(nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_vendedor_id_fkey(nome),
        motivos_perda(nome)
      `)
      .eq("linha_id", linhaId)
      .is("archived_at", null)
      .order("data_entrada_estagio", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setDeals(data ?? []);
  }

  const linhaAtual = linhas.find((l) => l.id === linhaId);
  // Limites: prioriza config global; usa da linha como override se existir e for diferente do default 7/14
  const verdeLimit = linhaAtual?.limite_verde_dias && linhaAtual.limite_verde_dias !== 7
    ? linhaAtual.limite_verde_dias : configContador.verde;
  const amareloLimit = linhaAtual?.limite_amarelo_dias && linhaAtual.limite_amarelo_dias !== 14
    ? linhaAtual.limite_amarelo_dias : configContador.amarelo;

  const filtered = useMemo(() => deals.filter((d) => {
    const isFinal = d.estagio === "finalizado";
    if (!showFinalizados && isFinal) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.titulo.toLowerCase().includes(q) &&
          !d.unidades_saude?.nome?.toLowerCase().includes(q)) return false;
    }
    if (filterEstado !== "all" && d.unidades_saude?.estado !== filterEstado) return false;
    if (filterVendedor !== "all" && d.vendedor_id !== filterVendedor) return false;
    return true;
  }), [deals, search, filterEstado, filterVendedor, showFinalizados]);

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
      "Motivo perda": d.motivos_perda?.nome ?? d.motivo_perda ?? "",
      Valor: Number(d.valor_total),
      "Dias no estágio": Math.floor((Date.now() - new Date(d.data_entrada_estagio).getTime()) / 86400000),
      "Criado em": format(new Date(d.created_at), "dd/MM/yyyy"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, `funil-vendas-${linhaAtual?.nome || "geral"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
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
              vendedores={vendedores}
              defaultLinhaId={linhaId}
              defaultUnidadeId={unidadePreSel ?? undefined}
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
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-2 px-2">
          <Switch id="show-final" checked={showFinalizados} onCheckedChange={setShowFinalizados} />
          <Label htmlFor="show-final" className="text-sm cursor-pointer">Mostrar finalizados</Label>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="tabela">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGE_ORDER.map((stage) => {
              if (stage === "finalizado" && !showFinalizados) return null;
              const dealsStage = filtered.filter((d) => d.estagio === stage);
              return (
                <Column
                  key={stage}
                  stage={stage}
                  deals={dealsStage}
                  verdeLimit={verdeLimit}
                  amareloLimit={amareloLimit}
                  onEncerrar={(d) => setPerdaDeal(d)}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeDeal && (
              <DealCard deal={activeDeal} verdeLimit={verdeLimit} amareloLimit={amareloLimit} onEncerrar={() => {}} dragging />
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <TabelaDeals
          deals={filtered}
          sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          verdeLimit={verdeLimit} amareloLimit={amareloLimit}
          onEncerrar={(d) => setPerdaDeal(d)}
        />
      )}

      {/* Diálogo de finalizar (drag p/ finalizado ou botão) */}
      <Dialog open={!!perdaDeal} onOpenChange={(o) => !o && setPerdaDeal(null)}>
        <FinalizarDialog deal={perdaDeal} onClose={() => { setPerdaDeal(null); void loadDeals(); }} />
      </Dialog>
    </div>
  );
}

// ============= Coluna do Kanban =============
function Column({ stage, deals, verdeLimit, amareloLimit, onEncerrar }: {
  stage: DealStage; deals: any[]; verdeLimit: number; amareloLimit: number; onEncerrar: (d: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  const isFinal = stage === "finalizado";
  return (
    <div ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
        isFinal ? "bg-muted/60 border-dashed" : "bg-muted/30"
      } ${isOver ? "bg-primary/5 border-primary/40" : ""}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold">{STAGE_LABELS[stage]}</div>
          <div className="text-[11px] text-muted-foreground">{deals.length} · {formatCurrency(total)}</div>
        </div>
      </div>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 350px)" }}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} verdeLimit={verdeLimit} amareloLimit={amareloLimit} onEncerrar={onEncerrar} />
        ))}
      </div>
    </div>
  );
}

// ============= Card do Deal =============
function DealCard({ deal, verdeLimit, amareloLimit, onEncerrar, dragging }: {
  deal: any; verdeLimit: number; amareloLimit: number; onEncerrar: (d: any) => void; dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const navigate = useNavigate();
  const now = useNow(1000);
  const isFinal = deal.estagio === "finalizado";

  const colorClass = isFinal ? "" : counterColorClass(deal.data_entrada_estagio, now, verdeLimit, amareloLimit);

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : { opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`group cursor-grab active:cursor-grabbing rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-all ${
        dragging ? "ring-2 ring-primary" : ""
      } ${isFinal ? "opacity-90" : ""}`}
      onClick={(e) => {
        if (!isDragging) { e.stopPropagation(); navigate(`/deals/${deal.id}`); }
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-medium text-sm leading-tight flex-1">{deal.titulo}</div>
        {!isFinal && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEncerrar(deal); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
            title="Encerrar deal"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground truncate">{deal.unidades_saude?.nome}</div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{formatCurrency(deal.valor_total)}</span>
        {isFinal ? (
          <Badge
            variant="outline"
            className={deal.resultado === "ganho"
              ? "bg-success/15 text-success border-success/40"
              : "bg-destructive/15 text-destructive border-destructive/40"}
          >
            {deal.resultado === "ganho" ? "GANHO" : "PERDIDO"}
          </Badge>
        ) : (
          <Badge variant="outline" className={`text-[10px] gap-1 font-mono tabular-nums ${colorClass}`}>
            <Clock className="h-3 w-3" /> {formatElapsed(deal.data_entrada_estagio, now)}
          </Badge>
        )}
      </div>

      {isFinal && deal.resultado === "perdido" && (deal.motivos_perda?.nome || deal.motivo_perda) && (
        <div className="mt-1 text-[10px] text-destructive truncate">
          Motivo: {deal.motivos_perda?.nome ?? deal.motivo_perda}
        </div>
      )}

      {deal.profiles?.nome && (
        <div className="mt-1 text-[10px] text-muted-foreground truncate">👤 {deal.profiles.nome}</div>
      )}
    </div>
  );
}

// ============= Visão Tabela =============
function TabelaDeals({ deals, sortKey, sortDir, onSort, verdeLimit, amareloLimit, onEncerrar }: {
  deals: any[]; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
  verdeLimit: number; amareloLimit: number; onEncerrar: (d: any) => void;
}) {
  const navigate = useNavigate();
  const now = useNow(1000);

  const sorted = useMemo(() => {
    const arr = [...deals];
    arr.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "titulo": va = a.titulo; vb = b.titulo; break;
        case "unidade": va = a.unidades_saude?.nome ?? ""; vb = b.unidades_saude?.nome ?? ""; break;
        case "vendedor": va = a.profiles?.nome ?? ""; vb = b.profiles?.nome ?? ""; break;
        case "estagio": va = STAGE_ORDER.indexOf(a.estagio); vb = STAGE_ORDER.indexOf(b.estagio); break;
        case "valor": va = Number(a.valor_total ?? 0); vb = Number(b.valor_total ?? 0); break;
        case "tempo": va = new Date(a.data_entrada_estagio).getTime(); vb = new Date(b.data_entrada_estagio).getTime(); break;
        case "status": va = a.resultado; vb = b.resultado; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [deals, sortKey, sortDir]);

  const Sortable = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        {sortKey === k
          ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </TableHead>
  );

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <Sortable k="titulo">Deal</Sortable>
              <Sortable k="unidade">Unidade</Sortable>
              <Sortable k="vendedor">Vendedor</Sortable>
              <Sortable k="estagio">Estágio</Sortable>
              <Sortable k="valor" className="text-right">Valor</Sortable>
              <Sortable k="tempo">Tempo no estágio</Sortable>
              <Sortable k="status">Status</Sortable>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((d, i) => {
              const isFinal = d.estagio === "finalizado";
              return (
                <TableRow key={d.id} className={`cursor-pointer ${i % 2 === 1 ? "bg-muted/20" : ""}`}
                  onClick={() => navigate(`/deals/${d.id}`)}>
                  <TableCell className="font-medium">{d.titulo}</TableCell>
                  <TableCell>
                    {d.unidades_saude?.nome}
                    <div className="text-xs text-muted-foreground">{d.unidades_saude?.cidade}{d.unidades_saude?.estado ? `-${d.unidades_saude.estado}` : ""}</div>
                  </TableCell>
                  <TableCell>{d.profiles?.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{STAGE_LABELS[d.estagio as DealStage]}</Badge></TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(d.valor_total)}</TableCell>
                  <TableCell>
                    {isFinal ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Badge variant="outline" className={`font-mono text-[11px] tabular-nums ${counterColorClass(d.data_entrada_estagio, now, verdeLimit, amareloLimit)}`}>
                        {formatElapsed(d.data_entrada_estagio, now)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isFinal ? (
                      <Badge variant="outline" className={d.resultado === "ganho"
                        ? "bg-success/15 text-success border-success/40"
                        : "bg-destructive/15 text-destructive border-destructive/40"}>
                        {d.resultado === "ganho" ? "GANHO" : "PERDIDO"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Em andamento</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {!isFinal && (
                      <Button variant="ghost" size="icon" onClick={() => onEncerrar(d)} title="Encerrar">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum deal.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============= Modal Novo Deal =============
function NewDealDialog({ linhas, vendedores, defaultLinhaId, defaultUnidadeId, onSaved }: {
  linhas: any[]; vendedores: any[]; defaultLinhaId: string; defaultUnidadeId?: string; onSaved: (id: string) => void;
}) {
  const { user, isAdminOrGerente } = useAuth();
  const [unidades, setUnidades] = useState<any[]>([]);
  const [form, setForm] = useState({
    titulo: "", unidade_id: defaultUnidadeId ?? "",
    linha_id: defaultLinhaId, valor_total: "", data_previsao_fechamento: "",
    vendedor_id: user?.id ?? "",
  });
  const [equips, setEquips] = useState<{ descricao: string; quantidade: number }[]>([]);
  const [novoEquip, setNovoEquip] = useState("");
  const [novaQtd, setNovaQtd] = useState("1");
  const [unidadeSearch, setUnidadeSearch] = useState("");
  const [openNovaUnidade, setOpenNovaUnidade] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome")
      .then(({ data }) => setUnidades(data ?? []));
  }, []);
  useEffect(() => { setForm((f) => ({ ...f, linha_id: defaultLinhaId })); }, [defaultLinhaId]);
  useEffect(() => { if (defaultUnidadeId) setForm((f) => ({ ...f, unidade_id: defaultUnidadeId })); }, [defaultUnidadeId]);

  const unidadesFiltradas = useMemo(() => {
    const q = unidadeSearch.toLowerCase();
    return q ? unidades.filter((u) => u.nome.toLowerCase().includes(q)) : unidades;
  }, [unidades, unidadeSearch]);

  function addEquip() {
    if (!novoEquip.trim()) return;
    setEquips([...equips, { descricao: novoEquip.trim(), quantidade: Number(novaQtd) || 1 }]);
    setNovoEquip(""); setNovaQtd("1");
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("deals").insert({
      titulo: form.titulo,
      unidade_id: form.unidade_id,
      linha_id: form.linha_id,
      vendedor_id: form.vendedor_id || user.id,
      valor_total: form.valor_total ? Number(form.valor_total) : 0,
      data_previsao_fechamento: form.data_previsao_fechamento || null,
    }).select().single();
    if (error) { setSaving(false); toast.error(error.message); return; }

    if (equips.length > 0) {
      const valorPorEquip = form.valor_total ? Number(form.valor_total) / equips.length : 0;
      const itens = equips.map((eq) => ({
        deal_id: data.id,
        descricao: eq.descricao,
        quantidade: eq.quantidade,
        valor_unitario: valorPorEquip / Math.max(1, eq.quantidade),
      }));
      await supabase.from("deal_equipamentos").insert(itens);
    }
    setSaving(false);
    toast.success("Deal criado");
    onSaved(data.id);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo deal</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome do deal *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Hospital ABC - 2 ultrassons" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Unidade de saúde *</Label>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
              onClick={() => setOpenNovaUnidade(true)}>
              <Plus className="h-3 w-3 mr-1" /> Nova unidade
            </Button>
          </div>
          <Input placeholder="Buscar unidade..." value={unidadeSearch} onChange={(e) => setUnidadeSearch(e.target.value)} />
          <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {unidadesFiltradas.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
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
              <Input disabled value={vendedores.find((v) => v.id === user?.id)?.nome ?? "Você"} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Equipamentos (descrição livre)</Label>
          <div className="flex gap-2">
            <Input className="flex-1" placeholder="Ex: Monitor multiparamétrico" value={novoEquip}
              onChange={(e) => setNovoEquip(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEquip(); } }} />
            <Input className="w-20" type="number" min="1" value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} />
            <Button type="button" variant="outline" onClick={addEquip}><Plus className="h-4 w-4" /></Button>
          </div>
          {equips.length > 0 && (
            <div className="space-y-1 rounded-md border p-2">
              {equips.map((eq, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span><span className="font-medium">{eq.quantidade}×</span> {eq.descricao}</span>
                  <button type="button" onClick={() => setEquips(equips.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving || !form.titulo || !form.unidade_id || !form.linha_id}>
            {saving ? "Salvando..." : "Criar deal"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ============= Modal Finalizar Deal =============
function FinalizarDialog({ deal, onClose }: { deal: any; onClose: () => void }) {
  const [resultado, setResultado] = useState<"ganho" | "perdido">("ganho");
  const [motivoId, setMotivoId] = useState<string>("");
  const [motivoExtra, setMotivoExtra] = useState("");
  const [motivos, setMotivos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("motivos_perda").select("*").is("archived_at", null).order("nome")
      .then(({ data }) => setMotivos(data ?? []));
  }, []);

  if (!deal) return null;

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
      <DialogHeader><DialogTitle>Encerrar deal</DialogTitle></DialogHeader>
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
