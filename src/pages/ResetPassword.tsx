import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Quando o usuário clica no link de recuperação, o Supabase cria uma sessão temporária.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha redefinida! Faça login novamente.");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VitaTech CRM</h1>
        </div>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Definir nova senha</CardTitle>
            <CardDescription>
              {ready ? "Crie uma nova senha para sua conta." : "Validando link..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np">Nova senha</Label>
                <Input id="np" type="password" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp">Confirmar nova senha</Label>
                <Input id="cp" type="password" required minLength={6}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
