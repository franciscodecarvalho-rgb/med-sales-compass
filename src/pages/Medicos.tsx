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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ExportButton, exportToExcel } from "@/lib/export";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";

type Lookup = { id: string; nome: string };
type UnidadeLk = { id: string; nome: string; cidade?: string | null };

export default function Medicos() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEsp, setFilterEsp] = useState<string>("all");
  const [filterCidade, setFilterCidade] = useState<string>("all");
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const [m, esp] = await Promise.all([
      supabase.from("medicos").select(`
        *,
        especialidades_medicas(id, nome),
        medico_unidades(unidade_id, unidades_saude(id, nome, cidade))
      `).is("archived_at", null).order("nome"),
      supabase.from("especialidades_medicas").select("id, nome").is("archived_at", null).order("nome"),
    ]);
    if (m.error) toast.error(m.error.message);
    setItems(m.data ?? []);
    setEspecialidades((esp.data ?? []) as Lookup[]);
    setLoading(false);
  }

  const cidadesDisponiveis = useMemo(() => {
    const s = new Set<string>();
    items.forEach((m: any) => (m.medico_unidades ?? []).forEach((mu: any) => {
      if (mu.unidades_saude?.cidade) s.add(mu.unidades_saude.cidade);
    }));
    return Array.from(s).sort();
  }, [items]);

  const filtered = items.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      if (!m.nome.toLowerCase().includes(q) && !(m.crm ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterEsp !== "all" && m.especialidades_medicas?.id !== filterEsp) return false;
    if (filterCidade !== "all") {
      const cidades = (m.medico_unidades ?? []).map((mu: any) => mu.unidades_saude?.cidade).filter(Boolean);
      if (!cidades.includes(filterCidade)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médicos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} médicos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <ExportButton onExport={() => exportToExcel(filtered.map((m: any) => ({
            Nome: m.nome, CRM: m.crm, Especialidade: m.especialidades_medicas?.nome || m.especialidade,
            Telefone: m.telefone, Email: m.email,
            Unidades: (m.medico_unidades ?? []).map((mu: any) => mu.unidades_saude?.nome).filter(Boolean).join(" | "),
          })), "medicos", "Médicos")} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo médico</Button>
            </DialogTrigger>
            <MedicoForm especialidades={especialidades} userId={user?.id}
              onSaved={() => { setOpen(false); void load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou CRM..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterEsp} onValueChange={setFilterEsp}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Especialidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas especialidades</SelectItem>
            {especialidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCidade} onValueChange={setFilterCidade}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cidadesDisponiveis.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CRM</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Unidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m, i) => (
                <TableRow key={m.id} className={i % 2 ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium">
                    <Link to={`/medicos/${m.id}`} className="hover:text-primary">Dr. {m.nome}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.crm ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.especialidades_medicas?.nome ?? m.especialidade ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.telefone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(m.medico_unidades ?? []).slice(0, 3).map((mu: any) => (
                        <Badge key={mu.unidade_id} variant="secondary" className="text-xs">
                          {mu.unidades_saude?.nome}
                        </Badge>
                      ))}
                      {(m.medico_unidades ?? []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(m.medico_unidades ?? []).length - 3}
                        </Badge>
                      )}
                      {(m.medico_unidades ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum médico encontrado.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MedicoForm({ especialidades, userId, onSaved }: { especialidades: Lookup[]; userId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", crm: "", especialidade_id: "", email: "", telefone: "", observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const espNome = especialidades.find((e) => e.id === form.especialidade_id)?.nome ?? null;
    const { error } = await supabase.from("medicos").insert({
      nome: form.nome,
      crm: form.crm || null,
      especialidade_id: form.especialidade_id || null,
      especialidade: espNome,
      email: form.email || null,
      telefone: form.telefone || null,
      observacoes: form.observacoes || null,
      created_by: userId ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Médico cadastrado");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo médico</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>CRM</Label>
            <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Especialidade</Label>
            <Select value={form.especialidade_id} onValueChange={(v) => setForm({ ...form, especialidade_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {especialidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
