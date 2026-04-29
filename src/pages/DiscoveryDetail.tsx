import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Check, Search as SearchIcon, RotateCcw, Save, Plus, Trash2,
  UserPlus, Stethoscope, Package, Phone, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DISCOVERY_STATUS_LABELS, DISCOVERY_STATUS_BADGE, DiscoveryStatus } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DiscoveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<any>(null);
  const [tipos, setTipos] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [papeis, setPapeis] = useState<any[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [medicosAll, setMedicosAll] = useState<any[]>([]);

  const [contatos, setContatos] = useState<any[]>([]);
  const [medicosVinc, setMedicosVinc] = useState<any[]>([]);
  const [parque, setParque] = useState<any[]>([]);
  const [anotacoes, setAnotacoes] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [oficializando, setOficializando] = useState(false);

  const [novaAnot, setNovaAnot] = useState("");
  const [proxContato, setProxContato] = useState("");

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    if (!id) return;
    const [d, t, e, pp, ln, md, c, mv, pq, an] = await Promise.all([
      supabase.from("discovery")
        .select("*, tipos_unidade(id, nome), estados(id, sigla)")
        .eq("id", id).maybeSingle(),
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
      supabase.from("papeis_contato").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("id, nome, cor").is("archived_at", null).order("nome"),
      supabase.from("medicos").select("id, nome, especialidade").is("archived_at", null).order("nome"),
      supabase.from("contatos").select("*, papeis_contato(id, nome)")
        .eq("discovery_id", id).is("archived_at", null).order("created_at"),
      supabase.from("medico_discovery")
        .select("id, papel_id, medicos(id, nome, especialidade), papeis_contato(id, nome)")
        .eq("discovery_id", id),
      supabase.from("parque_instalado").select("*, linhas_produto(id, nome, cor)")
        .eq("discovery_id", id).is("archived_at", null).order("created_at"),
      supabase.from("anotacoes").select("*, profiles:autor_id(nome)")
        .eq("discovery_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    ]);
    setItem(d.data);
    setTipos(t.data ?? []);
    setEstados(e.data ?? []);
    setPapeis(pp.data ?? []);
    setLinhas(ln.data ?? []);
    setMedicosAll(md.data ?? []);
    setContatos(c.data ?? []);
    setMedicosVinc(mv.data ?? []);
    setParque(pq.data ?? []);
    setAnotacoes(an.data ?? []);
  }

  async function salvar() {
    if (!item) return;
    setSaving(true);
    const { error } = await supabase.from("discovery").update({
      nome: item.nome,
      cnpj: item.cnpj || null,
      endereco: item.endereco || null,
      cidade: item.cidade || null,
      estado_id: item.estado_id || null,
      porte: item.porte || null,
      tipo_id: item.tipo_id || null,
      telefone: item.telefone || null,
      email: item.email || null,
      site: item.site || null,
      informacoes_adicionais: item.informacoes_adicionais || null,
    }).eq("id", item.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados salvos");
  }

  async function descartar() {
    if (!item) return;
    const { error } = await supabase.from("discovery")
      .update({ status: "descartado" }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item descartado");
    navigate("/discovery");
  }

  async function ressuscitar() {
    if (!item) return;
    const { error } = await supabase.from("discovery")
      .update({ status: "em_pesquisa" }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item recuperado");
    void load();
  }

  async function oficializar() {
    if (!item || !user) return;
    setOficializando(true);
    try {
      const tipoNome = (tipos.find((t) => t.id === item.tipo_id)?.nome ?? "").toLowerCase();
      const tipoEnum: any = tipoNome.includes("hospital") ? "hospital"
        : tipoNome.includes("clín") ? "clinica"
        : tipoNome.includes("ubs") ? "ubs"
        : tipoNome.includes("labora") ? "laboratorio" : "outro";

      const { data: unidade, error: errU } = await supabase.from("unidades_saude").insert({
        nome: item.nome,
        cnpj: item.cnpj || null,
        endereco: item.endereco || null,
        cidade: item.cidade || null,
        estado_id: item.estado_id || null,
        estado: item.estados?.sigla ?? null,
        porte: item.porte || null,
        tipo_id: item.tipo_id || null,
        tipo: tipoEnum,
        telefone: item.telefone || null,
        email: item.email || null,
        site: item.site || null,
        status: "lead",
        discovery_origem_id: item.id,
        created_by: user.id,
      }).select("id").single();
      if (errU) throw errU;

      const { data: meds } = await supabase.from("medico_discovery")
        .select("medico_id, papel_id").eq("discovery_id", item.id);
      if (meds && meds.length > 0) {
        await supabase.from("medico_unidades").insert(
          meds.map((m) => ({ medico_id: m.medico_id, unidade_id: unidade.id, papel_id: m.papel_id }))
        );
      }

      await supabase.from("contatos")
        .update({ discovery_id: null, unidade_id: unidade.id })
        .eq("discovery_id", item.id);

      await supabase.from("parque_instalado")
        .update({ discovery_id: null, unidade_id: unidade.id })
        .eq("discovery_id", item.id);

      const { data: anots } = await supabase.from("anotacoes")
        .select("autor_id, texto, proximo_contato").eq("discovery_id", item.id);
      if (anots && anots.length > 0) {
        await supabase.from("anotacoes").insert(
          anots.map((a) => ({
            autor_id: a.autor_id, texto: a.texto,
            proximo_contato: a.proximo_contato, unidade_id: unidade.id,
          }))
        );
      }

      await supabase.from("discovery")
        .update({ status: "oficializado", unidade_gerada_id: unidade.id })
        .eq("id", item.id);

      toast.success(`Unidade "${item.nome}" criada como Lead!`);
      navigate(`/unidades/${unidade.id}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao oficializar");
    } finally {
      setOficializando(false);
    }
  }

  // ===== CONTATOS =====
  const [contatoNovo, setContatoNovo] = useState({ nome: "", cargo: "", telefone: "", email: "", papel_id: "" });
  const [contatoOpen, setContatoOpen] = useState(false);

  async function addContato() {
    if (!contatoNovo.nome.trim() || !item) return;
    const { error } = await supabase.from("contatos").insert({
      nome: contatoNovo.nome.trim(),
      cargo: contatoNovo.cargo || null,
      telefone: contatoNovo.telefone || null,
      email: contatoNovo.email || null,
      papel_id: contatoNovo.papel_id || null,
      discovery_id: item.id,
    });
    if (error) { toast.error(error.message); return; }
    setContatoNovo({ nome: "", cargo: "", telefone: "", email: "", papel_id: "" });
    setContatoOpen(false);
    void load();
  }

  async function removeContato(cid: string) {
    const { error } = await supabase.from("contatos")
      .update({ archived_at: new Date().toISOString() }).eq("id", cid);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  // ===== MÉDICOS =====
  const [medicoSel, setMedicoSel] = useState("");
  const [medicoPapel, setMedicoPapel] = useState("");
  const [medicoOpen, setMedicoOpen] = useState(false);

  async function vincularMedico() {
    if (!medicoSel || !item) return;
    const { error } = await supabase.from("medico_discovery").insert({
      medico_id: medicoSel,
      discovery_id: item.id,
      papel_id: medicoPapel || null,
    });
    if (error) { toast.error(error.message); return; }
    setMedicoSel(""); setMedicoPapel(""); setMedicoOpen(false);
    void load();
  }

  async function removerMedico(mid: string) {
    const { error } = await supabase.from("medico_discovery").delete().eq("id", mid);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  // ===== PARQUE =====
  const [parqueNovo, setParqueNovo] = useState({ linha_id: "", descricao: "", quantidade: 1, observacoes: "" });
  const [parqueOpen, setParqueOpen] = useState(false);

  async function addParque() {
    if (!item || !user) return;
    if (!parqueNovo.linha_id && !parqueNovo.descricao.trim()) {
      toast.error("Informe a linha ou descrição"); return;
    }
    const { error } = await supabase.from("parque_instalado").insert({
      discovery_id: item.id,
      linha_id: parqueNovo.linha_id || null,
      descricao: parqueNovo.descricao || null,
      quantidade: parqueNovo.quantidade || 1,
      observacoes: parqueNovo.observacoes || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    setParqueNovo({ linha_id: "", descricao: "", quantidade: 1, observacoes: "" });
    setParqueOpen(false);
    void load();
  }

  async function removeParque(pid: string) {
    const { error } = await supabase.from("parque_instalado")
      .update({ archived_at: new Date().toISOString() }).eq("id", pid);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  // ===== ANOTAÇÕES =====
  async function addAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAnot.trim() || !user || !item) return;
    const { error } = await supabase.from("anotacoes").insert({
      texto: novaAnot.trim(),
      autor_id: user.id,
      discovery_id: item.id,
      proximo_contato: proxContato || null,
    });
    if (error) { toast.error(error.message); return; }
    setNovaAnot(""); setProxContato("");
    toast.success("Anotação salva" + (proxContato ? " · tarefa criada" : ""));
    void load();
  }

  if (!item) return <div className="p-6">Carregando...</div>;

  const isDescartado = item.status === "descartado";
  const isOficializado = item.status === "oficializado";
  const readOnly = isOficializado || isDescartado;

  // médicos não vinculados ainda
  const medicosDisponiveis = medicosAll.filter(
    (m) => !medicosVinc.some((mv: any) => mv.medicos?.id === m.id)
  );

  return (
    <div className="space-y-6 p-6">
      <Link to="/discovery" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SearchIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className={DISCOVERY_STATUS_BADGE[item.status as DiscoveryStatus]} variant="outline">
                {DISCOVERY_STATUS_LABELS[item.status as DiscoveryStatus]}
              </Badge>
              {isOficializado && item.unidade_gerada_id && (
                <Link to={`/unidades/${item.unidade_gerada_id}`} className="text-primary hover:underline">
                  → ver unidade gerada
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!readOnly && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-success text-success-foreground hover:bg-success/90" disabled={oficializando}>
                    <Check className="mr-2 h-4 w-4" />
                    {oficializando ? "Oficializando..." : "Oficializar como Unidade"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Oficializar “{item.nome}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os dados, médicos, contatos, parque instalado e anotações
                      serão copiados para uma nova Unidade de Saúde com status “Lead”.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={oficializar}>Oficializar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive">
                    Descartar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Descartar este item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O item sairá da lista principal mas poderá ser recuperado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={descartar}>Descartar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isDescartado && (
            <Button variant="outline" onClick={ressuscitar}>
              <RotateCcw className="mr-2 h-4 w-4" /> Ressuscitar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="pessoas">
            Pessoas <span className="ml-1.5 text-xs opacity-60">{contatos.length + medicosVinc.length}</span>
          </TabsTrigger>
          <TabsTrigger value="parque">
            Parque <span className="ml-1.5 text-xs opacity-60">{parque.length}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline <span className="ml-1.5 text-xs opacity-60">{anotacoes.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* === DADOS === */}
        <TabsContent value="dados">
          <Card className="border-dashed">
            <CardContent className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nome *</Label>
                  <Input value={item.nome ?? ""} onChange={(e) => setItem({ ...item, nome: e.target.value })} disabled={readOnly} /></div>
                <div className="space-y-2"><Label>CNPJ</Label>
                  <Input value={item.cnpj ?? ""} onChange={(e) => setItem({ ...item, cnpj: e.target.value })} disabled={readOnly} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Tipo</Label>
                  <Select value={item.tipo_id ?? ""} onValueChange={(v) => setItem({ ...item, tipo_id: v })} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Estado</Label>
                  <Select value={item.estado_id ?? ""} onValueChange={(v) => setItem({ ...item, estado_id: v })} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{estados.map((uf) => <SelectItem key={uf.id} value={uf.id}>{uf.sigla}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Porte</Label>
                  <Select value={item.porte ?? ""} onValueChange={(v) => setItem({ ...item, porte: v })} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pequeno">Pequeno</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Grande">Grande</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Cidade</Label>
                  <Input value={item.cidade ?? ""} onChange={(e) => setItem({ ...item, cidade: e.target.value })} disabled={readOnly} /></div>
                <div className="space-y-2"><Label>Endereço</Label>
                  <Input value={item.endereco ?? ""} onChange={(e) => setItem({ ...item, endereco: e.target.value })} disabled={readOnly} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Telefone</Label>
                  <Input value={item.telefone ?? ""} onChange={(e) => setItem({ ...item, telefone: e.target.value })} disabled={readOnly} /></div>
                <div className="space-y-2"><Label>Email</Label>
                  <Input value={item.email ?? ""} onChange={(e) => setItem({ ...item, email: e.target.value })} disabled={readOnly} /></div>
                <div className="space-y-2"><Label>Site</Label>
                  <Input value={item.site ?? ""} onChange={(e) => setItem({ ...item, site: e.target.value })} disabled={readOnly} /></div>
              </div>
              <div className="space-y-2">
                <Label>Informações adicionais
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (dados brutos não classificados)
                  </span>
                </Label>
                <Textarea rows={6} value={item.informacoes_adicionais ?? ""}
                  onChange={(e) => setItem({ ...item, informacoes_adicionais: e.target.value })}
                  className="bg-muted/30 font-mono text-xs" disabled={readOnly} />
              </div>
              {!readOnly && (
                <div className="flex justify-end">
                  <Button onClick={salvar} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar dados"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PESSOAS === */}
        <TabsContent value="pessoas" className="space-y-6">
          {/* Contatos */}
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Contatos ({contatos.length})
                </h3>
                {!readOnly && (
                  <Dialog open={contatoOpen} onOpenChange={setContatoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo contato</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-2"><Label>Nome *</Label>
                          <Input value={contatoNovo.nome} onChange={(e) => setContatoNovo({ ...contatoNovo, nome: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2"><Label>Cargo</Label>
                            <Input value={contatoNovo.cargo} onChange={(e) => setContatoNovo({ ...contatoNovo, cargo: e.target.value })} /></div>
                          <div className="space-y-2"><Label>Papel</Label>
                            <Select value={contatoNovo.papel_id} onValueChange={(v) => setContatoNovo({ ...contatoNovo, papel_id: v })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{papeis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                            </Select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2"><Label>Telefone</Label>
                            <Input value={contatoNovo.telefone} onChange={(e) => setContatoNovo({ ...contatoNovo, telefone: e.target.value })} /></div>
                          <div className="space-y-2"><Label>Email</Label>
                            <Input value={contatoNovo.email} onChange={(e) => setContatoNovo({ ...contatoNovo, email: e.target.value })} /></div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={addContato} disabled={!contatoNovo.nome.trim()}>Adicionar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {contatos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum contato adicionado.</p>
              ) : (
                <div className="space-y-2">
                  {contatos.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex-1">
                        <div className="font-medium">{c.nome}
                          {c.papeis_contato?.nome && <Badge variant="secondary" className="ml-2 text-xs">{c.papeis_contato.nome}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                          {c.cargo && <span>{c.cargo}</span>}
                          {c.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                          {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                      </div>
                      {!readOnly && (
                        <Button size="icon" variant="ghost" onClick={() => removeContato(c.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Médicos */}
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" /> Médicos vinculados ({medicosVinc.length})
                </h3>
                {!readOnly && (
                  <Dialog open={medicoOpen} onOpenChange={setMedicoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Vincular médico</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Vincular médico</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-2"><Label>Médico *</Label>
                          <Select value={medicoSel} onValueChange={setMedicoSel}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {medicosDisponiveis.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  Dr. {m.nome}{m.especialidade ? ` · ${m.especialidade}` : ""}
                                </SelectItem>
                              ))}
                              {medicosDisponiveis.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground">Todos os médicos já vinculados.</div>
                              )}
                            </SelectContent>
                          </Select></div>
                        <div className="space-y-2"><Label>Papel</Label>
                          <Select value={medicoPapel} onValueChange={setMedicoPapel}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>{papeis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                          </Select></div>
                      </div>
                      <DialogFooter>
                        <Button onClick={vincularMedico} disabled={!medicoSel}>Vincular</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {medicosVinc.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum médico vinculado.</p>
              ) : (
                <div className="space-y-2">
                  {medicosVinc.map((mv: any) => (
                    <div key={mv.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div>
                        <Link to={`/medicos/${mv.medicos?.id}`} className="font-medium hover:text-primary">
                          Dr. {mv.medicos?.nome}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {mv.medicos?.especialidade}
                          {mv.papeis_contato?.nome && (
                            <Badge variant="secondary" className="ml-2 text-xs">{mv.papeis_contato.nome}</Badge>
                          )}
                        </div>
                      </div>
                      {!readOnly && (
                        <Button size="icon" variant="ghost" onClick={() => removerMedico(mv.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PARQUE === */}
        <TabsContent value="parque">
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Parque instalado ({parque.length})
                </h3>
                {!readOnly && (
                  <Dialog open={parqueOpen} onOpenChange={setParqueOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Adicionar equipamento</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-2"><Label>Linha</Label>
                          <Select value={parqueNovo.linha_id} onValueChange={(v) => setParqueNovo({ ...parqueNovo, linha_id: v })}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>{linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div className="space-y-2"><Label>Descrição</Label>
                          <Input value={parqueNovo.descricao} onChange={(e) => setParqueNovo({ ...parqueNovo, descricao: e.target.value })} placeholder="Ex: Tomógrafo Siemens Somatom" /></div>
                        <div className="space-y-2"><Label>Quantidade</Label>
                          <Input type="number" min={1} value={parqueNovo.quantidade}
                            onChange={(e) => setParqueNovo({ ...parqueNovo, quantidade: Number(e.target.value) })} /></div>
                        <div className="space-y-2"><Label>Observações</Label>
                          <Textarea rows={2} value={parqueNovo.observacoes}
                            onChange={(e) => setParqueNovo({ ...parqueNovo, observacoes: e.target.value })} /></div>
                      </div>
                      <DialogFooter>
                        <Button onClick={addParque}>Adicionar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {parque.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum equipamento registrado.</p>
              ) : (
                <div className="space-y-2">
                  {parque.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {p.linhas_produto?.nome && (
                            <Badge variant="outline" style={{ borderColor: p.linhas_produto.cor, color: p.linhas_produto.cor }}>
                              {p.linhas_produto.nome}
                            </Badge>
                          )}
                          <span className="font-medium text-sm">{p.descricao || "—"}</span>
                          <span className="text-xs text-muted-foreground">× {p.quantidade}</span>
                        </div>
                        {p.observacoes && <div className="text-xs text-muted-foreground mt-1">{p.observacoes}</div>}
                      </div>
                      {!readOnly && (
                        <Button size="icon" variant="ghost" onClick={() => removeParque(p.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TIMELINE === */}
        <TabsContent value="timeline">
          <Card className="border-dashed">
            <CardContent className="p-6 space-y-4">
              {!readOnly && (
                <form onSubmit={addAnotacao} className="space-y-3 pb-4 border-b">
                  <Textarea
                    rows={3}
                    placeholder="Nova anotação... (ex: visita realizada, conversa com diretor, próximos passos)"
                    value={novaAnot}
                    onChange={(e) => setNovaAnot(e.target.value)}
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Próximo contato (opcional)</Label>
                      <Input type="datetime-local" value={proxContato}
                        onChange={(e) => setProxContato(e.target.value)} className="w-auto" />
                    </div>
                    <Button type="submit" disabled={!novaAnot.trim()}>
                      <Plus className="mr-1 h-4 w-4" /> Adicionar
                    </Button>
                    {proxContato && (
                      <span className="text-xs text-muted-foreground">
                        Uma tarefa de follow-up será criada automaticamente.
                      </span>
                    )}
                  </div>
                </form>
              )}

              {anotacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma anotação ainda.</p>
              ) : (
                <div className="space-y-3">
                  {anotacoes.map((a) => (
                    <div key={a.id} className="flex gap-4">
                      <div className="text-xs text-muted-foreground text-right w-24 flex-shrink-0 pt-2">
                        {format(new Date(a.created_at), "dd MMM yyyy", { locale: ptBR })}
                        <div className="opacity-60">{format(new Date(a.created_at), "HH:mm")}</div>
                      </div>
                      <div className="flex-1 rounded-md border bg-card p-3">
                        <div className="text-xs text-muted-foreground mb-1">{a.profiles?.nome ?? "—"}</div>
                        <div className="text-sm whitespace-pre-wrap">{a.texto}</div>
                        {a.proximo_contato && (
                          <div className="mt-2 text-xs text-primary inline-flex items-center gap-1">
                            ⏰ Follow-up: {format(new Date(a.proximo_contato), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
