import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole, ROLE_LABELS } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCircle2, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES: AppRole[] = ["admin", "gerente", "vendedor", "pos_venda", "assistente_vendas"];
type FilterMode = "ativos" | "inativos" | "todos";

interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
}
interface Linha { id: string; nome: string; cor: string }

export default function Usuarios() {
  const { user: me } = useAuth();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [linhasByUser, setLinhasByUser] = useState<Record<string, string[]>>({});
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("ativos");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [pf, rl, ul, ln] = await Promise.all([
      supabase.from("profiles").select("*").order("nome"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_linhas").select("user_id, linha_id"),
      supabase.from("linhas_produto").select("id, nome, cor").is("archived_at", null).order("nome"),
    ]);
    setUsuarios((pf.data ?? []) as Profile[]);
    const rmap: Record<string, AppRole[]> = {};
    (rl.data ?? []).forEach((r) => { rmap[r.user_id] = [...(rmap[r.user_id] ?? []), r.role as AppRole]; });
    setRolesByUser(rmap);
    const lmap: Record<string, string[]> = {};
    (ul.data ?? []).forEach((r) => { lmap[r.user_id] = [...(lmap[r.user_id] ?? []), r.linha_id]; });
    setLinhasByUser(lmap);
    setLinhas((ln.data ?? []) as Linha[]);
    setLoading(false);
  }

  async function setRole(userId: string, role: AppRole) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success("Papel atualizado");
    void load();
  }

  async function toggleAtivo(u: Profile) {
    const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.ativo ? "Desativado" : "Ativado");
    void load();
  }

  const filtered = usuarios.filter((u) => {
    if (filter === "ativos") return u.ativo;
    if (filter === "inativos") return !u.ativo;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie acessos, papéis e linhas atribuídas. Usuários nunca são apagados — apenas desativados.
          </p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button></DialogTrigger>
          <NovoUsuarioForm linhas={linhas} onSaved={() => { setCreating(false); void load(); }} />
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Apenas ativos</SelectItem>
            <SelectItem value="inativos">Apenas inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "usuário" : "usuários"}</span>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const role = rolesByUser[u.id]?.[0] ?? "vendedor";
            const userLinhaIds = linhasByUser[u.id] ?? [];
            const userLinhas = linhas.filter((l) => userLinhaIds.includes(l.id));
            const isMe = u.id === me?.id;
            return (
              <Card key={u.id} className={cn(!u.ativo && "bg-muted/30 opacity-70")}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <UserCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        <span className={cn(!u.ativo && "line-through")}>{u.nome}</span>
                        {isMe && <Badge variant="outline" className="text-[10px]">você</Badge>}
                        {!u.ativo && <Badge variant="destructive" className="text-[10px]">inativo</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      {userLinhas.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {userLinhas.map((l) => (
                            <Badge key={l.id} variant="secondary" className="text-[10px]" style={{ borderLeft: `3px solid ${l.cor}` }}>
                              {l.nome}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={role} onValueChange={(v: AppRole) => setRole(u.id, v)} disabled={isMe}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                      <Pencil className="mr-1 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAtivo(u)} disabled={isMe}>
                      {u.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <EditUserDialog
          user={editing}
          linhas={linhas}
          selectedLinhaIds={linhasByUser[editing.id] ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

// -------- Form criar usuário (chama edge function) --------
function NovoUsuarioForm({ linhas, onSaved }: { linhas: Linha[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", email: "", password: "", telefone: "",
    role: "vendedor" as AppRole, linha_ids: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  function toggleLinha(id: string) {
    setForm((f) => ({
      ...f,
      linha_ids: f.linha_ids.includes(id) ? f.linha_ids.filter((x) => x !== id) : [...f.linha_ids, id],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.email || form.password.length < 6) {
      toast.error("Nome, email e senha (≥6) são obrigatórios"); return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Senha provisória *</Label>
          <Input type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p className="text-[11px] text-muted-foreground">Mínimo 6 caracteres. O usuário poderá alterá-la depois.</p>
        </div>
        <div className="space-y-2">
          <Label>Perfil *</Label>
          <Select value={form.role} onValueChange={(v: AppRole) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Linhas atribuídas</Label>
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-40 overflow-y-auto">
            {linhas.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Nenhuma linha ativa.</p>}
            {linhas.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.linha_ids.includes(l.id)} onCheckedChange={() => toggleLinha(l.id)} />
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.cor }} />
                {l.nome}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// -------- Edit user (nome/telefone/linhas) --------
function EditUserDialog({
  user, linhas, selectedLinhaIds, onClose, onSaved,
}: {
  user: Profile; linhas: Linha[]; selectedLinhaIds: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [nome, setNome] = useState(user.nome);
  const [telefone, setTelefone] = useState(user.telefone ?? "");
  const [linhaIds, setLinhaIds] = useState<string[]>(selectedLinhaIds);
  const [saving, setSaving] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [resetando, setResetando] = useState(false);

  async function resetSenha() {
    if (novaSenha.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres"); return; }
    setResetando(true);
    const { data, error } = await supabase.functions.invoke("admin-update-password", {
      body: { user_id: user.id, password: novaSenha },
    });
    setResetando(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erro ao alterar senha");
      return;
    }
    toast.success("Senha atualizada");
    setNovaSenha("");
  }

  function toggle(id: string) {
    setLinhaIds((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function save() {
    setSaving(true);
    const { error: pErr } = await supabase.from("profiles").update({ nome, telefone: telefone || null }).eq("id", user.id);
    if (pErr) { setSaving(false); toast.error(pErr.message); return; }

    // Reset user_linhas
    await supabase.from("user_linhas").delete().eq("user_id", user.id);
    if (linhaIds.length) {
      const { error } = await supabase.from("user_linhas").insert(linhaIds.map((lid) => ({ user_id: user.id, linha_id: lid })));
      if (error) { setSaving(false); toast.error(error.message); return; }
    }
    setSaving(false);
    toast.success("Usuário atualizado");
    onSaved();
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Linhas atribuídas</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-40 overflow-y-auto">
              {linhas.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Nenhuma linha ativa.</p>}
              {linhas.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={linhaIds.includes(l.id)} onCheckedChange={() => toggle(l.id)} />
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.cor }} />
                  {l.nome}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
