import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckSquare, AlertCircle, Calendar, Plus, Search, Briefcase, UserRound, Building2,
  Sparkles, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import {
  TAREFA_PRIORIDADE_LABELS, TAREFA_PRIORIDADE_BADGE,
  TAREFA_STATUS_LABELS, TAREFA_STATUS_BADGE, TarefaPrioridade, TarefaStatus,
} from "@/lib/crm";
import { ExportButton, exportToExcel } from "@/lib/export";
import { EditarTarefaDialog } from "@/components/EditarTarefaDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { format, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sortTarefas } from "@/lib/tarefas";

type VinculoFiltro = "todos" | "deal" | "medico" | "unidade" | "discovery" | "stakeholder" | "livre";
type StatusFiltro = "abertas" | "concluidas" | "atrasadas" | "todas";
type DataFiltro = "todas" | "hoje" | "semana" | "mes" | "custom";
type PrioFiltro = "todas" | TarefaPrioridade;

export default function Tarefas() {
  const { user, isAdminOrGerente } = useAuth();
  const { can } = usePermissions();
  const canViewAll = isAdminOrGerente || can("view_all_records");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFiltro>("abertas");
  const [vinculoFilter, setVinculoFilter] = useState<VinculoFiltro>("todos");
  const [prioFilter, setPrioFilter] = useState<PrioFiltro>("todas");
  const [dataFilter, setDataFilter] = useState<DataFiltro>("todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState<string>("eu");
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    if (!user) return;
    void initialize();
    // eslint-disable-next-line
  }, [user, canViewAll]);

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line
  }, [user, statusFilter, vendedorFilter, canViewAll]);

  async function initialize() {
    // Marca atrasadas ao abrir a página
    await supabase.rpc("marcar_tarefas_atrasadas");
    if (canViewAll) {
      const { data } = await supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome");
      setVendedores(data ?? []);
    }
    void load();
  }

  async function load() {
    setLoading(true);
    let q = supabase.from("tarefas")
      .select(`
        *,
        deals(id, titulo, unidades_saude(nome)),
        unidades_saude(id, nome, status),
        medicos(id, nome),
        discovery(id, nome),
        stakeholders(id, nome),
        responsavel:profiles!tarefas_responsavel_profile_fkey(id, nome)
      `)
      .is("archived_at", null)
      .order("data_vencimento", { ascending: true, nullsFirst: false });

    if (!canViewAll) {
      q = q.eq("responsavel_id", user!.id);
    } else if (vendedorFilter !== "todos") {
      q = q.eq("responsavel_id", vendedorFilter === "eu" ? user!.id : vendedorFilter);
    }

    if (statusFilter === "abertas") q = q.in("status", ["pendente", "em_andamento", "atrasada"]);
    else if (statusFilter === "concluidas") q = q.eq("status", "concluida");
    else if (statusFilter === "atrasadas") q = q.eq("status", "atrasada");

    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  // Filtros client-side
  const filtered = useMemo(() => {
    return items.filter((t) => {
      // Vínculo
      if (vinculoFilter !== "todos") {
        if (vinculoFilter === "deal" && !t.deal_id) return false;
        if (vinculoFilter === "medico" && !t.medico_id) return false;
        if (vinculoFilter === "unidade" && !t.unidade_id) return false;
        if (vinculoFilter === "discovery" && !t.discovery_id) return false;
        if (vinculoFilter === "stakeholder" && !t.stakeholder_id) return false;
        if (vinculoFilter === "livre" && (t.deal_id || t.medico_id || t.unidade_id || t.discovery_id || t.stakeholder_id)) return false;
      }
      // Prioridade
      if (prioFilter !== "todas" && t.prioridade !== prioFilter) return false;
      // Busca
      if (search) {
        const q = search.toLowerCase();
        const blob = `${t.titulo ?? ""} ${t.descricao ?? ""} ${t.deals?.titulo ?? ""} ${t.unidades_saude?.nome ?? ""} ${t.medicos?.nome ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      // Data
      if (dataFilter !== "todas" && t.data_vencimento) {
        const d = new Date(t.data_vencimento);
        if (dataFilter === "hoje" && !isToday(d)) return false;
        if (dataFilter === "semana" && !isThisWeek(d, { weekStartsOn: 1 })) return false;
        if (dataFilter === "mes" && !isThisMonth(d)) return false;
        if (dataFilter === "custom") {
          if (dataDe && d < startOfDay(new Date(dataDe))) return false;
          if (dataAte && d > endOfDay(new Date(dataAte))) return false;
        }
      } else if (dataFilter !== "todas" && dataFilter !== "custom" && !t.data_vencimento) {
        return false;
      }
      return true;
    });
  }, [items, vinculoFilter, prioFilter, search, dataFilter, dataDe, dataAte]);

  // Agrupamento por seção
  const sections = useMemo(() => {
    const deals: any[] = [];
    const relacionamento: any[] = [];
    const discovery: any[] = [];
    const livres: any[] = [];
    for (const t of filtered) {
      if (t.deal_id) { deals.push(t); continue; }
      if (t.discovery_id) { discovery.push(t); continue; }
      if (t.unidade_id || t.medico_id) { relacionamento.push(t); continue; }
      livres.push(t);
    }
    return { deals, relacionamento, discovery, livres };
  }, [filtered]);

  // View: agrupamento por vendedor com atraso (gerente).
  // Usa a MESMA regra do contador "Atrasadas" (status === 'atrasada' OU data vencida e não hoje)
  // e agrupa por responsavel_id mesmo quando o join de profiles falha.
  const atrasadasPorVendedor = useMemo(() => {
    if (!canViewAll) return null;
    const now = new Date();
    const map = new Map<string, { vendedor: { id: string; nome: string }; tarefas: any[] }>();
    for (const t of items) {
      if (t.status === "concluida") continue;
      const d = t.data_vencimento ? new Date(t.data_vencimento) : null;
      const atrasada = t.status === "atrasada" || (d && d < now && !isToday(d));
      if (!atrasada) continue;
      const id = t.responsavel?.id ?? t.responsavel_id ?? "sem-responsavel";
      const nome = t.responsavel?.nome ?? "Sem responsável";
      if (!map.has(id)) map.set(id, { vendedor: { id, nome }, tarefas: [] });
      map.get(id)!.tarefas.push(t);
    }
    return Array.from(map.values()).sort((a, b) => b.tarefas.length - a.tarefas.length);
  }, [items, canViewAll]);

  // Reabrir tarefa (sem comentário). Concluir é feito via ConcluirTarefaDialog.
  async function reabrirTarefa(t: any) {
    const { error } = await supabase.from("tarefas").update({
      status: "pendente",
      concluida_em: null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa reaberta");
    void load();
  }

  // Contadores rápidos
  const counts = useMemo(() => {
    const total = filtered.length;
    let atrasadas = 0, hoje = 0, semana = 0, futuras = 0, concluidas = 0;
    const now = new Date();
    for (const t of filtered) {
      if (t.status === "concluida") { concluidas++; continue; }
      const d = t.data_vencimento ? new Date(t.data_vencimento) : null;
      if (t.status === "atrasada" || (d && d < now && !isToday(d))) atrasadas++;
      else if (d && isToday(d)) hoje++;
      else if (d && isThisWeek(d, { weekStartsOn: 1 })) semana++;
      else futuras++;
    }
    return { total, atrasadas, hoje, semana, futuras, concluidas };
  }, [filtered]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
            {canViewAll && vendedorFilter === "todos" && " · visão da equipe"}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton onExport={() => exportToExcel(filtered.map((t: any) => ({
            Titulo: t.titulo, Descricao: t.descricao,
            Prioridade: TAREFA_PRIORIDADE_LABELS[t.prioridade as TarefaPrioridade],
            Status: TAREFA_STATUS_LABELS[t.status as TarefaStatus],
            Vencimento: t.data_vencimento, Responsavel: t.responsavel?.nome,
            Vinculo: t.deals?.titulo || t.medicos?.nome || t.unidades_saude?.nome || "—",
          })), "tarefas", "Tarefas")} />
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova tarefa</Button>
            </DialogTrigger>
            <NovaTarefaDialog onSaved={() => { setOpenNew(false); void load(); }} />
          </Dialog>
        </div>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar tarefa..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFiltro)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="abertas">Abertas</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
                <SelectItem value="concluidas">Concluídas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vinculoFilter} onValueChange={(v) => setVinculoFilter(v as VinculoFiltro)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos vínculos</SelectItem>
                <SelectItem value="deal">Deal</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="unidade">Unidade</SelectItem>
                {isAdminOrGerente && <SelectItem value="stakeholder">Stakeholder</SelectItem>}
                <SelectItem value="livre">Livre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioFilter} onValueChange={(v) => setPrioFilter(v as PrioFiltro)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas prioridades</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dataFilter} onValueChange={(v) => setDataFilter(v as DataFiltro)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Qualquer data</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="custom">Período…</SelectItem>
              </SelectContent>
            </Select>
            {canViewAll && (
              <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eu">Minhas tarefas</SelectItem>
                  <SelectItem value="todos">Toda equipe</SelectItem>
                  {vendedores.filter((v) => v.id !== user?.id).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {dataFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs">De</Label>
              <Input type="date" className="w-40" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
              <Label className="text-xs">Até</Label>
              <Input type="date" className="w-40" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* GERENTE: vendedores com atraso */}
      {canViewAll && vendedorFilter === "todos" && atrasadasPorVendedor && atrasadasPorVendedor.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> Vendedores com tarefas atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {atrasadasPorVendedor.map((g) => (
                <button
                  key={g.vendedor.id}
                  onClick={() => setVendedorFilter(g.vendedor.id)}
                  className="text-left rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="font-medium">{g.vendedor.nome}</div>
                  <div className="text-xs text-destructive">{g.tarefas.length} atrasada(s)</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contadores rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <CounterPill label="Total" value={counts.total} className="bg-muted/60 text-foreground" />
        <CounterPill label="Atrasadas" value={counts.atrasadas} className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" />
        <CounterPill label="Hoje" value={counts.hoje} className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" />
        <CounterPill label="Esta semana" value={counts.semana} className="bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200" />
        <CounterPill label="Futuras" value={counts.futuras} className="bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200" />
        <CounterPill label="Concluídas" value={counts.concluidas} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhuma tarefa encontrada.</CardContent></Card>
      ) : (
        <CompactList tarefas={filtered} onReabrir={reabrirTarefa} onChanged={load} />
      )}
    </div>
  );
}

// ============= Contador =============
function CounterPill({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${className ?? ""}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-xl font-bold leading-tight">{value}</div>
    </div>
  );
}

// ============= Tipo (cor pastel) =============
type TipoKey = "deal" | "discovery" | "unidade" | "medico" | "stakeholder" | "livre";
const TIPO_META: Record<TipoKey, { label: string; cls: string }> = {
  deal:        { label: "Deal",        cls: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900" },
  discovery:   { label: "Discovery",   cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900" },
  unidade:     { label: "Unidade",     cls: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900" },
  medico:      { label: "Médico",      cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900" },
  stakeholder: { label: "Stakeholder", cls: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900" },
  livre:       { label: "Livre",       cls: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-900/40 dark:text-stone-300 dark:border-stone-800" },
};
function tipoOf(t: any): TipoKey {
  if (t.deal_id) return "deal";
  if (t.discovery_id) return "discovery";
  if (t.stakeholder_id) return "stakeholder";
  if (t.unidade_id) return "unidade";
  if (t.medico_id) return "medico";
  return "livre";
}

// ============= Lista compacta (tabela) =============
function CompactList({ tarefas, onReabrir, onChanged }: { tarefas: any[]; onReabrir: (t: any) => void; onChanged: () => void }) {
  const ordenadas = useMemo(() => sortTarefas(tarefas), [tarefas]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="w-24 px-2 py-2 text-left">Tipo</th>
              <th className="px-2 py-2 text-left">Tarefa</th>
              <th className="w-44 px-2 py-2 text-left">Vínculo</th>
              <th className="w-36 px-2 py-2 text-left">Vencimento</th>
              <th className="w-20 px-2 py-2 text-left">Prio.</th>
              <th className="w-32 px-2 py-2 text-left">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((t) => (
              <CompactRow key={t.id} t={t} onReabrir={onReabrir} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompactRow({ t, onReabrir, onChanged }: { t: any; onReabrir: (t: any) => void; onChanged: () => void }) {
  const [openEdit, setOpenEdit] = useState(false);
  const [openConcluir, setOpenConcluir] = useState(false);
  const concluida = t.status === "concluida";
  const overdue = t.status === "atrasada" || (!concluida && t.data_vencimento && new Date(t.data_vencimento) < new Date() && !isToday(new Date(t.data_vencimento)));
  const today = !concluida && t.data_vencimento && isToday(new Date(t.data_vencimento));
  const tipo = tipoOf(t);
  const meta = TIPO_META[tipo];

  const link = t.deal_id ? `/deals/${t.deal_id}`
    : t.discovery_id ? `/discovery/${t.discovery_id}`
    : t.stakeholder_id ? `/stakeholders/${t.stakeholder_id}`
    : t.unidade_id ? `/unidades/${t.unidade_id}`
    : t.medico_id ? `/medicos/${t.medico_id}` : null;
  const linkLabel = t.deals?.titulo
    || t.discovery?.nome
    || t.stakeholders?.nome
    || (t.medicos?.nome && `Dr. ${t.medicos.nome}`)
    || t.unidades_saude?.nome || "—";

  function handleCheckbox() {
    if (concluida) {
      onReabrir(t);
    } else {
      setOpenConcluir(true);
    }
  }

  return (
    <>
      <tr
        className={`border-t hover:bg-accent/30 transition-colors ${
          overdue ? "bg-destructive/5" : today ? "bg-warning/5" : ""
        } ${concluida ? "opacity-60" : ""}`}
      >
        <td className="px-2 py-1.5 align-middle">
          <Checkbox checked={concluida} onCheckedChange={handleCheckbox} className="h-4 w-4" />
        </td>
        <td className="px-2 py-1.5 align-middle">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
            {meta.label}
          </span>
        </td>
        <td className="px-2 py-1.5 align-middle cursor-pointer" onClick={() => setOpenEdit(true)}>
          <div className={`font-medium truncate ${concluida ? "line-through" : ""}`}>
            {t.stakeholders?.nome && <span className="text-muted-foreground font-normal">{t.stakeholders.nome} · </span>}
            {t.titulo}
          </div>
        </td>
        <td className="px-2 py-1.5 align-middle">
          {link ? (
            <Link to={link} className="text-primary hover:underline truncate block max-w-[180px]">{linkLabel}</Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-2 py-1.5 align-middle whitespace-nowrap">
          {t.data_vencimento ? (
            <span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : today ? "text-warning font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(t.data_vencimento), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>
        <td className="px-2 py-1.5 align-middle">
          <Badge variant="outline" className={`${TAREFA_PRIORIDADE_BADGE[t.prioridade as TarefaPrioridade]} text-[10px] px-1.5 py-0`}>
            {TAREFA_PRIORIDADE_LABELS[t.prioridade as TarefaPrioridade]}
          </Badge>
        </td>
        <td className="px-2 py-1.5 align-middle text-xs text-muted-foreground truncate max-w-[140px]">
          {t.responsavel?.nome ?? "—"}
        </td>
      </tr>
      <EditarTarefaDialog
        tarefa={t}
        open={openEdit}
        onOpenChange={setOpenEdit}
        onSaved={() => { setOpenEdit(false); onChanged(); }}
      />
      <ConcluirTarefaDialog
        open={openConcluir}
        onOpenChange={setOpenConcluir}
        tarefa={t}
        onConcluida={() => { setOpenConcluir(false); onChanged(); }}
      />
    </>
  );
}

// ============= Diálogo de conclusão (exige comentário) =============
function ConcluirTarefaDialog({
  open, onOpenChange, tarefa, onConcluida,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarefa: any;
  onConcluida: () => void;
}) {
  const { user } = useAuth();
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setComentario(""); }, [open]);

  async function handleConcluir() {
    const txt = comentario.trim();
    if (txt.length < 3) { toast.error("Escreva um comentário descrevendo a conclusão."); return; }
    if (!user) return;
    setSaving(true);

    let anotacaoId: string | null = null;
    const temVinculo = tarefa.deal_id || tarefa.unidade_id || tarefa.medico_id;

    if (temVinculo) {
      const { data: anot, error: errAnot } = await supabase.from("anotacoes").insert({
        autor_id: user.id,
        texto: `[Conclusão tarefa: ${tarefa.titulo}]\n${txt}`,
        deal_id: tarefa.deal_id ?? null,
        unidade_id: tarefa.unidade_id ?? null,
        medico_id: tarefa.medico_id ?? null,
      }).select("id").single();
      if (errAnot) { toast.error(errAnot.message); setSaving(false); return; }
      anotacaoId = anot.id;
    }

    const updates: any = {
      status: "concluida",
      concluida_em: new Date().toISOString(),
    };
    if (anotacaoId) updates.anotacao_id = anotacaoId;
    if (!temVinculo) {
      // tarefa livre: armazena comentário na descrição
      updates.descricao = `${tarefa.descricao ? tarefa.descricao + "\n\n" : ""}✓ Concluída: ${txt}`;
    }

    const { error } = await supabase.from("tarefas").update(updates).eq("id", tarefa.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa concluída");
    onConcluida();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{tarefa.titulo}</div>
            {tarefa.descricao && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{tarefa.descricao}</div>}
          </div>
          <div>
            <Label>Comentário de conclusão *</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que foi feito? Qual o resultado? Próximos passos?"
              rows={5}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {tarefa.deal_id || tarefa.unidade_id || tarefa.medico_id
                ? "Será salvo na timeline do vínculo."
                : "Será salvo na descrição da tarefa."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConcluir} disabled={saving || comentario.trim().length < 3}>
            {saving ? "Salvando..." : "Concluir tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Seção (legacy, mantida caso usada) =============
function Secao({ titulo, icon, tarefas, onToggle, onChanged, emptyText, highlight }: {
  titulo: string;
  icon: React.ReactNode;
  tarefas: any[];
  onToggle: (t: any) => void;
  onChanged: () => void;
  emptyText: string;
  highlight?: boolean;
}) {
  const ordenadas = useMemo(() => sortTarefas(tarefas), [tarefas]);

  return (
    <Card className={highlight ? "border-l-4 border-l-primary bg-primary/[0.02]" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon} {titulo}
          <Badge variant="secondary" className="ml-1">{tarefas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ordenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        ) : (
          ordenadas.map((t) => <TarefaItem key={t.id} t={t} onToggle={onToggle} onChanged={onChanged} />)
        )}
      </CardContent>
    </Card>
  );
}

// ============= Item de Tarefa =============
function TarefaItem({ t, onToggle, onChanged }: { t: any; onToggle: (t: any) => void; onChanged: () => void }) {
  const [openEdit, setOpenEdit] = useState(false);
  const concluida = t.status === "concluida";
  const overdue = t.status === "atrasada";
  const today = t.data_vencimento && isToday(new Date(t.data_vencimento));

  const link = t.deal_id ? `/deals/${t.deal_id}`
    : t.unidade_id ? `/unidades/${t.unidade_id}`
    : t.medico_id ? `/medicos/${t.medico_id}`
    : null;
  const linkLabel = t.deals?.titulo
    || (t.medicos?.nome && `Dr. ${t.medicos.nome}`)
    || t.unidades_saude?.nome
    || null;

  return (
    <>
      <div
        className={`group flex items-start gap-3 rounded-md border p-3 transition-colors ${
          overdue ? "border-destructive/40 bg-destructive/5"
            : today ? "border-warning/40 bg-warning/5"
            : "bg-card hover:bg-accent/30"
        }`}
      >
        <Checkbox
          checked={concluida}
          onCheckedChange={() => onToggle(t)}
          className="mt-0.5 h-5 w-5"
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenEdit(true)}>
          <div className={`font-medium text-sm ${concluida ? "line-through text-muted-foreground" : ""}`}>
            {t.titulo}
          </div>
          {t.descricao && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline" className={TAREFA_PRIORIDADE_BADGE[t.prioridade as TarefaPrioridade]}>
              {TAREFA_PRIORIDADE_LABELS[t.prioridade as TarefaPrioridade]}
            </Badge>
            {today && !concluida && (
              <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40">HOJE</Badge>
            )}
            {overdue && (
              <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40">ATRASADA</Badge>
            )}
            {t.data_vencimento && (
              <span className={`flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                <Calendar className="h-3 w-3" />
                {format(new Date(t.data_vencimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            )}
            {link && linkLabel && (
              <Link to={link} onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline truncate max-w-[260px]">
                → {linkLabel}
              </Link>
            )}
            {t.responsavel?.nome && (
              <span className="text-muted-foreground">· 👤 {t.responsavel.nome}</span>
            )}
          </div>
        </div>
      </div>
      <EditarTarefaDialog
        tarefa={t}
        open={openEdit}
        onOpenChange={setOpenEdit}
        onSaved={() => { setOpenEdit(false); onChanged(); }}
      />
    </>
  );
}

// ============= Modal Nova Tarefa =============
function NovaTarefaDialog({ onSaved }: { onSaved: () => void }) {
  const { user, isAdminOrGerente } = useAuth();
  const [form, setForm] = useState({
    titulo: "", descricao: "", data: "", prioridade: "media" as TarefaPrioridade,
    vinculo: "livre" as VinculoFiltro, entidadeId: "",
    responsavelId: user?.id ?? "",
    tipoAgendamento: "comum" as "comum" | "call" | "visita",
  });
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [searchEnt, setSearchEnt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdminOrGerente) return;
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setResponsaveis(data ?? []));
  }, [isAdminOrGerente]);

  useEffect(() => {
    void carregarOpcoes(form.vinculo);
    setForm((f) => ({ ...f, entidadeId: "" }));
    setSearchEnt("");
    // eslint-disable-next-line
  }, [form.vinculo]);


  async function carregarOpcoes(v: VinculoFiltro) {
    if (v === "deal") {
      const { data } = await supabase.from("deals").select("id, titulo").is("archived_at", null).order("created_at", { ascending: false });
      setOpcoes(data ?? []);
    } else if (v === "medico") {
      const { data } = await supabase.from("medicos").select("id, nome").is("archived_at", null).order("nome");
      setOpcoes((data ?? []).map((m) => ({ id: m.id, titulo: `Dr. ${m.nome}` })));
    } else if (v === "unidade") {
      const { data } = await supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome");
      setOpcoes((data ?? []).map((u) => ({ id: u.id, titulo: u.nome })));
    } else if (v === "stakeholder") {
      const { data } = await supabase.from("stakeholders").select("id, nome, organizacao").is("archived_at", null).order("nome");
      setOpcoes((data ?? []).map((s: any) => ({ id: s.id, titulo: s.organizacao ? `${s.nome} — ${s.organizacao}` : s.nome })));
    } else {
      setOpcoes([]);
    }
  }

  const opcoesFiltradas = useMemo(() => {
    const q = searchEnt.toLowerCase();
    return q ? opcoes.filter((o) => o.titulo.toLowerCase().includes(q)) : opcoes;
  }, [opcoes, searchEnt]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.vinculo !== "livre" && !form.entidadeId) {
      toast.error("Selecione a entidade vinculada"); return;
    }
    setSaving(true);
    const payload: any = {
      titulo: form.titulo,
      descricao: form.descricao || null,
      responsavel_id: (isAdminOrGerente && form.responsavelId) ? form.responsavelId : user.id,
      criador_id: user.id,
      prioridade: form.prioridade,
      data_vencimento: form.data || null,
      tipo_agendamento: form.tipoAgendamento === "comum" ? null : form.tipoAgendamento,
    };

    if (form.vinculo === "deal") payload.deal_id = form.entidadeId;
    if (form.vinculo === "medico") payload.medico_id = form.entidadeId;
    if (form.vinculo === "unidade") payload.unidade_id = form.entidadeId;
    if (form.vinculo === "stakeholder") payload.stakeholder_id = form.entidadeId;

    const { error } = await supabase.from("tarefas").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa criada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Ligar para confirmar reunião" />
        </div>
        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
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
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.tipoAgendamento} onValueChange={(v) => setForm({ ...form, tipoAgendamento: v as "comum" | "call" | "visita" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comum">Tarefa comum</SelectItem>
              <SelectItem value="call">📞 Agendamento de Call</SelectItem>
              <SelectItem value="visita">🏥 Agendamento de Visita</SelectItem>
            </SelectContent>
          </Select>
          {form.tipoAgendamento !== "comum" && (
            <p className="text-[11px] text-muted-foreground">Conta para a sua meta diária de agendamentos.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Vínculo</Label>
          <Select value={form.vinculo} onValueChange={(v) => setForm({ ...form, vinculo: v as VinculoFiltro })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="livre">Livre (sem vínculo)</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="medico">Médico</SelectItem>
              <SelectItem value="unidade">Unidade</SelectItem>
              {isAdminOrGerente && <SelectItem value="stakeholder">Stakeholder</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        {form.vinculo !== "livre" && (
          <div className="space-y-2">
            <Label>Selecione *</Label>
            <Input placeholder="Buscar..." value={searchEnt} onChange={(e) => setSearchEnt(e.target.value)} />
            <Select value={form.entidadeId} onValueChange={(v) => setForm({ ...form, entidadeId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {opcoesFiltradas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isAdminOrGerente && (
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={form.responsavelId} onValueChange={(v) => setForm({ ...form, responsavelId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="max-h-64">
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.id === user?.id ? `${r.nome} (eu)` : r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.titulo}>
            {saving ? "Salvando..." : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// EditarTarefaDialog foi extraído para src/components/EditarTarefaDialog.tsx
