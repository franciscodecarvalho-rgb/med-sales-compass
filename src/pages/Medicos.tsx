import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, UserRound, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export default function Medicos() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("medicos")
      .select("*, medico_unidades(unidade_id)")
      .is("archived_at", null)
      .order("nome");
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  const filtered = items.filter((m) =>
    !search || m.nome.toLowerCase().includes(search.toLowerCase()) ||
    (m.especialidade ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médicos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} médicos cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo médico</Button>
          </DialogTrigger>
          <MedicoForm onSaved={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou especialidade..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} to={`/medicos/${m.id}`}>
              <Card className="transition-all hover:shadow-md hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent shrink-0">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">Dr. {m.nome}</div>
                      {m.especialidade && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Stethoscope className="h-3 w-3" />
                          {m.especialidade}
                        </div>
                      )}
                      {m.crm && <div className="text-xs text-muted-foreground">CRM {m.crm}</div>}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {m.medico_unidades?.length ?? 0} unidade(s) vinculada(s)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Nenhum médico encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MedicoForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", crm: "", especialidade: "", email: "", telefone: "", observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("medicos").insert({
      nome: form.nome,
      crm: form.crm || null,
      especialidade: form.especialidade || null,
      email: form.email || null,
      telefone: form.telefone || null,
      observacoes: form.observacoes || null,
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
            <Input value={form.especialidade}
              onChange={(e) => setForm({ ...form, especialidade: e.target.value })} />
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
