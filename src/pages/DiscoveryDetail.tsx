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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, Search as SearchIcon, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DISCOVERY_STATUS_LABELS, DISCOVERY_STATUS_BADGE, DiscoveryStatus } from "@/lib/crm";

export default function DiscoveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [tipos, setTipos] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [oficializando, setOficializando] = useState(false);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    if (!id) return;
    const [d, t, e] = await Promise.all([
      supabase.from("discovery")
        .select("*, tipos_unidade(id, nome), estados(id, sigla)")
        .eq("id", id).maybeSingle(),
      supabase.from("tipos_unidade").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("estados").select("id, sigla, nome").is("archived_at", null).order("sigla"),
    ]);
    setItem(d.data);
    setTipos(t.data ?? []);
    setEstados(e.data ?? []);
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
      // 1. tipo enum derivado
      const tipoNome = (tipos.find((t) => t.id === item.tipo_id)?.nome ?? "").toLowerCase();
      const tipoEnum: any = tipoNome.includes("hospital") ? "hospital"
        : tipoNome.includes("clín") ? "clinica"
        : tipoNome.includes("ubs") ? "ubs"
        : tipoNome.includes("labora") ? "laboratorio" : "outro";

      // 2. cria unidade
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

      // 3. migra médicos vinculados
      const { data: meds } = await supabase.from("medico_discovery")
        .select("medico_id, papel_id").eq("discovery_id", item.id);
      if (meds && meds.length > 0) {
        const rows = meds.map((m) => ({
          medico_id: m.medico_id, unidade_id: unidade.id, papel_id: m.papel_id,
        }));
        await supabase.from("medico_unidades").insert(rows);
      }

      // 4. migra contatos (troca discovery_id por unidade_id)
      await supabase.from("contatos")
        .update({ discovery_id: null, unidade_id: unidade.id })
        .eq("discovery_id", item.id);

      // 5. migra parque
      await supabase.from("parque_instalado")
        .update({ discovery_id: null, unidade_id: unidade.id })
        .eq("discovery_id", item.id);

      // 6. copia anotações
      const { data: anots } = await supabase.from("anotacoes")
        .select("autor_id, texto, proximo_contato").eq("discovery_id", item.id);
      if (anots && anots.length > 0) {
        const rows = anots.map((a) => ({
          autor_id: a.autor_id, texto: a.texto,
          proximo_contato: a.proximo_contato, unidade_id: unidade.id,
        }));
        await supabase.from("anotacoes").insert(rows);
      }

      // 7. fecha discovery
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

  if (!item) return <div className="p-6">Carregando...</div>;

  const isDescartado = item.status === "descartado";
  const isOficializado = item.status === "oficializado";

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
          {!isOficializado && !isDescartado && (
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

      {/* Form Dados */}
      <Card className="border-dashed">
        <CardContent className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nome *</Label>
              <Input value={item.nome ?? ""} onChange={(e) => setItem({ ...item, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label>
              <Input value={item.cnpj ?? ""} onChange={(e) => setItem({ ...item, cnpj: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={item.tipo_id ?? ""} onValueChange={(v) => setItem({ ...item, tipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Estado</Label>
              <Select value={item.estado_id ?? ""} onValueChange={(v) => setItem({ ...item, estado_id: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{estados.map((uf) => <SelectItem key={uf.id} value={uf.id}>{uf.sigla}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Porte</Label>
              <Select value={item.porte ?? ""} onValueChange={(v) => setItem({ ...item, porte: v })}>
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
              <Input value={item.cidade ?? ""} onChange={(e) => setItem({ ...item, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>Endereço</Label>
              <Input value={item.endereco ?? ""} onChange={(e) => setItem({ ...item, endereco: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={item.telefone ?? ""} onChange={(e) => setItem({ ...item, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label>
              <Input value={item.email ?? ""} onChange={(e) => setItem({ ...item, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Site</Label>
              <Input value={item.site ?? ""} onChange={(e) => setItem({ ...item, site: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Informações adicionais
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (dados brutos não classificados)
              </span>
            </Label>
            <Textarea rows={6} value={item.informacoes_adicionais ?? ""}
              onChange={(e) => setItem({ ...item, informacoes_adicionais: e.target.value })}
              className="bg-muted/30 font-mono text-xs" />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Abas Parque, Pessoas e Timeline serão entregues nas próximas fases.
      </p>
    </div>
  );
}
