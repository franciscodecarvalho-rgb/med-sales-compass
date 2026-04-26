import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  UNIDADE_TIPO_LABELS, UNIDADE_CICLO_LABELS, ESTADOS_BR, UnidadeTipo, UnidadeCiclo,
} from "@/lib/crm";

export default function Unidades() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCiclo, setFilterCiclo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("unidades_saude")
      .select("*, medicos(nome)")
      .is("archived_at", null)
      .order("nome");
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  const filtered = items.filter((u) => {
    if (search && !u.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCiclo !== "all" && u.ciclo !== filterCiclo) return false;
    if (filterEstado !== "all" && u.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades de Saúde</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} unidades</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova unidade</Button>
          </DialogTrigger>
          <UnidadeForm onSaved={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCiclo} onValueChange={setFilterCiclo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os ciclos</SelectItem>
            {Object.entries(UNIDADE_CICLO_LABELS).map(([k, v]) =>
              <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos UF</SelectItem>
            {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <Link key={u.id} to={`/unidades/${u.id}`}>
              <Card className="transition-all hover:shadow-md hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{u.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {UNIDADE_TIPO_LABELS[u.tipo as UnidadeTipo]}
                      </div>
                      {(u.cidade || u.estado) && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[u.cidade, u.estado].filter(Boolean).join(" - ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={u.ciclo === "cliente" ? "default" : "secondary"}>
                      {UNIDADE_CICLO_LABELS[u.ciclo as UnidadeCiclo]}
                    </Badge>
                    {u.medicos && (
                      <span className="text-xs text-muted-foreground truncate">
                        Dr. {u.medicos.nome}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function UnidadeForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", tipo: "hospital" as UnidadeTipo, ciclo: "discovery" as UnidadeCiclo,
    cnpj: "", endereco: "", cidade: "", estado: "", cep: "", telefone: "", email: "", observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("unidades_saude").insert({
      nome: form.nome,
      tipo: form.tipo,
      ciclo: form.ciclo,
      cnpj: form.cnpj || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep || null,
      telefone: form.telefone || null,
      email: form.email || null,
      observacoes: form.observacoes || null,
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
            <Select value={form.tipo} onValueChange={(v: UnidadeTipo) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(UNIDADE_TIPO_LABELS).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ciclo</Label>
            <Select value={form.ciclo} onValueChange={(v: UnidadeCiclo) => setForm({ ...form, ciclo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(UNIDADE_CICLO_LABELS).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
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
