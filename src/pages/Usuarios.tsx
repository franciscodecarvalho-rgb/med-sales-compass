import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole, ROLE_LABELS } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserCircle2 } from "lucide-react";

const ROLES: AppRole[] = ["admin", "gerente", "vendedor", "pos_venda", "assistente_vendas"];

export default function Usuarios() {
  const { user: me } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [pf, rl] = await Promise.all([
      supabase.from("profiles").select("*").order("nome"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsuarios(pf.data ?? []);
    const map: Record<string, AppRole[]> = {};
    (rl.data ?? []).forEach((r) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role as AppRole];
    });
    setRolesByUser(map);
    setLoading(false);
  }

  async function setRole(userId: string, role: AppRole) {
    // Substitui todos os papéis do usuário pelo selecionado (modelo de papel único na UI; tabela permite múltiplos)
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success("Papel atualizado");
    void load();
  }

  async function toggleAtivo(u: any) {
    const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.ativo ? "Usuário desativado" : "Usuário ativado");
    void load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie acessos e papéis</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {usuarios.map((u) => {
            const role = rolesByUser[u.id]?.[0] ?? "vendedor";
            const isMe = u.id === me?.id;
            return (
              <Card key={u.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <UserCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {u.nome}
                        {isMe && <Badge variant="outline" className="text-[10px]">você</Badge>}
                        {!u.ativo && <Badge variant="destructive" className="text-[10px]">inativo</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={role} onValueChange={(v: AppRole) => setRole(u.id, v)} disabled={isMe}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
      <p className="text-xs text-muted-foreground">
        Novos usuários se registram pela tela de login com perfil <b>Vendedor</b> por padrão. Ajuste aqui o papel correto.
      </p>
    </div>
  );
}
