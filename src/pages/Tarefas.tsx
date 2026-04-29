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
import { format, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type VinculoFiltro = "todos" | "deal" | "medico" | "unidade" | "livre";
type StatusFiltro = "abertas" | "concluidas" | "atrasadas" | "todas";
type DataFiltro = "todas" | "hoje" | "semana" | "mes" | "custom";
type PrioFiltro = "todas" | TarefaPrioridade;

export default function Tarefas() {
  const { user, isAdminOrGerente } = useAuth();
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
  }, [user]);

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line
  }, [user, statusFilter, vendedorFilter]);

  async function initialize() {
    // Marca atrasadas ao abrir a página
    await supabase.rpc("marcar_tarefas_atrasadas");
    if (isAdminOrGerente) {
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
        unidades_saude(id, nome, ciclo),
        medicos(id, nome),
        responsavel:profiles!tarefas_responsavel_profile_fkey(id, nome)
      `)
      .is("archived_at", null)
      .order("data_vencimento", { ascending: true, nullsFirst: false });

    if (!isAdminOrGerente) {
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
        if (vinculoFilter === "livre" && (t.deal_id || t.medico_id || t.unidade_id)) return false;
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
      if (t.unidade_id && t.unidades_saude?.ciclo === "discovery") { discovery.push(t); continue; }
      if (t.unidade_id || t.medico_id) { relacionamento.push(t); continue; }
      livres.push(t);
    }
    return { deals, relacionamento, discovery, livres };
  }, [filtered]);

  // View: agrupamento por vendedor com atraso (gerente)
  const atrasadasPorVendedor = useMemo(() => {
    if (!isAdminOrGerente) return null;
    const map = new Map<string, { vendedor: any; tarefas: any[] }>();
    for (const t of items) {
      if (t.status !== "atrasada") continue;
      const v = t.responsavel;
      if (!v) continue;
      if (!map.has(v.id)) map.set(v.id, { vendedor: v, tarefas: [] });
      map.get(v.id)!.tarefas.push(t);
    }
    return Array.from(map.values()).sort((a, b) => b.tarefas.length - a.tarefas.length);
  }, [items, isAdminOrGerente]);

  async function toggleConcluir(t: any) {
    const concluindo = t.status !== "concluida";
    const { error } = await supabase.from("tarefas").update({
      status: concluindo ? "concluida" : "pendente",
      concluida_em: concluindo ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
            {isAdminOrGerente && vendedorFilter === "todos" && " · visão da equipe"}
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
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="unidade">Unidade</SelectItem>
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
            {isAdminOrGerente && (
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
      {isAdminOrGerente && vendedorFilter === "todos" && atrasadasPorVendedor && atrasadasPorVendedor.length > 0 && (
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

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {/* Seção 1 — DEALS */}
          <Secao
            titulo="Tarefas de Deals"
            icon={<Briefcase className="h-4 w-4" />}
            highlight
            tarefas={sections.deals}
            onToggle={toggleConcluir}
            onChanged={load}
            emptyText="Nenhuma tarefa de deal por enquanto."
          />

          {/* Seção 2 — RELACIONAMENTO */}
          <Secao
            titulo="Tarefas de Relacionamento"
            icon={<UserRound className="h-4 w-4" />}
            tarefas={sections.relacionamento}
            onToggle={toggleConcluir}
            onChanged={load}
            emptyText="Sem tarefas com médicos ou unidades clientes."
          />

          {/* Seção 3 — DISCOVERY */}
          <Secao
            titulo="Tarefas de Discovery"
            icon={<Sparkles className="h-4 w-4" />}
            tarefas={sections.discovery}
            onToggle={toggleConcluir}
            onChanged={load}
            emptyText="Nenhum discovery pendente."
          />

          {/* Seção 4 — LIVRES */}
          <Secao
            titulo="Tarefas Livres"
            icon={<ListChecks className="h-4 w-4" />}
            tarefas={sections.livres}
            onToggle={toggleConcluir}
            onChanged={load}
            emptyText="Sem tarefas livres."
          />
        </div>
      )}
    </div>
  );
}

// ============= Seção =============
function Secao({ titulo, icon, tarefas, onToggle, onChanged, emptyText, highlight }: {
  titulo: string;
  icon: React.ReactNode;
  tarefas: any[];
  onToggle: (t: any) => void;
  onChanged: () => void;
  emptyText: string;
  highlight?: boolean;
}) {
  // Hierarquia: atrasadas → hoje → futuras → outras (sem data)
  const ordenadas = useMemo(() => {
    const atrasadas: any[] = [];
    const hoje: any[] = [];
    const futuras: any[] = [];
    const semData: any[] = [];
    for (const t of tarefas) {
      if (!t.data_vencimento) { semData.push(t); continue; }
      const d = new Date(t.data_vencimento);
      if (t.status === "atrasada" || (t.status !== "concluida" && d < new Date() && !isToday(d))) {
        atrasadas.push(t);
      } else if (isToday(d)) {
        hoje.push(t);
      } else {
        futuras.push(t);
      }
    }
    const cmp = (a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
    return [...atrasadas.sort(cmp), ...hoje.sort(cmp), ...futuras.sort(cmp), ...semData];
  }, [tarefas]);

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
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <EditarTarefaDialog tarefa={t} onSaved={() => { setOpenEdit(false); onChanged(); }} />
      </Dialog>
    </>
  );
}

// ============= Modal Nova Tarefa =============
function NovaTarefaDialog({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: "", descricao: "", data: "", prioridade: "media" as TarefaPrioridade,
    vinculo: "livre" as VinculoFiltro, entidadeId: "",
  });
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [searchEnt, setSearchEnt] = useState("");
  const [saving, setSaving] = useState(false);

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
      responsavel_id: user.id,
      criador_id: user.id,
      prioridade: form.prioridade,
      data_vencimento: form.data || null,
    };
    if (form.vinculo === "deal") payload.deal_id = form.entidadeId;
    if (form.vinculo === "medico") payload.medico_id = form.entidadeId;
    if (form.vinculo === "unidade") payload.unidade_id = form.entidadeId;

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
          <Label>Vínculo</Label>
          <Select value={form.vinculo} onValueChange={(v) => setForm({ ...form, vinculo: v as VinculoFiltro })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="livre">Livre (sem vínculo)</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="medico">Médico</SelectItem>
              <SelectItem value="unidade">Unidade</SelectItem>
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
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.titulo}>
            {saving ? "Salvando..." : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ============= Modal Editar Tarefa =============
function EditarTarefaDialog({ tarefa, onSaved }: { tarefa: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    titulo: tarefa.titulo ?? "",
    descricao: tarefa.descricao ?? "",
    data: tarefa.data_vencimento ? new Date(tarefa.data_vencimento).toISOString().slice(0, 16) : "",
    prioridade: (tarefa.prioridade ?? "media") as TarefaPrioridade,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("tarefas").update({
      titulo: form.titulo,
      descricao: form.descricao || null,
      data_vencimento: form.data || null,
      prioridade: form.prioridade,
      // Se virou data futura, pode reabrir
      status: tarefa.status === "atrasada" && form.data && new Date(form.data) > new Date()
        ? "pendente" as TarefaStatus : tarefa.status,
    }).eq("id", tarefa.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa atualizada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        {form.descricao && (
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.descricao} readOnly disabled className="resize-none bg-muted/50 cursor-not-allowed" />
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
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
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
