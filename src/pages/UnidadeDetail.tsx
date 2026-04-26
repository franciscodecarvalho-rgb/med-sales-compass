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
import { Building2, MapPin, Phone, Mail, Plus, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  UNIDADE_TIPO_LABELS, UNIDADE_CICLO_LABELS, formatCurrency, UnidadeTipo, UnidadeCiclo,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UnidadeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [unidade, setUnidade] = useState<any>(null);
  const [parque, setParque] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [medicosVinc, setMedicosVinc] = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const [u, p, c, mu, an, eq, md] = await Promise.all([
      supabase.from("unidades_saude").select("*, medicos(id, nome)").eq("id", id).maybeSingle(),
      supabase.from("parque_instalado").select("*, equipamentos(nome, linhas_produto(nome, cor))").eq("unidade_id", id).is("archived_at", null),
      supabase.from("contatos").select("*").eq("unidade_id", id).is("archived_at", null),
      supabase.from("medico_unidades").select("*, medicos(id, nome, especialidade)").eq("unidade_id", id),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_id_fkey(nome)").eq("unidade_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("equipamentos").select("id, nome, valor_referencia").is("archived_at", null),
      supabase.from("medicos").select("id, nome").is("archived_at", null),
    ]);
    setUnidade(u.data);
    setParque(p.data ?? []);
    setContatos(c.data ?? []);
    setMedicosVinc(mu.data ?? []);
    setAnotacoes(an.data ?? []);
    setEquipamentos(eq.data ?? []);
    setMedicos(md.data ?? []);
  }

  const score = parque.reduce((s, p) => s + Number(p.valor || 0), 0);

  async function addAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnot.trim() || !user) return;
    const { error } = await supabase.from("anotacoes").insert({
      autor_id: user.id, texto: novaAnot, unidade_id: id!,
      proximo_contato: proxContato || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Anotação adicionada");
    setNovaAnot(""); setProxContato("");
    void load();
  }

  if (!unidade) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link to="/unidades" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{unidade.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={unidade.ciclo === "cliente" ? "default" : "secondary"}>
                {UNIDADE_CICLO_LABELS[unidade.ciclo as UnidadeCiclo]}
              </Badge>
              <span>{UNIDADE_TIPO_LABELS[unidade.tipo as UnidadeTipo]}</span>
              {(unidade.cidade || unidade.estado) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[unidade.cidade, unidade.estado].filter(Boolean).join(" - ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <Card className="border-primary/30 shadow-glow">
          <CardContent className="p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Score do parque</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(score)}</div>
            <div className="text-xs text-muted-foreground">{parque.length} equipamento(s)</div>
          </CardContent>
        </Card>
      </div>

      {/* Contatos rápidos */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {unidade.telefone && (<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {unidade.telefone}</span>)}
        {unidade.email && (<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {unidade.email}</span>)}
      </div>

      <Tabs defaultValue="parque">
        <TabsList>
          <TabsTrigger value="parque">Parque ({parque.length})</TabsTrigger>
          <TabsTrigger value="medicos">Médicos ({medicosVinc.length})</TabsTrigger>
          <TabsTrigger value="contatos">Contatos ({contatos.length})</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotações ({anotacoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="parque" className="space-y-4">
          <ParqueAdd unidadeId={id!} equipamentos={equipamentos} onAdded={load} />
          <div className="space-y-2">
            {parque.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">{p.equipamentos?.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.equipamentos?.linhas_produto?.nome}
                      {p.numero_serie && ` · S/N: ${p.numero_serie}`}
                      {p.data_instalacao && ` · Instalado em ${format(new Date(p.data_instalacao), "dd/MM/yyyy")}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(p.valor)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {parque.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento no parque.</p>}
          </div>
        </TabsContent>

        <TabsContent value="medicos" className="space-y-4">
          <MedicoVincular unidadeId={id!} medicos={medicos} jaVinculados={medicosVinc.map((m) => m.medico_id)} onAdded={load} />
          <div className="space-y-2">
            {medicosVinc.map((mv) => (
              <Card key={mv.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <Link to={`/medicos/${mv.medicos.id}`} className="font-medium hover:underline">Dr. {mv.medicos.nome}</Link>
                    <div className="text-xs text-muted-foreground">
                      {mv.medicos.especialidade}
                      {mv.papel && ` · ${mv.papel}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await supabase.from("medico_unidades").delete().eq("id", mv.id);
                    void load();
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {medicosVinc.length === 0 && <p className="text-sm text-muted-foreground">Nenhum médico vinculado.</p>}
          </div>
        </TabsContent>

        <TabsContent value="contatos" className="space-y-4">
          <ContatoAdd unidadeId={id!} onAdded={load} />
          <div className="space-y-2">
            {contatos.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.cargo}{c.setor && ` · ${c.setor}`}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {c.telefone && <span>{c.telefone}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {contatos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>}
          </div>
        </TabsContent>

        <TabsContent value="anotacoes">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">Nova anotação</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addAnotacao} className="space-y-3">
                <Textarea rows={3} value={novaAnot} onChange={(e) => setNovaAnot(e.target.value)}
                  placeholder="Sobre essa unidade..." required />
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Próximo contato (opcional, gera tarefa)</Label>
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
                    {a.proximo_contato && (
                      <> · próximo contato em {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {anotacoes.length === 0 && <p className="text-sm text-muted-foreground">Sem anotações ainda.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParqueAdd({ unidadeId, equipamentos, onAdded }: { unidadeId: string; equipamentos: any[]; onAdded: () => void }) {
  const [form, setForm] = useState({ equipamento_id: "", numero_serie: "", data_instalacao: "", valor: "", garantia_ate: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipamento_id) return;
    const { error } = await supabase.from("parque_instalado").insert({
      unidade_id: unidadeId, equipamento_id: form.equipamento_id,
      numero_serie: form.numero_serie || null,
      data_instalacao: form.data_instalacao || null,
      valor: form.valor ? Number(form.valor) : null,
      garantia_ate: form.garantia_ate || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Equipamento adicionado ao parque");
    setForm({ equipamento_id: "", numero_serie: "", data_instalacao: "", valor: "", garantia_ate: "" });
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
          <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v })}>
            <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
            <SelectContent>
              {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="N/série" value={form.numero_serie}
            onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
          <Input type="date" value={form.data_instalacao}
            onChange={(e) => setForm({ ...form, data_instalacao: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Valor"
            value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MedicoVincular({ unidadeId, medicos, jaVinculados, onAdded }: { unidadeId: string; medicos: any[]; jaVinculados: string[]; onAdded: () => void }) {
  const [medicoId, setMedicoId] = useState("");
  const [papel, setPapel] = useState("");
  const disponiveis = medicos.filter((m) => !jaVinculados.includes(m.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicoId) return;
    const { error } = await supabase.from("medico_unidades").insert({ medico_id: medicoId, unidade_id: unidadeId, papel: papel || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Médico vinculado");
    setMedicoId(""); setPapel("");
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
          <Select value={medicoId} onValueChange={setMedicoId}>
            <SelectTrigger><SelectValue placeholder="Médico" /></SelectTrigger>
            <SelectContent>
              {disponiveis.map((m) => <SelectItem key={m.id} value={m.id}>Dr. {m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Papel (ex: Chefe de UTI)" value={papel} onChange={(e) => setPapel(e.target.value)} />
          <Button type="submit">Vincular</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ContatoAdd({ unidadeId, onAdded }: { unidadeId: string; onAdded: () => void }) {
  const [form, setForm] = useState({ nome: "", cargo: "", setor: "", email: "", telefone: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    const { error } = await supabase.from("contatos").insert({
      unidade_id: unidadeId,
      nome: form.nome, cargo: form.cargo || null, setor: form.setor || null,
      email: form.email || null, telefone: form.telefone || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Contato criado");
    setForm({ nome: "", cargo: "", setor: "", email: "", telefone: "" });
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
          <Input required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          <Input placeholder="Setor" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}
