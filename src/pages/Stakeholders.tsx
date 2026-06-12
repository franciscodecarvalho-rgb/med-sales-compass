import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Handshake } from "lucide-react";
import { toast } from "sonner";
import { FavoritoStar } from "@/components/FavoritoStar";
import { maskTelefone } from "@/lib/masks";
import { LoadMoreBar, PAGE_SIZE } from "@/components/LoadMoreBar";

const TIPOS = ["decisor", "influenciador", "financeiro", "político", "outro"];

const TIPO_CLS: Record<string, string> = {
  decisor: "bg-rose-100 text-rose-800 border-rose-200",
  influenciador: "bg-amber-100 text-amber-800 border-amber-200",
  financeiro: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "político": "bg-violet-100 text-violet-800 border-violet-200",
  outro: "bg-stone-100 text-stone-700 border-stone-200",
};

export default function Stakeholders() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [openNew, setOpenNew] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { void load(page); }, [page]);

  async function load(p = 1) {
    const { data, error, count } = await supabase
      .from("stakeholders")
      .select("*", { count: "exact" })
      .is("archived_at", null)
      .order("nome")
      .range(0, p * PAGE_SIZE - 1);
    if (error) { toast.error(error.message); return; }
    setItems(data ?? []);
    setTotal(count ?? 0);
  }

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (tipoFilter !== "todos" && s.tipo !== tipoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${s.nome ?? ""} ${s.cargo ?? ""} ${s.organizacao ?? ""} ${s.email ?? ""} ${s.telefone ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, tipoFilter]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Handshake className="h-7 w-7" /> Stakeholders
          </h1>
          <p className="text-sm text-muted-foreground">Pessoas-chave externas (decisores, influenciadores, etc.) — visível só para admin e gerentes.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo stakeholder</Button>
          </DialogTrigger>
          <StakeholderDialog
            userId={user?.id}
            onSaved={() => { setOpenNew(false); void load(); }}
          />
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nome, cargo, organização..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Cargo</th>
                <th className="px-3 py-2 text-left">Organização</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Contato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-accent/30 cursor-pointer">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <FavoritoStar tipo="stakeholder" itemId={s.id} />
                      <Link to={`/stakeholders/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.nome}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{s.cargo ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.organizacao ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.tipo ? (
                      <Badge variant="outline" className={TIPO_CLS[s.tipo] ?? TIPO_CLS.outro}>{s.tipo}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {s.email && <div>{s.email}</div>}
                    {s.telefone && <div>{s.telefone}</div>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum stakeholder.</td></tr>
              )}
            </tbody>
          </table>
          <LoadMoreBar loaded={items.length} total={total} onLoadMore={() => setPage((p) => p + 1)} />
        </CardContent>
      </Card>
    </div>
  );
}

export function StakeholderDialog({
  stakeholder, userId, onSaved,
}: {
  stakeholder?: any;
  userId?: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: stakeholder?.nome ?? "",
    cargo: stakeholder?.cargo ?? "",
    organizacao: stakeholder?.organizacao ?? "",
    tipo: stakeholder?.tipo ?? "",
    telefone: stakeholder?.telefone ?? "",
    email: stakeholder?.email ?? "",
    observacoes: stakeholder?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      organizacao: form.organizacao.trim() || null,
      tipo: form.tipo || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };
    let error;
    if (stakeholder?.id) {
      ({ error } = await supabase.from("stakeholders").update(payload).eq("id", stakeholder.id));
    } else {
      ({ error } = await supabase.from("stakeholders").insert({ ...payload, created_by: userId ?? null }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(stakeholder?.id ? "Stakeholder atualizado" : "Stakeholder criado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{stakeholder?.id ? "Editar" : "Novo"} stakeholder</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Diretor financeiro" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo || "__none__"} onValueChange={(v) => setForm({ ...form, tipo: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Organização</Label>
          <Input value={form.organizacao} onChange={(e) => setForm({ ...form, organizacao: e.target.value })} placeholder="Ex: Secretaria Municipal de Saúde" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.nome.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
