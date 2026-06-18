import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { Plus, Search as SearchIcon, Sparkles, ExternalLink, FlaskConical, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FavoritoStar } from "@/components/FavoritoStar";
import {
  DISCOVERY_STATUS_LABELS, DISCOVERY_STATUS_BADGE, DiscoveryStatus,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ImportarPlanilhaDialog from "@/components/ImportarPlanilhaDialog";
import { LoadMoreBar, PAGE_SIZE } from "@/components/LoadMoreBar";
import { Plus as PlusIcon, Pencil, Trash2, FolderOpen, Folder } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Lookup = { id: string; nome: string; sigla?: string };
type Vendedor = { id: string; nome: string };
type Pasta = { id: string; nome: string; cor: string | null; ordem: number };

export default function Discovery() {
  const { user, roles } = useAuth();
  const isAdminGerente = roles.includes("admin") || roles.includes("gerente");

  const [items, setItems] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [tipos, setTipos] = useState<Lookup[]>([]);
  const [estados, setEstados] = useState<Lookup[]>([]);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("em_pesquisa");
  const [vendedorFilter, setVendedorFilter] = useState<string>(
    isAdminGerente ? "todos" : "eu"
  );
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  // pastaFilter: "all" (todas) | "none" (sem pasta) | <pasta_id>
  const [pastaFilter, setPastaFilter] = useState<string>("all");

  // grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // diálogos pasta
  const [pastaDialogOpen, setPastaDialogOpen] = useState(false);
  const [pastaEditando, setPastaEditando] = useState<Pasta | null>(null);
  const [pastaParaExcluir, setPastaParaExcluir] = useState<Pasta | null>(null);

  // novo discovery (modal simples)
  const [novoOpen, setNovoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { void load(page); /* eslint-disable-next-line */ }, [statusFilter, vendedorFilter, page]);

  async function load(pg = 1) {
    if (!user) return;
    setLoading(true);

    let q = supabase.from("discovery").select(`
      id, nome, cidade, status, created_at, vendedor_id, pasta_id, origem, origem_etiqueta,
      tipos_unidade(id, nome),
      estados(id, sigla),
      unidade_gerada_id
    `, { count: "exact" }).is("archived_at", null).order("created_at", { ascending: false }).range(0, pg * PAGE_SIZE - 1);

    // "Todos" mostra só os ativos — "Não interessado" fica segregado num filtro próprio (LGPD)
    if (statusFilter === "all") q = q.neq("status", "nao_interessado" as any);
    else q = q.eq("status", statusFilter as any);

    if (vendedorFilter === "eu") q = q.eq("vendedor_id", user.id);
    else if (vendedorFilter !== "todos") q = q.eq("vendedor_id", vendedorFilter);

    const [d, v, t, e, p] = await Promise.all([
      q,
      supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
      (supabase as any).from("discovery_pastas").select("id, nome, cor, ordem")
        .is("archived_at", null).order("ordem").order("nome"),
    ]);

    if (d.error) toast.error(d.error.message);
    setItems(d.data ?? []);
    setTotal(d.count ?? 0);
    setVendedores((v.data ?? []) as Vendedor[]);
    setTipos((t.data ?? []) as Lookup[]);
    setEstados((e.data ?? []) as Lookup[]);
    setPastas((p?.data ?? []) as Pasta[]);
    setLoading(false);
  }

  const filtered = useMemo(() => items.filter((it) => {
    if (search) {
      const q = search.toLowerCase();
      if (!it.nome.toLowerCase().includes(q) && !(it.cidade ?? "").toLowerCase().includes(q)) return false;
    }
    if (estadoFilter !== "all" && it.estados?.sigla !== estadoFilter) return false;
    if (tipoFilter !== "all" && it.tipos_unidade?.id !== tipoFilter) return false;
    if (pastaFilter === "none" && it.pasta_id) return false;
    if (pastaFilter !== "all" && pastaFilter !== "none" && it.pasta_id !== pastaFilter) return false;
    return true;
  }), [items, search, estadoFilter, tipoFilter, pastaFilter]);

  const grupos = useMemo(() => {
    const map = new Map<string, { cidade: string; uf: string; key: string; items: any[] }>();
    filtered.forEach((it) => {
      const cidade = (it.cidade ?? "").trim();
      const uf = it.estados?.sigla ?? "";
      const key = cidade ? `${cidade}__${uf}` : "__none__";
      if (!map.has(key)) map.set(key, { cidade, uf, key, items: [] });
      map.get(key)!.items.push(it);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (!a.cidade && b.cidade) return 1;
      if (a.cidade && !b.cidade) return -1;
      const c = a.cidade.localeCompare(b.cidade, "pt-BR");
      if (c !== 0) return c;
      return a.uf.localeCompare(b.uf);
    });
    return arr;
  }, [filtered]);

  const countByPasta = useMemo(() => {
    const all = items.length;
    const none = items.filter((it) => !it.pasta_id).length;
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (it.pasta_id) map.set(it.pasta_id, (map.get(it.pasta_id) ?? 0) + 1);
    });
    return { all, none, map };
  }, [items]);

  async function salvarPasta(nome: string, cor: string | null) {
    if (!nome.trim()) return;
    if (pastaEditando) {
      const { error } = await (supabase as any).from("discovery_pastas")
        .update({ nome: nome.trim(), cor }).eq("id", pastaEditando.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Pasta atualizada");
    } else {
      const ordem = pastas.length;
      const { error } = await (supabase as any).from("discovery_pastas")
        .insert({ nome: nome.trim(), cor, ordem, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Pasta criada");
    }
    setPastaDialogOpen(false);
    setPastaEditando(null);
    void load();
  }

  async function excluirPasta() {
    if (!pastaParaExcluir) return;
    await supabase.from("discovery").update({ pasta_id: null } as any)
      .eq("pasta_id", pastaParaExcluir.id);
    const { error } = await (supabase as any).from("discovery_pastas")
      .update({ archived_at: new Date().toISOString() }).eq("id", pastaParaExcluir.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pasta excluída");
    if (pastaFilter === pastaParaExcluir.id) setPastaFilter("all");
    setPastaParaExcluir(null);
    void load();
  }

  async function moverItem(itemId: string, pastaId: string | null) {
    const { error } = await supabase.from("discovery")
      .update({ pasta_id: pastaId } as any).eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, pasta_id: pastaId } : it));
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(grupos.map((g) => g.key)));
  const collapseAll = () => setExpandedGroups(new Set());

  const vendedorNome = (id: string) =>
    vendedores.find((v) => v.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SearchIcon className="h-7 w-7 text-primary" />
            Discovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Pré-cadastro · {filtered.length} {filtered.length === 1 ? "item" : "itens"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            size="lg"
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50"
          >
            <Link to="/discovery/lab">
              <FlaskConical className="mr-2 h-5 w-5" />
              <span className="font-bold tracking-wide">LAB</span>
              <span className="ml-2 hidden text-xs font-normal opacity-90 sm:inline">Laboratório de Prospecção</span>
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Importar planilha com IA
          </Button>
          <ImportarPlanilhaDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onImported={() => void load()}
          />
          <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo Discovery</Button>
            </DialogTrigger>
            <NovoDiscoveryDialog onCreated={() => { setNovoOpen(false); void load(); }} />
          </Dialog>
        </div>
      </div>

      {/* Pastas (abas) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-1">
        <PastaTab
          active={pastaFilter === "all"}
          onClick={() => setPastaFilter("all")}
          icon={<FolderOpen className="h-3.5 w-3.5" />}
          label="Todas"
          count={countByPasta.all}
        />
        <PastaTab
          active={pastaFilter === "none"}
          onClick={() => setPastaFilter("none")}
          icon={<Folder className="h-3.5 w-3.5" />}
          label="Sem pasta"
          count={countByPasta.none}
        />
        {pastas.map((p) => (
          <PastaTab
            key={p.id}
            active={pastaFilter === p.id}
            onClick={() => setPastaFilter(p.id)}
            icon={<Folder className="h-3.5 w-3.5" style={{ color: p.cor ?? undefined }} />}
            label={p.nome}
            count={countByPasta.map.get(p.id) ?? 0}
            onEdit={isAdminGerente ? () => { setPastaEditando(p); setPastaDialogOpen(true); } : undefined}
            onDelete={isAdminGerente ? () => setPastaParaExcluir(p) : undefined}
          />
        ))}
        {isAdminGerente && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => { setPastaEditando(null); setPastaDialogOpen(true); }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Nova pasta
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou cidade..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="em_pesquisa">Em Pesquisa</SelectItem>
            <SelectItem value="oficializado">Oficializado</SelectItem>
            <SelectItem value="descartado">Descartado</SelectItem>
            <SelectItem value="nao_interessado">Não interessado</SelectItem>
            <SelectItem value="all">Todos (ativos)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {isAdminGerente && <SelectItem value="todos">Todos os vendedores</SelectItem>}
            <SelectItem value="eu">Meus itens</SelectItem>
            {vendedores.filter((v) => v.id !== user?.id).map((v) =>
              <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos UF</SelectItem>
            {estados.map((uf) => <SelectItem key={uf.id} value={uf.sigla!}>{uf.sigla}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por cidade */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border bg-card/50 py-12 text-center text-muted-foreground">
          Nenhum item de discovery encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ChevronDown className="mr-1 h-4 w-4" /> Expandir todos
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              <ChevronRight className="mr-1 h-4 w-4" /> Recolher todos
            </Button>
          </div>
          {grupos.map((g) => {
            const open = expandedGroups.has(g.key);
            return (
              <Collapsible key={g.key} open={open} onOpenChange={() => toggleGroup(g.key)}>
                <div className="rounded-lg border-2 border-dashed border-border bg-card/50 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2 border-b border-border cursor-pointer hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2">
                        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {g.cidade ? `${g.cidade}${g.uf ? ` - ${g.uf}` : ""}` : "Sem cidade"}
                        </span>
                      </div>
                      <Badge variant="secondary">{g.items.length} {g.items.length === 1 ? "item" : "itens"}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Pasta</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Criado em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((it, i) => (
                          <TableRow key={it.id} className={i % 2 ? "bg-muted/30" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                <FavoritoStar tipo="discovery" itemId={it.id} />
                                <Link to={`/discovery/${it.id}`} className="hover:text-primary inline-flex items-center gap-2">
                                  <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  {it.nome}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell><OrigemBadge origem={it.origem} etiqueta={it.origem_etiqueta} /></TableCell>
                            <TableCell className="text-muted-foreground">
                              {it.tipos_unidade?.nome ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={it.pasta_id ?? "__none__"}
                                onValueChange={(v) => moverItem(it.id, v === "__none__" ? null : v)}
                              >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sem pasta</SelectItem>
                                  {pastas.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {vendedorNome(it.vendedor_id)}
                            </TableCell>
                            <TableCell>
                              <Badge className={DISCOVERY_STATUS_BADGE[it.status as DiscoveryStatus]} variant="outline">
                                {DISCOVERY_STATUS_LABELS[it.status as DiscoveryStatus]}
                              </Badge>
                              {it.status === "oficializado" && it.unidade_gerada_id && (
                                <Link to={`/unidades/${it.unidade_gerada_id}`}
                                  className="ml-2 inline-flex items-center text-xs text-primary hover:underline">
                                  ver unidade <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {format(new Date(it.created_at), "dd MMM yyyy", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
          <LoadMoreBar loaded={items.length} total={total} loading={loading} onLoadMore={() => setPage((p) => p + 1)} />
        </div>
      )}


      {/* Dialog criar/editar pasta */}
      <Dialog open={pastaDialogOpen} onOpenChange={(o) => { setPastaDialogOpen(o); if (!o) setPastaEditando(null); }}>
        <PastaDialog
          pasta={pastaEditando}
          onSave={salvarPasta}
        />
      </Dialog>

      {/* Confirmação excluir pasta */}
      <AlertDialog open={!!pastaParaExcluir} onOpenChange={(o) => { if (!o) setPastaParaExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{pastaParaExcluir?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os Discoveries dessa pasta voltam para "Sem pasta". Os itens não são apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirPasta}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrigemBadge({ origem, etiqueta }: { origem?: string | null; etiqueta?: string | null }) {
  if (origem === "lab") {
    return <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300 gap-1"><FlaskConical className="h-3 w-3" />LAB</Badge>;
  }
  if (origem === "planilha") {
    return (
      <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 gap-1">
        <Sparkles className="h-3 w-3" />
        Planilha{etiqueta ? ` · ${etiqueta}` : ""}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-muted-foreground gap-1"><PlusIcon className="h-3 w-3" />Manual</Badge>;
}

function PastaTab({
  active, onClick, icon, label, count, onEdit, onDelete,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`group inline-flex items-center rounded-md border ${active ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${active ? "text-primary font-medium" : "text-foreground"}`}
      >
        {icon}
        {label}
        <span className="ml-1 text-xs text-muted-foreground">{count}</span>
      </button>
      {(onEdit || onDelete) && (
        <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded hover:bg-muted-foreground/10" title="Renomear">
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-destructive/10" title="Excluir">
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PastaDialog({ pasta, onSave }: { pasta: Pasta | null; onSave: (nome: string, cor: string | null) => void }) {
  const [nome, setNome] = useState(pasta?.nome ?? "");
  const [cor, setCor] = useState(pasta?.cor ?? "");

  useEffect(() => {
    setNome(pasta?.nome ?? "");
    setCor(pasta?.cor ?? "");
  }, [pasta]);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{pasta ? "Editar pasta" : "Nova pasta"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(nome, cor || null); }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Prioridade alta" />
        </div>
        <div className="space-y-2">
          <Label>Cor (opcional)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cor || "#0ea5e9"}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 rounded border border-input bg-background"
            />
            <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#0ea5e9" />
            {cor && <Button type="button" variant="ghost" size="sm" onClick={() => setCor("")}>limpar</Button>}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!nome.trim()}>{pasta ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function NovoDiscoveryDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("discovery").insert({
      nome: nome.trim(),
      vendedor_id: user.id,
      created_by: user.id,
      status: "em_pesquisa",
      origem: "manual",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Discovery criado");
    setNome("");
    onCreated();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Novo Discovery</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required autoFocus value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Hospital Santa Mônica" />
          <p className="text-xs text-muted-foreground">
            Único campo obrigatório. Os demais dados são preenchidos depois.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !nome.trim()}>
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
