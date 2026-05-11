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
import { Plus, Search as SearchIcon, Sparkles, ExternalLink, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DISCOVERY_STATUS_LABELS, DISCOVERY_STATUS_BADGE, DiscoveryStatus,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ImportarPlanilhaDialog from "@/components/ImportarPlanilhaDialog";
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

  // diálogos pasta
  const [pastaDialogOpen, setPastaDialogOpen] = useState(false);
  const [pastaEditando, setPastaEditando] = useState<Pasta | null>(null);
  const [pastaParaExcluir, setPastaParaExcluir] = useState<Pasta | null>(null);

  // novo discovery (modal simples)
  const [novoOpen, setNovoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [statusFilter, vendedorFilter]);

  async function load() {
    if (!user) return;
    setLoading(true);

    let q = supabase.from("discovery").select(`
      id, nome, cidade, status, created_at, vendedor_id,
      tipos_unidade(id, nome),
      estados(id, sigla),
      unidade_gerada_id
    `).is("archived_at", null).order("created_at", { ascending: false });

    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);

    if (vendedorFilter === "eu") q = q.eq("vendedor_id", user.id);
    else if (vendedorFilter !== "todos") q = q.eq("vendedor_id", vendedorFilter);

    const [d, v, t, e] = await Promise.all([
      q,
      supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
    ]);

    if (d.error) toast.error(d.error.message);
    setItems(d.data ?? []);
    setVendedores((v.data ?? []) as Vendedor[]);
    setTipos((t.data ?? []) as Lookup[]);
    setEstados((e.data ?? []) as Lookup[]);
    setLoading(false);
  }

  const filtered = useMemo(() => items.filter((it) => {
    if (search) {
      const q = search.toLowerCase();
      if (!it.nome.toLowerCase().includes(q) && !(it.cidade ?? "").toLowerCase().includes(q)) return false;
    }
    if (estadoFilter !== "all" && it.estados?.sigla !== estadoFilter) return false;
    if (tipoFilter !== "all" && it.tipos_unidade?.id !== tipoFilter) return false;
    return true;
  }), [items, search, estadoFilter, tipoFilter]);

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
            <SelectItem value="all">Todos</SelectItem>
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

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border bg-card/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it, i) => (
                <TableRow key={it.id} className={i % 2 ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium">
                    <Link to={`/discovery/${it.id}`} className="hover:text-primary inline-flex items-center gap-2">
                      <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {it.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[it.cidade, it.estados?.sigla].filter(Boolean).join(" - ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {it.tipos_unidade?.nome ?? "—"}
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
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum item de discovery encontrado.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
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
