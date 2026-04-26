import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound, ArrowLeft, Plus, Stethoscope, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

export default function MedicoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [medico, setMedico] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [m, u, a] = await Promise.all([
      supabase.from("medicos").select("*").eq("id", id).maybeSingle(),
      supabase.from("medico_unidades").select("*, unidades_saude(id, nome, cidade, estado, ciclo)").eq("medico_id", id),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_id_fkey(nome)").eq("medico_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    ]);
    setMedico(m.data);
    setUnidades(u.data ?? []);
    setAnotacoes(a.data ?? []);
  }

  async function addAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnot.trim() || !user) return;
    const { error } = await supabase.from("anotacoes").insert({
      autor_id: user.id, texto: novaAnot, medico_id: id!,
      proximo_contato: proxContato || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Anotação adicionada");
    setNovaAnot(""); setProxContato("");
    void load();
  }

  if (!medico) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-6 p-6">
      <Link to="/medicos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      <div className="flex gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <UserRound className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dr. {medico.nome}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {medico.especialidade && <span className="inline-flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {medico.especialidade}</span>}
            {medico.crm && <span>CRM {medico.crm}</span>}
            {medico.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {medico.email}</span>}
            {medico.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {medico.telefone}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="unidades">
        <TabsList>
          <TabsTrigger value="unidades">Unidades ({unidades.length})</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotações ({anotacoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unidades" className="space-y-2">
          {unidades.map((mu) => (
            <Link key={mu.id} to={`/unidades/${mu.unidades_saude.id}`}>
              <Card className="transition-all hover:border-primary/40">
                <CardContent className="p-3">
                  <div className="font-medium">{mu.unidades_saude.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {mu.papel || "Sem papel definido"} · {[mu.unidades_saude.cidade, mu.unidades_saude.estado].filter(Boolean).join("-")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {unidades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma unidade vinculada.</p>}
        </TabsContent>

        <TabsContent value="anotacoes">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">Nova anotação</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addAnotacao} className="space-y-3">
                <Textarea rows={3} value={novaAnot} onChange={(e) => setNovaAnot(e.target.value)} required />
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Próximo contato (opcional)</Label>
                    <Input type="datetime-local" value={proxContato}
                      onChange={(e) => setProxContato(e.target.value)} />
                  </div>
                  <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {anotacoes.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{a.texto}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {a.profiles?.nome ?? "—"} · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {a.proximo_contato && <> · próx. {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {anotacoes.length === 0 && <p className="text-sm text-muted-foreground">Sem anotações.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
