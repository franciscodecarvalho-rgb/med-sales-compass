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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Search, XCircle, ArrowUpDown, ArrowDown, ArrowUp, Wrench } from "lucide-react";
import { toast } from "sonner";
import { STAGE_ORDER, STAGE_LABELS, formatCurrency, DealStage, ESTADOS_BR } from "@/lib/crm";
import { ExportButton, exportToExcel } from "@/lib/export";
import QuickUnidadeDialog from "@/components/QuickUnidadeDialog";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";

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
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
function counterColorClass(fromIso: string, now: number, verde: number, amarelo: number) {
  const days = (now - new Date(fromIso).getTime()) / 86400000;
  if (days <= verde) return "text-success bg-success/10 border-success/30";
  if (days <= amarelo) return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}

type SortKey = "titulo" | "unidade" | "vendedor" | "estagio" | "valor" | "tempo" | "status";
type SortDir = "asc" | "desc";

export default function FunilManutencao() {
  const { isAdminOrGerente } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const garantiaPre = searchParams.get("garantia");
  const unidadePre = searchParams.get("unidade");
  const linhaPre = searchParams.get("linha");

  const [linhas, setLinhas] = useState<any[]>([]);
  const [linhaId, setLinhaId] = useState<string>("");
  const [deals, setDeals] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [config, setConfig] = useState({ verde: 30, amarelo: 60 });

  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [showFinal, setShowFinal] = useState(false);
  const [openNew, setOpenNew] = useState(!!garantiaPre || !!unidadePre);
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
    if (cc.data) setConfig({ verde: cc.data.limite_verde_dias, amarelo: cc.data.limite_amarelo_dias });
    if (ln.data && ln.data.length > 0) {
      setLinhaId(linhaPre && ln.data.some((l) => l.id === linhaPre) ? linhaPre : ln.data[0].id);
    }
  }

  async function loadDeals() {
    const { data, error } = await supabase
      .from("deals_manutencao")
      .select(`
        *,
        unidades_saude(id, nome, cidade, estado),
        linhas_produto(nome, cor, limite_verde_dias, limite_amarelo_dias),
        profiles!deals_manutencao_vendedor_id_fkey(nome),
        motivos_perda(nome),
        garantias!deals_manutencao_garantia_origem_id_fkey(id, descricao_equipamento, data_fim)
      `)
      .eq("linha_id", linhaId)
      .is("archived_at", null)
      .order("data_entrada_estagio", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setDeals(data ?? []);
  }

  const linhaAtual = linhas.find((l) => l.id === linhaId);
  const verdeLimit = linhaAtual?.limite_verde_dias && linhaAtual.limite_verde_dias !== 7
    ? linhaAtual.limite_verde_dias : config.verde;
  const amareloLimit = linhaAtual?.limite_amarelo_dias && linhaAtual.limite_amarelo_dias !== 14
    ? linhaAtual.limite_amarelo_dias : config.amarelo;

  const filtered = useMemo(() => deals.filter((d) => {
    const isFinal = d.estagio === "finalizado";
    if (!showFinal && isFinal) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.titulo.toLowerCase().includes(q) &&
          !d.unidades_saude?.nome?.toLowerCase().includes(q)) return false;
    }
    if (filterEstado !== "all" && d.unidades_saude?.estado !== filterEstado) return false;
    if (filterVendedor !== "all" && d.vendedor_id !== filterVendedor) return false;
    return true;
  }), [deals, search, filterEstado, filterVendedor, showFinal]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    setActiveDeal(filtered.find((x) => x.id === e.active.id));
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
      .from("deals_manutencao")
      .update({ estagio: newStage, resultado: "em_andamento" })
      .eq("id", deal.id);
    if (error) { toast.error(error.message); return; }
    void loadDeals();
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-7 w-7 text-success" /> Funil de Manutenção
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} deals · {formatCurrency(filtered.reduce((s, d) => s + Number(d.valor_total || 0), 0))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton onExport={() => exportToExcel(filtered.map((d: any) => ({
            Titulo: d.titulo, Estagio: STAGE_LABELS[d.estagio as DealStage], Resultado: d.resultado,
            Valor: Number(d.valor_total), Unidade: d.unidades_saude?.nome,
            Cidade: d.unidades_saude?.cidade, Estado: d.unidades_saude?.estado,
            Linha: d.linhas_produto?.nome, Vendedor: d.profiles?.nome,
            Previsao: d.data_previsao_fechamento,
          })), "deals-manutencao", "Manutenção")} />
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo deal</Button>
            </DialogTrigger>
            <NewDealManutDialog
              linhas={linhas}
              vendedores={vendedores}
              defaultLinhaId={linhaId}
              defaultUnidadeId={unidadePre ?? undefined}
              garantiaId={garantiaPre ?? undefined}
              onSaved={(id) => { setOpenNew(false); navigate(`/deals-manutencao/${id}`); }}
            />
          </Dialog>
        </div>
      </div>

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
          <Switch id="show-final-m" checked={showFinal} onCheckedChange={setShowFinal} />
          <Label htmlFor="show-final-m" className="text-sm cursor-pointer">Mostrar finalizados</Label>
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
              if (stage === "finalizado" && !showFinal) return null;
              const list = filtered.filter((d) => d.estagio === stage);
              return (
                <Column key={stage} stage={stage} deals={list}
                  verdeLimit={verdeLimit} amareloLimit={amareloLimit}
                  onEncerrar={(d) => setPerdaDeal(d)} />
              );
            })}
          </div>
          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} verdeLimit={verdeLimit} amareloLimit={amareloLimit} onEncerrar={() => {}} dragging />}
          </DragOverlay>
        </DndContext>
      ) : (
        <TabelaDeals deals={filtered} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          verdeLimit={verdeLimit} amareloLimit={amareloLimit}
          onEncerrar={(d) => setPerdaDeal(d)} />
      )}

      <Dialog open={!!perdaDeal} onOpenChange={(o) => !o && setPerdaDeal(null)}>
        <FinalizarDialog deal={perdaDeal} onClose={() => { setPerdaDeal(null); void loadDeals(); }} />
      </Dialog>
    </div>
  );
}

// ============= Coluna Kanban =============
function Column({ stage, deals, verdeLimit, amareloLimit, onEncerrar }: {
  stage: DealStage; deals: any[]; verdeLimit: number; amareloLimit: number; onEncerrar: (d: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  const isFinal = stage === "finalizado";
  return (
    <div ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors ${
        isFinal ? "bg-muted/60 border-dashed" : "bg-success/5 border-success/20"
      } ${isOver ? "bg-success/10 border-success/40" : ""}`}>
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

// ============= Card =============
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
      className={`group cursor-grab active:cursor-grabbing rounded-md border-l-4 border-l-success bg-card border p-3 shadow-sm hover:shadow-md transition-all ${
        dragging ? "ring-2 ring-success" : ""
      } ${isFinal ? "opacity-90" : ""}`}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); navigate(`/deals-manutencao/${deal.id}`); } }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-medium text-sm leading-tight flex-1">{deal.titulo}</div>
        {!isFinal && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onEncerrar(deal); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
            title="Encerrar deal">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-success/10 text-success border-success/30 font-bold">
          MANUTENÇÃO
        </Badge>
        {deal.garantia_origem_id && (
          <Badge variant="outline" className="text-[9px] py-0 px-1.5">via garantia</Badge>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground truncate">{deal.unidades_saude?.nome}</div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{formatCurrency(deal.valor_total)}</span>
        {isFinal ? (
          <Badge variant="outline" className={deal.resultado === "ganho"
            ? "bg-success/15 text-success border-success/40"
            : "bg-destructive/15 text-destructive border-destructive/40"}>
            {deal.resultado === "ganho" ? "GANHO" : "PERDIDO"}
          </Badge>
        ) : (
          <Badge variant="outline" className={`text-[10px] gap-1 font-mono tabular-nums ${colorClass}`}>
            <Clock className="h-3 w-3" /> {formatElapsed(deal.data_entrada_estagio, now)}
          </Badge>
        )}
      </div>
      {deal.profiles?.nome && (
        <div className="mt-1 text-[10px] text-muted-foreground truncate">👤 {deal.profiles.nome}</div>
      )}
    </div>
  );
}

// ============= Tabela =============
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
                  onClick={() => navigate(`/deals-manutencao/${d.id}`)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30">MANUT</Badge>
                      {d.titulo}
                    </div>
                  </TableCell>
                  <TableCell>
                    {d.unidades_saude?.nome}
                    <div className="text-xs text-muted-foreground">{d.unidades_saude?.cidade}{d.unidades_saude?.estado ? `-${d.unidades_saude.estado}` : ""}</div>
                  </TableCell>
                  <TableCell>{d.profiles?.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{STAGE_LABELS[d.estagio as DealStage]}</Badge></TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(d.valor_total)}</TableCell>
                  <TableCell>
                    {isFinal ? <span className="text-xs text-muted-foreground">—</span> : (
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
                    ) : <Badge variant="outline">Em andamento</Badge>}
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

// ============= Modal Novo Deal Manutenção =============
export function NewDealManutDialog({ linhas, vendedores, defaultLinhaId, defaultUnidadeId, garantiaId, onSaved }: {
  linhas: any[]; vendedores: any[]; defaultLinhaId: string;
  defaultUnidadeId?: string; garantiaId?: string;
  onSaved: (id: string) => void;
}) {
  const { user, isAdminOrGerente } = useAuth();
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeSearch, setUnidadeSearch] = useState("");
  const [garantiaInfo, setGarantiaInfo] = useState<any>(null);
  const [form, setForm] = useState({
    titulo: "", unidade_id: defaultUnidadeId ?? "",
    linha_id: defaultLinhaId, valor_total: "", data_previsao_fechamento: "",
    vendedor_id: user?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [openNovaUnidade, setOpenNovaUnidade] = useState(false);

  useEffect(() => {
    supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome")
      .then(({ data }) => setUnidades(data ?? []));
  }, []);
  useEffect(() => { setForm((f) => ({ ...f, linha_id: defaultLinhaId })); }, [defaultLinhaId]);
  useEffect(() => { if (defaultUnidadeId) setForm((f) => ({ ...f, unidade_id: defaultUnidadeId })); }, [defaultUnidadeId]);

  // Pré-carregar dados da garantia de origem
  useEffect(() => {
    if (!garantiaId) return;
    supabase.from("garantias").select("*, unidades_saude(nome), linhas_produto(nome)")
      .eq("id", garantiaId).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setGarantiaInfo(data);
        setForm((f) => ({
          ...f,
          unidade_id: data.unidade_id,
          linha_id: data.linha_id || f.linha_id,
          titulo: f.titulo || `Manutenção: ${data.descricao_equipamento}`,
        }));
      });
  }, [garantiaId]);

  const unidadesFiltradas = useMemo(() => {
    const q = unidadeSearch.toLowerCase();
    return q ? unidades.filter((u) => u.nome.toLowerCase().includes(q)) : unidades;
  }, [unidades, unidadeSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("deals_manutencao").insert({
      titulo: form.titulo,
      unidade_id: form.unidade_id,
      linha_id: form.linha_id,
      vendedor_id: form.vendedor_id || user.id,
      valor_total: form.valor_total ? Number(form.valor_total) : 0,
      data_previsao_fechamento: form.data_previsao_fechamento || null,
      garantia_origem_id: garantiaId || null,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal de manutenção criado");
    onSaved(data.id);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-success" /> Novo deal de manutenção
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        {garantiaInfo && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs space-y-1">
            <div className="font-semibold text-warning">Originado de garantia</div>
            <div><span className="text-muted-foreground">Equipamento:</span> {garantiaInfo.descricao_equipamento}</div>
            <div><span className="text-muted-foreground">Unidade:</span> {garantiaInfo.unidades_saude?.nome}</div>
            <div><span className="text-muted-foreground">Vence em:</span> {new Date(garantiaInfo.data_fim).toLocaleDateString("pt-BR")}</div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Nome do deal *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Contrato manutenção Hospital ABC" />
        </div>
        <div className="space-y-2">
          <Label>Unidade de saúde *</Label>
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
            <Label>Previsão de fechamento</Label>
            <Input type="date" value={form.data_previsao_fechamento}
              onChange={(e) => setForm({ ...form, data_previsao_fechamento: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Vendedor *</Label>
            {isAdminOrGerente ? (
              <Select value={form.vendedor_id} onValueChange={(v) => setForm({ ...form, vendedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input disabled value={vendedores.find((v) => v.id === user?.id)?.nome ?? "Você"} />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.titulo || !form.unidade_id || !form.linha_id || !form.vendedor_id}>
            {saving ? "Salvando..." : "Criar deal"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ============= Modal Finalizar =============
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
      <DialogHeader><DialogTitle>Encerrar deal de manutenção</DialogTitle></DialogHeader>
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
