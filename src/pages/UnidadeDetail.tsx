import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, Mail, Globe, Plus, ArrowLeft, Trash2, Save, Send, Star } from "lucide-react";
import { TarefasList } from "@/components/TarefasList";
import PosVendaUnidadeTab from "@/components/posvenda/PosVendaUnidadeTab";
import { toast } from "sonner";
import { UNIDADE_CICLO_LABELS, UNIDADE_CICLO_BADGE, UnidadeCiclo } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

export default function UnidadeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unidade, setUnidade] = useState<any>(null);
  const [parque, setParque] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [medicosVinc, setMedicosVinc] = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);
  const [medicosAll, setMedicosAll] = useState<any[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [papeis, setPapeis] = useState<any[]>([]);
  const [dealsUnidade, setDealsUnidade] = useState<any[]>([]);
  const [dealsManutUnidade, setDealsManutUnidade] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    if (!id) return;
    const [u, p, c, mu, an, md, ln, tp, es, pp, dl, dm, tk] = await Promise.all([
      supabase.from("unidades_saude").select("*, tipos_unidade(id, nome), estados(id, sigla, nome)").eq("id", id).maybeSingle(),
      supabase.from("parque_instalado").select("*, linhas_produto(id, nome, cor)").eq("unidade_id", id).is("archived_at", null),
      supabase.from("contatos").select("*, papeis_contato(id, nome)").eq("unidade_id", id).is("archived_at", null),
      supabase.from("medico_unidades").select("*, medicos(id, nome, especialidade, especialidades_medicas(nome)), papeis_contato(id, nome)").eq("unidade_id", id),
      supabase.from("anotacoes").select("*, profiles!anotacoes_autor_profile_fkey(nome)").eq("unidade_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("medicos").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("id, nome, cor").is("archived_at", null).order("nome"),
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
      supabase.from("papeis_contato").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("deals").select("id, titulo, estagio, resultado, valor_total, data_entrada_estagio, data_previsao_fechamento, linhas_produto(nome, cor), profiles!deals_vendedor_profile_fkey(nome)").eq("unidade_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("deals_manutencao").select("id, titulo, estagio, resultado, valor_total, data_entrada_estagio, data_previsao_fechamento, garantia_origem_id, linhas_produto(nome, cor), profiles!deals_manutencao_vendedor_profile_fkey(nome)").eq("unidade_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("tarefas").select("id, titulo, descricao, status, prioridade, data_vencimento").eq("unidade_id", id).is("archived_at", null).order("data_vencimento", { ascending: true, nullsFirst: false }),
    ]);
    setUnidade(u.data);
    setParque(p.data ?? []);
    setContatos(c.data ?? []);
    setMedicosVinc(mu.data ?? []);
    setAnotacoes(an.data ?? []);
    setMedicosAll(md.data ?? []);
    setLinhas(ln.data ?? []);
    setTipos(tp.data ?? []);
    setEstados(es.data ?? []);
    setPapeis(pp.data ?? []);
    setDealsUnidade(dl.data ?? []);
    setDealsManutUnidade(dm.data ?? []);
    setTarefas(tk.data ?? []);
  }

  const score = parque.reduce((s, p) => s + Number(p.quantidade ?? 0), 0);

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

  async function enviarParaFunil() {
    if (!unidade) return;
    const { error } = await supabase.from("unidades_saude")
      .update({ ciclo: "lead" as UnidadeCiclo }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("Unidade marcada como Ativa. Crie o deal no Funil de Vendas.");
    navigate(`/funil-vendas?unidade=${id}`);
  }

  if (!unidade) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-6 p-6">
      <Link to="/unidades" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{unidade.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className={UNIDADE_CICLO_BADGE[unidade.ciclo as UnidadeCiclo]} variant="outline">
                {UNIDADE_CICLO_LABELS[unidade.ciclo as UnidadeCiclo]}
              </Badge>
              <span>{unidade.tipos_unidade?.nome ?? "—"}</span>
              {(unidade.cidade || unidade.estados?.sigla) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[unidade.cidade, unidade.estados?.sigla].filter(Boolean).join(" - ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Card className="border-primary/30 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Score do parque</div>
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-xs text-muted-foreground">{parque.length} registro(s)</div>
            </CardContent>
          </Card>
          {unidade.ciclo === "discovery" && (
            <Button onClick={enviarParaFunil} variant="default">
              <Send className="mr-2 h-4 w-4" /> Enviar para Funil
            </Button>
          )}
        </div>
      </div>

      {/* Contatos rápidos */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {unidade.telefone && (<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {unidade.telefone}</span>)}
        {unidade.email && (<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {unidade.email}</span>)}
        {unidade.site && (<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {unidade.site}</span>)}
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="parque">Parque ({parque.length})</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas ({medicosVinc.length + contatos.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({anotacoes.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({dealsUnidade.length + dealsManutUnidade.length})</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas ({tarefas.length})</TabsTrigger>
          <TabsTrigger value="posvenda">Pós-Venda</TabsTrigger>
        </TabsList>

        {/* DADOS */}
        <TabsContent value="dados">
          <DadosForm unidade={unidade} tipos={tipos} estados={estados} onSaved={load} />
        </TabsContent>

        {/* PARQUE */}
        <TabsContent value="parque" className="space-y-4">
          <ParqueAdd unidadeId={id!} linhas={linhas} userId={user?.id} onAdded={load} />
          <div className="space-y-2">
            {parque.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 flex-1">
                    {p.linhas_produto?.cor && (
                      <div className="h-3 w-3 rounded-full" style={{ background: p.linhas_produto.cor }} />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{p.linhas_produto?.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.descricao || "Sem descrição"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{p.quantidade}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">unidade(s)</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("parque_instalado").update({ archived_at: new Date().toISOString() }).eq("id", p.id);
                      void load();
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {parque.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento no parque.</p>}
          </div>
        </TabsContent>

        {/* PESSOAS */}
        <TabsContent value="pessoas" className="space-y-6">
          {/* Médico principal */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Médico principal</CardTitle></CardHeader>
            <CardContent>
              <Select
                value={unidade.medico_principal_id ?? ""}
                onValueChange={async (v) => {
                  const { error } = await supabase.from("unidades_saude")
                    .update({ medico_principal_id: v || null }).eq("id", id!);
                  if (error) toast.error(error.message); else { toast.success("Médico principal atualizado"); void load(); }
                }}
              >
                <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecionar dentre médicos vinculados" /></SelectTrigger>
                <SelectContent>
                  {medicosVinc.map((mv: any) =>
                    <SelectItem key={mv.medicos.id} value={mv.medicos.id}>Dr. {mv.medicos.nome}</SelectItem>)}
                  {medicosVinc.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Vincule médicos abaixo primeiro.</div>}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Médicos vinculados */}
          <div>
            <h3 className="font-semibold mb-2">Médicos vinculados</h3>
            <MedicoVincular unidadeId={id!} medicos={medicosAll} papeis={papeis}
              jaVinculados={medicosVinc.map((m) => m.medico_id)} onAdded={load} />
            <div className="space-y-2 mt-3">
              {medicosVinc.map((mv) => (
                <Card key={mv.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <Link to={`/medicos/${mv.medicos.id}`} className="font-medium hover:underline">
                        Dr. {mv.medicos.nome}
                        {unidade.medico_principal_id === mv.medicos.id && (
                          <Star className="inline h-3 w-3 ml-1 text-warning fill-warning" />
                        )}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {mv.medicos.especialidades_medicas?.nome ?? mv.medicos.especialidade ?? "—"}
                        {mv.papeis_contato?.nome && ` · ${mv.papeis_contato.nome}`}
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
          </div>

          {/* Contatos */}
          <div>
            <h3 className="font-semibold mb-2">Contatos não-médicos</h3>
            <ContatoAdd unidadeId={id!} papeis={papeis} onAdded={load} />
            <div className="space-y-2 mt-3">
              {contatos.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.papeis_contato?.nome ?? c.cargo ?? "—"}
                        {c.setor && ` · ${c.setor}`}
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        {c.telefone && <span>{c.telefone}</span>}
                        {c.email && <span>{c.email}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("contatos").update({ archived_at: new Date().toISOString() }).eq("id", c.id);
                      void load();
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {contatos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>}
            </div>
          </div>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
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
                      {a.proximo_contato && (
                        <> · 📅 próximo contato em {format(new Date(a.proximo_contato), "dd/MM HH:mm")}</>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
            {anotacoes.length === 0 && <p className="text-sm text-muted-foreground">Sem anotações ainda.</p>}
          </div>
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          {/* Deals de Vendas */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
                Vendas ({dealsUnidade.length})
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate(`/funil-vendas?unidade=${id}`)}>
                <Plus className="mr-2 h-4 w-4" /> Novo deal
              </Button>
            </div>
            {dealsUnidade.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground text-center">Nenhum deal de vendas.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {dealsUnidade.map((d) => {
                  const isFinal = d.estagio === "finalizado";
                  const dias = Math.floor((Date.now() - new Date(d.data_entrada_estagio).getTime()) / 86400000);
                  return (
                    <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                      onClick={() => navigate(`/deals/${d.id}`)}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{d.titulo}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span style={{ color: d.linhas_produto?.cor }}>{d.linhas_produto?.nome}</span>
                            <span>·</span><span>👤 {d.profiles?.nome}</span>
                            {!isFinal && <><span>·</span><span>{dias}d no estágio</span></>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(d.valor_total ?? 0))}</div>
                          {isFinal ? (
                            <Badge variant="outline" className={d.resultado === "ganho"
                              ? "bg-success/15 text-success border-success/40"
                              : "bg-destructive/15 text-destructive border-destructive/40"}>
                              {d.resultado === "ganho" ? "GANHO" : "PERDIDO"}
                            </Badge>
                          ) : <Badge variant="secondary">{d.estagio}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deals de Manutenção */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-success">
                Manutenção ({dealsManutUnidade.length})
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate(`/funil-manutencao?unidade=${id}`)}>
                <Plus className="mr-2 h-4 w-4" /> Novo deal
              </Button>
            </div>
            {dealsManutUnidade.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground text-center">Nenhum deal de manutenção.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {dealsManutUnidade.map((d) => {
                  const isFinal = d.estagio === "finalizado";
                  const dias = Math.floor((Date.now() - new Date(d.data_entrada_estagio).getTime()) / 86400000);
                  return (
                    <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-success"
                      onClick={() => navigate(`/deals-manutencao/${d.id}`)}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30">MANUT</Badge>
                            <div className="font-medium truncate">{d.titulo}</div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                            <span style={{ color: d.linhas_produto?.cor }}>{d.linhas_produto?.nome}</span>
                            <span>·</span><span>👤 {d.profiles?.nome}</span>
                            {!isFinal && <><span>·</span><span>{dias}d no estágio</span></>}
                            {d.garantia_origem_id && <><span>·</span><span className="text-warning">via garantia</span></>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(d.valor_total ?? 0))}</div>
                          {isFinal ? (
                            <Badge variant="outline" className={d.resultado === "ganho"
                              ? "bg-success/15 text-success border-success/40"
                              : "bg-destructive/15 text-destructive border-destructive/40"}>
                              {d.resultado === "ganho" ? "GANHO" : "PERDIDO"}
                            </Badge>
                          ) : <Badge variant="secondary">{d.estagio}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tarefas">
          <TarefasList tarefas={tarefas} onChange={load} />
        </TabsContent>

        <TabsContent value="posvenda">
          <PosVendaUnidadeTab unidadeId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DadosForm({ unidade, tipos, estados, onSaved }: { unidade: any; tipos: any[]; estados: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: unidade.nome ?? "", cnpj: unidade.cnpj ?? "", endereco: unidade.endereco ?? "",
    cidade: unidade.cidade ?? "", cep: unidade.cep ?? "", telefone: unidade.telefone ?? "",
    email: unidade.email ?? "", site: unidade.site ?? "", porte: unidade.porte ?? "",
    observacoes: unidade.observacoes ?? "", tipo_id: unidade.tipo_id ?? "",
    estado_id: unidade.estado_id ?? "", ciclo: (unidade.ciclo ?? "discovery") as UnidadeCiclo,
    archived: !!unidade.archived_at,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const estadoSel = estados.find((s) => s.id === form.estado_id);
    const { error } = await supabase.from("unidades_saude").update({
      nome: form.nome, cnpj: form.cnpj || null, endereco: form.endereco || null,
      cidade: form.cidade || null, cep: form.cep || null, telefone: form.telefone || null,
      email: form.email || null, site: form.site || null, porte: form.porte || null,
      observacoes: form.observacoes || null, tipo_id: form.tipo_id || null,
      estado_id: form.estado_id || null, estado: estadoSel?.sigla ?? null,
      ciclo: form.ciclo,
      archived_at: form.archived ? new Date().toISOString() : null,
    }).eq("id", unidade.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados atualizados");
    onSaved();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo_id} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.ciclo} onValueChange={(v: UnidadeCiclo) => setForm({ ...form, ciclo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(UNIDADE_CICLO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Porte</Label>
              <Select value={form.porte} onValueChange={(v) => setForm({ ...form, porte: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pequeno">Pequeno</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Grande">Grande</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>UF</Label>
              <Select value={form.estado_id} onValueChange={(v) => setForm({ ...form, estado_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{estados.map((s) => <SelectItem key={s.id} value={s.id}>{s.sigla}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Site</Label>
            <Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} /></div>
          <div className="space-y-2"><Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.archived}
                onChange={(e) => setForm({ ...form, archived: e.target.checked })} />
              Marcar como inativa
            </label>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ParqueAdd({ unidadeId, linhas, userId, onAdded }: { unidadeId: string; linhas: any[]; userId?: string; onAdded: () => void }) {
  const [form, setForm] = useState({ linha_id: "", descricao: "", quantidade: 1 });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.linha_id) { toast.error("Selecione a linha de produto"); return; }
    const { error } = await supabase.from("parque_instalado").insert({
      unidade_id: unidadeId, linha_id: form.linha_id,
      descricao: form.descricao || null, quantidade: form.quantidade,
      created_by: userId ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Equipamento adicionado");
    setForm({ linha_id: "", descricao: "", quantidade: 1 });
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-[200px_1fr_100px_auto]">
          <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
            <SelectTrigger><SelectValue placeholder="Linha" /></SelectTrigger>
            <SelectContent>
              {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Descrição (ex: Endoscópios HD)"
            value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <Input type="number" min="1" placeholder="Qtd"
            value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) || 1 })} />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MedicoVincular({ unidadeId, medicos, papeis, jaVinculados, onAdded }: { unidadeId: string; medicos: any[]; papeis: any[]; jaVinculados: string[]; onAdded: () => void }) {
  const [medicoId, setMedicoId] = useState("");
  const [papelId, setPapelId] = useState("");
  const disponiveis = medicos.filter((m) => !jaVinculados.includes(m.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicoId) return;
    const papelNome = papeis.find((p) => p.id === papelId)?.nome ?? null;
    const { error } = await supabase.from("medico_unidades").insert({
      medico_id: medicoId, unidade_id: unidadeId,
      papel_id: papelId || null, papel: papelNome,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Médico vinculado");
    setMedicoId(""); setPapelId("");
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
          <Select value={medicoId} onValueChange={setMedicoId}>
            <SelectTrigger><SelectValue placeholder="Buscar médico..." /></SelectTrigger>
            <SelectContent>
              {disponiveis.map((m) => <SelectItem key={m.id} value={m.id}>Dr. {m.nome}</SelectItem>)}
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

function ContatoAdd({ unidadeId, papeis, onAdded }: { unidadeId: string; papeis: any[]; onAdded: () => void }) {
  const [form, setForm] = useState({ nome: "", papel_id: "", setor: "", email: "", telefone: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    const papelNome = papeis.find((p) => p.id === form.papel_id)?.nome ?? null;
    const { error } = await supabase.from("contatos").insert({
      unidade_id: unidadeId,
      nome: form.nome,
      papel_id: form.papel_id || null,
      cargo: papelNome,
      setor: form.setor || null,
      email: form.email || null, telefone: form.telefone || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Contato criado");
    setForm({ nome: "", papel_id: "", setor: "", email: "", telefone: "" });
    onAdded();
  };
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
          <Input required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Select value={form.papel_id} onValueChange={(v) => setForm({ ...form, papel_id: v })}>
            <SelectTrigger><SelectValue placeholder="Cargo/Papel" /></SelectTrigger>
            <SelectContent>{papeis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Setor" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Button type="submit"><Plus className="h-4 w-4" /></Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
