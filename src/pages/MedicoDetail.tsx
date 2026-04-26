import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRound, ArrowLeft, Plus, Stethoscope, Mail, Phone, Star, Save, Trash2 } from "lucide-react";
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
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [unidadesAll, setUnidadesAll] = useState<any[]>([]);
  const [papeis, setPapeis] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    if (!id) return;
    const [m, u, a, ua, pp, esp] = await Promise.all([
      supabase.from("medicos").select("*, especialidades_medicas(id, nome)").eq("id", id).maybeSingle(),
      supabase.from("medico_unidades").select("*, unidades_saude(id, nome, cidade, estado, ciclo, medico_principal_id), papeis_contato(id, nome)").eq("medico_id", id),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_id_fkey(nome)").eq("medico_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("papeis_contato").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("especialidades_medicas").select("id, nome").is("archived_at", null).order("nome"),
    ]);
    setMedico(m.data);
    setUnidades(u.data ?? []);
    setAnotacoes(a.data ?? []);
    setUnidadesAll(ua.data ?? []);
    setPapeis(pp.data ?? []);
    setEspecialidades(esp.data ?? []);
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
            {medico.especialidades_medicas?.nome && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> {medico.especialidades_medicas.nome}
              </span>
            )}
            {medico.crm && <span>CRM {medico.crm}</span>}
            {medico.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {medico.email}</span>}
            {medico.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {medico.telefone}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="unidades">Unidades ({unidades.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({anotacoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosForm medico={medico} especialidades={especialidades} onSaved={load} />
        </TabsContent>

        <TabsContent value="unidades" className="space-y-3">
          <UnidadeVincular medicoId={id!} unidades={unidadesAll} papeis={papeis}
            jaVinculadas={unidades.map((u) => u.unidade_id)} onAdded={load} />
          <div className="space-y-2">
            {unidades.map((mu) => {
              const isPrincipal = mu.unidades_saude?.medico_principal_id === id;
              return (
                <Card key={mu.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <Link to={`/unidades/${mu.unidades_saude.id}`} className="font-medium hover:underline">
                        {mu.unidades_saude.nome}
                        {isPrincipal && <Star className="inline h-3 w-3 ml-1 text-warning fill-warning" />}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {mu.papeis_contato?.nome ?? mu.papel ?? "Sem papel definido"}
                        {(mu.unidades_saude?.cidade || mu.unidades_saude?.estado) && (
                          <> · {[mu.unidades_saude.cidade, mu.unidades_saude.estado].filter(Boolean).join("-")}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPrincipal && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Tomador de decisão</Badge>}
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await supabase.from("medico_unidades").delete().eq("id", mu.id);
                        void load();
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {unidades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma unidade vinculada.</p>}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
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
              <div key={a.id} className="flex gap-4">
                <div className="w-24 shrink-0 text-right text-xs text-muted-foreground pt-3">
                  {format(new Date(a.created_at), "dd MMM", { locale: ptBR })}
                  <div>{format(new Date(a.created_at), "HH:mm")}</div>
                </div>
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{a.texto}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {a.profiles?.nome ?? "—"}
                      {a.proximo_contato && <> · 📅 próx. {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
            {anotacoes.length === 0 && <p className="text-sm text-muted-foreground">Sem anotações.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DadosForm({ medico, especialidades, onSaved }: { medico: any; especialidades: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: medico.nome ?? "", crm: medico.crm ?? "",
    especialidade_id: medico.especialidade_id ?? "",
    email: medico.email ?? "", telefone: medico.telefone ?? "",
    observacoes: medico.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const espNome = especialidades.find((e) => e.id === form.especialidade_id)?.nome ?? null;
    const { error } = await supabase.from("medicos").update({
      nome: form.nome, crm: form.crm || null,
      especialidade_id: form.especialidade_id || null,
      especialidade: espNome,
      email: form.email || null, telefone: form.telefone || null,
      observacoes: form.observacoes || null,
    }).eq("id", medico.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados atualizados"); onSaved();
  };
  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>CRM</Label>
              <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Especialidade</Label>
              <Select value={form.especialidade_id} onValueChange={(v) => setForm({ ...form, especialidade_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{especialidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UnidadeVincular({ medicoId, unidades, papeis, jaVinculadas, onAdded }: { medicoId: string; unidades: any[]; papeis: any[]; jaVinculadas: string[]; onAdded: () => void }) {
  const [unidadeId, setUnidadeId] = useState("");
  const [papelId, setPapelId] = useState("");
  const disponiveis = unidades.filter((u) => !jaVinculadas.includes(u.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadeId) return;
    const papelNome = papeis.find((p) => p.id === papelId)?.nome ?? null;
    const { error } = await supabase.from("medico_unidades").insert({
      medico_id: medicoId, unidade_id: unidadeId,
      papel_id: papelId || null, papel: papelNome,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Unidade vinculada");
    setUnidadeId(""); setPapelId("");
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
          <Select value={unidadeId} onValueChange={setUnidadeId}>
            <SelectTrigger><SelectValue placeholder="Selecionar unidade..." /></SelectTrigger>
            <SelectContent>
              {disponiveis.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={papelId} onValueChange={setPapelId}>
            <SelectTrigger><SelectValue placeholder="Papel" /></SelectTrigger>
            <SelectContent>
              {papeis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit">Vincular</Button>
        </form>
      </CardContent>
    </Card>
  );
}
