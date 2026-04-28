import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { UNIDADE_CICLO_LABELS, UNIDADE_CICLO_BADGE, UnidadeCiclo } from "@/lib/crm";
import { useAuth } from "@/contexts/AuthContext";
import { ExportButton, exportToExcel } from "@/lib/export";

type Lookup = { id: string; nome: string; sigla?: string };

export default function Unidades() {
  const [items, setItems] = useState<any[]>([]);
  const [tipos, setTipos] = useState<Lookup[]>([]);
  const [estados, setEstados] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCiclo, setFilterCiclo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [showInativos, setShowInativos] = useState(false);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"nome" | "score" | "ciclo">("nome");

  useEffect(() => { void load(); }, [showInativos]);

  async function load() {
    setLoading(true);
    const query = supabase
      .from("unidades_saude")
      .select(`
        id, nome, cidade, ciclo, tipo, archived_at,
        tipos_unidade(id, nome),
        estados(id, sigla),
        medicos:medico_principal_id(id, nome),
        parque_instalado(quantidade, archived_at)
      `)
      .order("nome");
    const { data, error } = showInativos
      ? await query
      : await query.is("archived_at", null);
    if (error) toast.error(error.message);
    setItems(data ?? []);
    const [t, e] = await Promise.all([
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
    ]);
    setTipos((t.data ?? []) as Lookup[]);
    setEstados((e.data ?? []) as Lookup[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const list = items.filter((u) => {
      if (search && !u.nome.toLowerCase().includes(search.toLowerCase()) &&
          !(u.cidade ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCiclo !== "all" && u.ciclo !== filterCiclo) return false;
      if (filterEstado !== "all" && u.estados?.sigla !== filterEstado) return false;
      if (filterTipo !== "all" && u.tipos_unidade?.id !== filterTipo) return false;
      return true;
    }).map((u) => ({
      ...u,
      _score: (u.parque_instalado ?? [])
        .filter((p: any) => !p.archived_at)
        .reduce((s: number, p: any) => s + Number(p.quantidade ?? 0), 0),
    }));
    list.sort((a, b) => {
      if (sortBy === "score") return b._score - a._score;
      if (sortBy === "ciclo") return (a.ciclo ?? "").localeCompare(b.ciclo ?? "");
      return a.nome.localeCompare(b.nome);
    });
    return list;
  }, [items, search, filterCiclo, filterEstado, filterTipo, sortBy]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades de Saúde</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} unidades</p>
        </div>
        <div className="flex gap-2">
          <ExportButton onExport={() => exportToExcel(filtered.map((u: any) => ({
            Nome: u.nome, CNPJ: u.cnpj, Tipo: u.tipos_unidade?.nome, Ciclo: UNIDADE_CICLO_LABELS[u.ciclo as UnidadeCiclo],
            Cidade: u.cidade, Estado: u.estados?.sigla || u.estado, Telefone: u.telefone, Email: u.email,
          })), "unidades-saude", "Unidades")} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova unidade</Button>
            </DialogTrigger>
            <UnidadeForm tipos={tipos} estados={estados}
              onSaved={() => { setOpen(false); void load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou cidade..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCiclo} onValueChange={setFilterCiclo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(UNIDADE_CICLO_LABELS).map(([k, v]) =>
              <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos UF</SelectItem>
            {estados.map((uf) => <SelectItem key={uf.id} value={uf.sigla!}>{uf.sigla}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordenar: Nome</SelectItem>
            <SelectItem value="score">Ordenar: Score</SelectItem>
            <SelectItem value="ciclo">Ordenar: Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <Switch id="inativos" checked={showInativos} onCheckedChange={setShowInativos} />
          <Label htmlFor="inativos" className="text-xs cursor-pointer">Mostrar inativos</Label>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Médico principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u, i) => (
                <TableRow key={u.id} className={`cursor-pointer ${i % 2 ? "bg-muted/30" : ""} ${u.archived_at ? "opacity-50" : ""}`}>
                  <TableCell className="font-medium">
                    <Link to={`/unidades/${u.id}`} className="hover:text-primary">{u.nome}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[u.cidade, u.estados?.sigla].filter(Boolean).join(" - ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.tipos_unidade?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    {u.archived_at ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Inativo</Badge>
                    ) : (
                      <Badge className={UNIDADE_CICLO_BADGE[u.ciclo as UnidadeCiclo]} variant="outline">
                        {UNIDADE_CICLO_LABELS[u.ciclo as UnidadeCiclo]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{u._score}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.medicos ? `Dr. ${u.medicos.nome}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma unidade encontrada.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function UnidadeForm({ tipos, estados, onSaved }: { tipos: Lookup[]; estados: Lookup[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nome: "", tipo_id: "", estado_id: "", porte: "",
    cnpj: "", endereco: "", cidade: "", cep: "", telefone: "", email: "", site: "", observacoes: "",
    ciclo: "discovery" as UnidadeCiclo,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const tipoSel = tipos.find((t) => t.id === form.tipo_id);
    const estadoSel = estados.find((s) => s.id === form.estado_id);
    const tipoEnum = (tipoSel?.nome ?? "").toLowerCase().includes("hospital") ? "hospital"
      : (tipoSel?.nome ?? "").toLowerCase().includes("clínica") ? "clinica"
      : (tipoSel?.nome ?? "").toLowerCase().includes("ubs") ? "ubs"
      : (tipoSel?.nome ?? "").toLowerCase().includes("labora") ? "laboratorio" : "outro";
    const { error } = await supabase.from("unidades_saude").insert({
      nome: form.nome,
      tipo: tipoEnum as any,
      tipo_id: form.tipo_id || null,
      estado_id: form.estado_id || null,
      estado: estadoSel?.sigla ?? null,
      ciclo: form.ciclo,
      cnpj: form.cnpj || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      cep: form.cep || null,
      telefone: form.telefone || null,
      email: form.email || null,
      site: form.site || null,
      porte: form.porte || null,
      observacoes: form.observacoes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Unidade criada");
    onSaved();
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Nova unidade de saúde</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo_id} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.ciclo} onValueChange={(v: UnidadeCiclo) => setForm({ ...form, ciclo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(UNIDADE_CICLO_LABELS).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.estado_id} onValueChange={(v) => setForm({ ...form, estado_id: v })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estados.map((uf) => <SelectItem key={uf.id} value={uf.id}>{uf.sigla}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Porte</Label>
            <Select value={form.porte} onValueChange={(v) => setForm({ ...form, porte: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pequeno">Pequeno</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Grande">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Site</Label>
            <Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar unidade"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
