/**
 * Página de detalhe de uma Saída Advance (modelo v2 — 7 áreas).
 *
 * Cada área tem campos e regra de conclusão próprios (nada de checkbox
 * livre): Margem, Crédito, Legal, Faturamento, Logística,
 * Instalação/Aplicação (verificada no Pós-Venda) e NPS (respondida pelo
 * cliente via link externo /nps/:token).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/crm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Save, CheckCircle2, Clock, Paperclip, FileText, Download,
  AlertTriangle, Loader2, Camera, Copy, ExternalLink, RefreshCw, Star,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AREAS_ADVANCE, TOTAL_AREAS, areaEstaConcluida, type ChaveArea,
} from "@/services/saidaAdvanceService";

// ---------------------------------------------------------------------------
const TIPO_OPTIONS = [
  { value: "venda",        label: "Venda" },
  { value: "demonstracao", label: "Demonstração" },
  { value: "comodato",     label: "Comodato" },
  { value: "locacao",      label: "Locação" },
  { value: "troca",        label: "Troca" },
];

const FORMA_LABELS: Record<string, string> = {
  a_vista_cartao:        "À Vista / Cartão",
  financiado_interno:    "Financiado Interno",
  financiamento_externo: "Financiamento Externo",
};

// ---------------------------------------------------------------------------
export default function VendasAdvanceDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole, isAdminOrGerente } = useAuth();

  const canEdit = hasRole("admin") || hasRole("equipe_advance");

  const [saida, setSaida] = useState<any>(null);
  const [deal, setDeal] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [analise, setAnalise] = useState<any>(null);
  const [pesquisa, setPesquisa] = useState<any>(null);
  const [posVenda, setPosVenda] = useState<{ instalacao: any; aplicacao: any } | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos do cabeçalho comercial
  type TipoSaida = "venda" | "demonstracao" | "comodato" | "locacao" | "troca";
  const [tipoSaida, setTipoSaida] = useState<TipoSaida | "">("");
  const [idOlist, setIdOlist] = useState("");
  const [propostaOlist, setPropostaOlist] = useState("");
  const [pedidoOlist, setPedidoOlist] = useState("");
  const [obsGerais, setObsGerais] = useState("");

  // Estado por área: dados_extras e observação
  const [dadosAreas, setDadosAreas] = useState<Record<string, any>>({});
  const [obsAreas, setObsAreas] = useState<Record<string, string>>({});

  // UI
  const [salvando, setSalvando] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [openFinalizar, setOpenFinalizar] = useState(false);
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);
  const [verificandoPosVenda, setVerificandoPosVenda] = useState(false);
  const [gerandoPesquisa, setGerandoPesquisa] = useState(false);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);

    const [{ data: saidaData }, { data: areasData }, { data: anexosData }, { data: pesquisaData }] =
      await Promise.all([
        supabase
          .from("saidas_advance")
          .select(`*, deals(*, unidades_saude(nome), linhas_produto(nome, cor), profiles!deals_vendedor_profile_fkey(nome)), unidade:unidades_saude(nome), linha:linhas_produto(nome, cor)`)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("saidas_advance_itens")
          .select("*")
          .eq("saida_id", id)
          .order("ordem"),
        supabase
          .from("saidas_advance_anexos")
          .select("*")
          .eq("saida_id", id)
          .order("anexado_em", { ascending: false }),
        (supabase as any)
          .from("nps_pesquisas")
          .select("*")
          .eq("saida_id", id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (!saidaData) { toast.error("Saída não encontrada"); navigate("/vendas-advance"); return; }

    setSaida(saidaData);
    // Saída avulsa (sem deal): monta um "deal" sintético a partir dos campos manuais
    setDeal(
      saidaData.deals ?? {
        titulo: saidaData.titulo,
        valor_total: saidaData.valor_total,
        forma_pagamento: saidaData.forma_pagamento,
        unidades_saude: saidaData.unidade ?? null,
        linhas_produto: saidaData.linha ?? null,
        profiles: null,
      }
    );
    setAreas(areasData ?? []);
    setAnexos(anexosData ?? []);
    setPesquisa(pesquisaData ?? null);

    setTipoSaida(saidaData.tipo_saida ?? "");
    setIdOlist(saidaData.id_olist ?? "");
    setPropostaOlist(saidaData.proposta_olist ?? "");
    setPedidoOlist(saidaData.pedido_olist ?? "");
    setObsGerais(saidaData.observacoes_gerais ?? "");

    const dadosMap: Record<string, any> = {};
    const obsMap: Record<string, string> = {};
    (areasData ?? []).forEach((a: any) => {
      dadosMap[a.chave_item] = a.dados_extras ?? {};
      if (a.observacao) obsMap[a.chave_item] = a.observacao;
    });
    setDadosAreas(dadosMap);
    setObsAreas(obsMap);

    // Análise de crédito semeada na área de crédito
    const analiseCreditoId = dadosMap["credito"]?.analise_credito_id;
    if (analiseCreditoId) {
      const { data: an } = await supabase
        .from("analises_credito")
        .select("*")
        .eq("id", analiseCreditoId)
        .maybeSingle();
      setAnalise(an);
    }

    setLoading(false);

    // Verificação assíncrona da área 6 (não bloqueia a renderização)
    void verificarPosVenda(saidaData, areasData ?? []);
  }

  // ---------------------------------------------------------------------------
  // Área 6 — consulta instalação e aplicação no Pós-Venda
  async function verificarPosVenda(saidaAtual?: any, areasAtuais?: any[]) {
    const s = saidaAtual ?? saida;
    if (!s) return;
    const dealId = s.deal_id;
    const unidadeId = s.deals?.unidade_id ?? s.unidade_id;
    if (!dealId && !unidadeId) { setPosVenda({ instalacao: null, aplicacao: null }); return; }

    setVerificandoPosVenda(true);
    let query = supabase
      .from("instalacoes")
      .select("id, tipo, status, data_prevista, data_conclusao")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    query = dealId ? query.eq("deal_id", dealId) : query.eq("unidade_id", unidadeId);
    const { data } = await query;

    const instalacao = (data ?? []).find((i: any) => i.tipo === "instalacao") ?? null;
    const aplicacao = (data ?? []).find((i: any) => i.tipo === "aplicacao") ?? null;
    setPosVenda({ instalacao, aplicacao });

    // Conclui a área automaticamente quando as duas existem
    const lista = areasAtuais ?? areas;
    const area = lista.find((a: any) => a.chave_item === "instalacao_aplicacao");
    if (area && instalacao && aplicacao && !area.concluido && canEdit && s.status !== "finalizado") {
      const extras = { instalacao_id: instalacao.id, aplicacao_id: aplicacao.id };
      await supabase.from("saidas_advance_itens").update({
        dados_extras: extras,
        concluido: true,
        concluido_por: user?.id ?? null,
        concluido_em: new Date().toISOString(),
      }).eq("id", area.id);
      setAreas((prev) => prev.map((a) =>
        a.id === area.id ? { ...a, dados_extras: extras, concluido: true } : a
      ));
      setDadosAreas((prev) => ({ ...prev, instalacao_aplicacao: extras }));
      toast.success("Instalação e aplicação confirmadas no Pós-Venda ✓");
    }
    setVerificandoPosVenda(false);
  }

  // ---------------------------------------------------------------------------
  // Salvar campos do cabeçalho (blur / botão)
  const salvarCabecalho = useCallback(async () => {
    if (!id || !canEdit) return;
    await supabase.from("saidas_advance").update({
      tipo_saida: tipoSaida || null,
      id_olist: idOlist || null,
      proposta_olist: propostaOlist || null,
      pedido_olist: pedidoOlist || null,
      observacoes_gerais: obsGerais || null,
    }).eq("id", id);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
  }, [id, canEdit, tipoSaida, idOlist, propostaOlist, pedidoOlist, obsGerais]);

  async function salvarTudo() {
    setSalvando(true);
    await salvarCabecalho();
    setSalvando(false);
  }

  // ---------------------------------------------------------------------------
  // Salva os dados de uma área e recalcula sua conclusão.
  // temAnexoOverride: usado logo após um upload, quando o estado `anexos`
  // do closure ainda não reflete o anexo recém-inserido.
  async function salvarArea(chave: ChaveArea, novosDados: any, temAnexoOverride?: boolean) {
    if (!canEdit) return;
    const area = areas.find((a) => a.chave_item === chave);
    if (!area) return;

    const temAnexo = temAnexoOverride ?? anexos.some((a) => a.item_chave === chave);
    const concluido = areaEstaConcluida(chave, novosDados, temAnexo);
    const mudouConclusao = concluido !== !!area.concluido;

    const { error } = await supabase.from("saidas_advance_itens").update({
      dados_extras: novosDados,
      concluido,
      concluido_por: concluido ? (area.concluido_por ?? user?.id ?? null) : null,
      concluido_em: concluido ? (area.concluido_em ?? new Date().toISOString()) : null,
    }).eq("id", area.id);
    if (error) { toast.error(error.message); return; }

    setDadosAreas((prev) => ({ ...prev, [chave]: novosDados }));
    setAreas((prev) => prev.map((a) =>
      a.id === area.id
        ? { ...a, dados_extras: novosDados, concluido, concluido_em: concluido ? (a.concluido_em ?? new Date().toISOString()) : null }
        : a
    ));
    if (mudouConclusao && concluido) {
      toast.success(`Área ${AREAS_ADVANCE.find((m) => m.chave === chave)?.titulo} concluída ✓`, { duration: 1800 });
    }
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
  }

  // Salvar observação de uma área (blur)
  async function salvarObsArea(chave: string) {
    if (!canEdit) return;
    const area = areas.find((a) => a.chave_item === chave);
    if (!area) return;
    await supabase.from("saidas_advance_itens")
      .update({ observacao: obsAreas[chave] || null })
      .eq("id", area.id);
  }

  // ---------------------------------------------------------------------------
  // Upload de anexo de uma área + recálculo da conclusão
  async function handleUpload(chave: ChaveArea, arquivo: File) {
    if (!user || !canEdit || !id) return;
    setUploadingArea(chave);

    const path = `saidas-advance/${id}/${Date.now()}-${arquivo.name}`;
    const { error: upErr } = await supabase.storage
      .from("advance-anexos")
      .upload(path, arquivo, { upsert: false });

    if (upErr) { toast.error("Erro no upload: " + upErr.message); setUploadingArea(null); return; }

    // Bucket é privado: guardamos o CAMINHO do arquivo (não um link público).
    const { data: novoAnexo, error: insErr } = await supabase
      .from("saidas_advance_anexos")
      .insert({
        saida_id: id,
        item_chave: chave,
        nome_arquivo: arquivo.name,
        url: path,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type,
        anexado_por: user.id,
      })
      .select("*")
      .single();

    if (insErr) { toast.error(insErr.message); setUploadingArea(null); return; }

    const novaLista = [novoAnexo, ...anexos];
    setAnexos(novaLista);
    setUploadingArea(null);
    toast.success("Anexo salvo");

    // Margem e Legal concluem com anexo — recalcula
    if (chave === "margem" || chave === "legal") {
      const area = areas.find((a) => a.chave_item === chave);
      if (area) {
        const dados = dadosAreas[chave] ?? {};
        const concluido = areaEstaConcluida(chave, dados, true);
        if (concluido !== !!area.concluido) await salvarArea(chave, dados, true);
      }
    }
  }

  // Abre um anexo gerando uma URL assinada temporária (bucket privado)
  async function abrirAnexo(stored: string) {
    const marker = "/advance-anexos/";
    const i = stored.indexOf(marker);
    const path = i >= 0 ? stored.slice(i + marker.length) : stored;
    const { data, error } = await supabase.storage
      .from("advance-anexos")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o anexo"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // ---------------------------------------------------------------------------
  // Área 7 — gerar pesquisa NPS (exige NF preenchida)
  async function gerarPesquisaNps() {
    if (!id || !user || !canEdit) return;
    setGerandoPesquisa(true);

    const nf = dadosAreas["faturamento"]?.numero_nf ?? null;
    const { data, error } = await (supabase as any)
      .from("nps_pesquisas")
      .insert({
        saida_id: id,
        unidade_id: saida?.deals?.unidade_id ?? saida?.unidade_id ?? null,
        cliente_nome: deal?.unidades_saude?.nome ?? deal?.titulo ?? null,
        nf_numero: nf,
        criado_por: user.id,
      })
      .select("*")
      .single();

    setGerandoPesquisa(false);
    if (error) { toast.error(error.message); return; }
    setPesquisa(data);
    toast.success("Pesquisa NPS gerada — envie o link ao cliente");
  }

  function copiarLinkNps() {
    if (!pesquisa) return;
    const link = `${window.location.origin}/nps/${pesquisa.token}`;
    void navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  // ---------------------------------------------------------------------------
  // Finalizar / reabrir saída
  const concluidasAreas = areas.filter((a) => a.concluido).length;

  async function handleFinalizar() {
    if (!id || !user) return;
    if (!tipoSaida) { toast.error("Defina o Tipo de Saída antes de finalizar"); return; }
    if (concluidasAreas < TOTAL_AREAS) {
      toast.error("Todas as áreas precisam estar concluídas para finalizar");
      return;
    }
    await supabase.from("saidas_advance").update({
      status: "finalizado",
      finalizado_em: new Date().toISOString(),
      finalizado_por: user.id,
      tipo_saida: tipoSaida,
    }).eq("id", id);
    toast.success("Saída finalizada! 🎉");
    setOpenFinalizar(false);
    void load();
  }

  async function handleReabrir() {
    if (!id || !hasRole("admin")) return;
    await supabase.from("saidas_advance").update({
      status: "em_andamento",
      finalizado_em: null,
      finalizado_por: null,
    }).eq("id", id);
    toast.success("Saída reaberta");
    void load();
  }

  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!saida) return null;

  const isFinalizado = saida.status === "finalizado";
  const podeEditar = canEdit && !isFinalizado;
  const forma = dadosAreas["credito"]?.forma_pagamento ?? deal?.forma_pagamento ?? saida.forma_pagamento;

  return (
    <div className="relative pb-20">
      {/* ── CABEÇALHO STICKY ── */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/vendas-advance")} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base truncate">
                {deal?.unidades_saude?.nome ?? deal?.titulo}
              </span>
              <span className="text-sm text-muted-foreground hidden md:block">·</span>
              <span className="text-sm text-muted-foreground hidden md:block truncate">{deal?.titulo}</span>
              {isFinalizado ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Finalizado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Clock className="h-3 w-3" /> Em andamento
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
              <span>{deal?.linhas_produto?.nome}</span>
              <span className="font-mono font-semibold text-primary">{formatCurrency(deal?.valor_total)}</span>
              {forma && <span>{FORMA_LABELS[forma] ?? forma}</span>}
              <span className="font-semibold">{concluidasAreas}/{TOTAL_AREAS} áreas</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedIndicator && (
              <span className="text-xs text-green-600 font-medium">✓ Salvo</span>
            )}
            {podeEditar && (
              <Button variant="outline" size="sm" onClick={salvarTudo} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            )}
            {podeEditar && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setOpenFinalizar(true)}
                disabled={concluidasAreas < TOTAL_AREAS}
                title={concluidasAreas < TOTAL_AREAS ? "Conclua as 7 áreas para finalizar" : undefined}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar Saída
              </Button>
            )}
            {hasRole("admin") && isFinalizado && (
              <Button variant="outline" size="sm" onClick={handleReabrir}>
                Reabrir Saída
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="flex gap-6 p-6">
        {/* Coluna principal */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Dados comerciais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Saída</Label>
                <Select
                  value={tipoSaida}
                  onValueChange={(v) => setTipoSaida(v as TipoSaida)}
                  disabled={!podeEditar}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ID OLIST</Label>
                <Input value={idOlist} onChange={(e) => setIdOlist(e.target.value)} onBlur={salvarCabecalho} disabled={!podeEditar} placeholder="OL-10001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Proposta OLIST</Label>
                <Input value={propostaOlist} onChange={(e) => setPropostaOlist(e.target.value)} onBlur={salvarCabecalho} disabled={!podeEditar} placeholder="PROP-2024-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pedido OLIST</Label>
                <Input value={pedidoOlist} onChange={(e) => setPedidoOlist(e.target.value)} onBlur={salvarCabecalho} disabled={!podeEditar} placeholder="PED-2024-001" />
              </div>
            </CardContent>
          </Card>

          {/* ── AS 7 ÁREAS ── */}
          {AREAS_ADVANCE.map((meta) => {
            const area = areas.find((a) => a.chave_item === meta.chave);
            if (!area) return null;
            const anexosArea = anexos.filter((a) => a.item_chave === meta.chave);
            const dados = dadosAreas[meta.chave] ?? {};

            return (
              <Card key={meta.chave} id={`area-${meta.chave}`} className={area.concluido ? "border-green-300 bg-green-50/40" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.cor}`} />
                      <CardTitle className="text-base truncate">{meta.ordem}. {meta.titulo}</CardTitle>
                    </div>
                    {area.concluido ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Clock className="h-3 w-3" /> Pendente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.descricao}</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">

                  {meta.chave === "margem" && (
                    <MargemArea
                      dados={dados}
                      onSave={(d) => salvarArea("margem", d)}
                      disabled={!podeEditar}
                    />
                  )}

                  {meta.chave === "credito" && (
                    <CreditoArea
                      dados={dados}
                      analise={analise}
                      onSave={(d) => salvarArea("credito", d)}
                      disabled={!podeEditar}
                    />
                  )}

                  {meta.chave === "legal" && (
                    <LegalArea
                      dados={dados}
                      temAnexo={anexosArea.length > 0}
                      onSave={(d) => salvarArea("legal", d)}
                      disabled={!podeEditar}
                    />
                  )}

                  {meta.chave === "faturamento" && (
                    <FaturamentoArea
                      dados={dados}
                      onSave={(d) => salvarArea("faturamento", d)}
                      disabled={!podeEditar}
                    />
                  )}

                  {meta.chave === "logistica" && (
                    <LogisticaArea
                      dados={dados}
                      onSave={(d) => salvarArea("logistica", d)}
                      disabled={!podeEditar}
                    />
                  )}

                  {meta.chave === "instalacao_aplicacao" && (
                    <InstalacaoArea
                      posVenda={posVenda}
                      verificando={verificandoPosVenda}
                      semVinculo={!saida.deal_id && !(saida.deals?.unidade_id ?? saida.unidade_id)}
                      onVerificar={() => verificarPosVenda()}
                    />
                  )}

                  {meta.chave === "nps" && (
                    <NpsArea
                      pesquisa={pesquisa}
                      nfPreenchida={!!String(dadosAreas["faturamento"]?.numero_nf ?? "").trim()}
                      gerando={gerandoPesquisa}
                      onGerar={gerarPesquisaNps}
                      onCopiar={copiarLinkNps}
                      disabled={!podeEditar}
                    />
                  )}

                  {/* Anexos da área (margem = imagem; legal = pdf/imagem; faturamento = fotos) */}
                  {(meta.chave === "margem" || meta.chave === "legal" || meta.chave === "faturamento") && (
                    <AnexosArea
                      anexos={anexosArea}
                      canEdit={podeEditar}
                      uploading={uploadingArea === meta.chave}
                      accept={meta.chave === "legal" ? ".pdf,image/*" : "image/*"}
                      capture={meta.chave === "faturamento"}
                      label={
                        meta.chave === "margem" ? "Anexar imagem da margem"
                        : meta.chave === "legal" ? "Anexar comprovação"
                        : "Adicionar foto da caixa"
                      }
                      onUpload={(f) => handleUpload(meta.chave, f)}
                      onOpen={abrirAnexo}
                    />
                  )}

                  {/* Observação da área */}
                  <Textarea
                    placeholder="Observação (opcional)..."
                    className="text-xs resize-none min-h-[48px]"
                    value={obsAreas[meta.chave] ?? ""}
                    onChange={(e) => setObsAreas((p) => ({ ...p, [meta.chave]: e.target.value }))}
                    onBlur={() => salvarObsArea(meta.chave)}
                    disabled={!podeEditar}
                  />

                  {area.concluido && area.concluido_em && (
                    <div className="text-[10px] text-muted-foreground">
                      Concluída em {format(new Date(area.concluido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Observações gerais */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações gerais desta saída..."
                className="min-h-[100px]"
                value={obsGerais}
                onChange={(e) => setObsGerais(e.target.value)}
                onBlur={salvarCabecalho}
                disabled={!podeEditar}
              />
            </CardContent>
          </Card>
        </div>

        {/* TOC lateral (oculto em mobile) */}
        <div className="hidden xl:block w-52 shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Áreas</p>
            {AREAS_ADVANCE.map((meta) => {
              const area = areas.find((a) => a.chave_item === meta.chave);
              return (
                <button
                  key={meta.chave}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    document.getElementById(`area-${meta.chave}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${meta.cor}`} />
                    <span className="truncate">{meta.titulo}</span>
                  </span>
                  {area?.concluido
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Finalizar */}
      <Dialog open={openFinalizar} onOpenChange={setOpenFinalizar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Saída</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {concluidasAreas} de {TOTAL_AREAS} áreas concluídas.
            </p>
            {concluidasAreas < TOTAL_AREAS && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Pendentes: {AREAS_ADVANCE
                    .filter((m) => !areas.find((a) => a.chave_item === m.chave)?.concluido)
                    .map((m) => m.titulo)
                    .join(", ")}
                </span>
              </div>
            )}
            {!tipoSaida && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                Defina o Tipo de Saída antes de finalizar.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenFinalizar(false)}>Cancelar</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleFinalizar}
              disabled={!tipoSaida || concluidasAreas < TOTAL_AREAS}
            >
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Áreas — sub-componentes
// ---------------------------------------------------------------------------

// 1. Margem: campo da margem + (anexo de imagem tratado pelo AnexosArea)
function MargemArea({ dados, onSave, disabled }: {
  dados: any; onSave: (d: any) => void; disabled: boolean;
}) {
  const [margem, setMargem] = useState(dados.margem ?? "");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Margem (%) *</Label>
        <Input
          value={margem}
          onChange={(e) => setMargem(e.target.value)}
          onBlur={() => onSave({ ...dados, margem })}
          disabled={disabled}
          placeholder="Ex: 32,5"
        />
      </div>
    </div>
  );
}

// 2. Crédito: à vista → confirmar; financiado → colar token da análise
function CreditoArea({ dados, analise, onSave, disabled }: {
  dados: any; analise: any; onSave: (d: any) => void; disabled: boolean;
}) {
  const [token, setToken] = useState(dados.token ?? "");
  const aVista = dados.forma_pagamento === "a_vista_cartao";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Forma:</span>
        <Badge variant="outline" className="text-xs">
          {FORMA_LABELS[dados.forma_pagamento] ?? dados.forma_pagamento ?? "—"}
        </Badge>
        {dados.instituicao && (
          <span className="text-xs text-muted-foreground">· {dados.instituicao}</span>
        )}
      </div>

      {aVista ? (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={!!dados.a_vista_confirmado}
            onCheckedChange={(v) => onSave({ ...dados, a_vista_confirmado: !!v })}
            disabled={disabled}
            className="h-5 w-5"
          />
          Pagamento à vista confirmado
        </label>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Token de aprovação de crédito *</Label>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onBlur={() => onSave({ ...dados, token })}
            disabled={disabled}
            placeholder="Cole aqui o número da análise aprovada (ex: AC-2024-001)"
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            A análise precisa estar <strong>aprovada</strong> no sistema de crédito antes de colar o token.
          </p>
        </div>
      )}

      {analise && (
        <div className="rounded-md bg-muted/30 px-3 py-2 text-xs space-y-0.5">
          <div>
            <span className="text-muted-foreground">Análise vinculada:</span>{" "}
            <span className="font-medium">{analise.numero_analise}</span>{" "}
            <Badge
              variant="outline"
              className={`text-[10px] ${
                analise.status === "aprovado"
                  ? "text-green-700 border-green-300"
                  : "text-red-700 border-red-300"
              }`}
            >
              {analise.status}
            </Badge>
          </div>
          {analise.limite_aprovado != null && (
            <div>
              <span className="text-muted-foreground">Limite:</span>{" "}
              <span className="font-mono font-semibold">{formatCurrency(analise.limite_aprovado)}</span>
            </div>
          )}
          {analise.cliente_consultado && (
            <div className="text-muted-foreground">{analise.cliente_consultado}</div>
          )}
        </div>
      )}
    </div>
  );
}

// 3. Legal: empresa → anexo de comprovação; médico → CRM
function LegalArea({ dados, temAnexo, onSave, disabled }: {
  dados: any; temAnexo: boolean; onSave: (d: any) => void; disabled: boolean;
}) {
  const [crm, setCrm] = useState(dados.crm ?? "");
  const tipo = dados.tipo_cliente ?? "empresa";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tipo de comprador</Label>
        <Select
          value={tipo}
          onValueChange={(v) => onSave({ ...dados, tipo_cliente: v })}
          disabled={disabled}
        >
          <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="empresa">Empresa (PJ)</SelectItem>
            <SelectItem value="medico">Médico (PF)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tipo === "medico" ? (
        <div className="space-y-1">
          <Label className="text-xs">CRM do médico *</Label>
          <Input
            value={crm}
            onChange={(e) => setCrm(e.target.value)}
            onBlur={() => onSave({ ...dados, tipo_cliente: tipo, crm })}
            disabled={disabled}
            placeholder="Ex: CRM/BA 12345"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Anexe abaixo a comprovação de que a empresa pode comprar material médico.
          {temAnexo && <span className="text-green-600 font-medium"> Comprovação anexada ✓</span>}
        </p>
      )}
    </div>
  );
}

// 4. Faturamento: dados da NF (fotos tratadas pelo AnexosArea)
function FaturamentoArea({ dados, onSave, disabled }: {
  dados: any; onSave: (d: any) => void; disabled: boolean;
}) {
  const [nf, setNf] = useState(dados.numero_nf ?? "");
  const [data, setData] = useState(dados.data ?? "");
  const [valor, setValor] = useState(dados.valor?.toString() ?? "");
  const [difal, setDifal] = useState(dados.difal ?? "nao");

  function save(extra?: any) {
    onSave({ ...dados, numero_nf: nf, data, valor: valor ? Number(valor) : null, difal, ...extra });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="space-y-1">
        <Label className="text-[11px]">Nº NF *</Label>
        <Input className="h-8 text-xs" value={nf} onChange={(e) => setNf(e.target.value)} onBlur={() => save()} disabled={disabled} placeholder="000123" />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Data NF *</Label>
        <Input type="date" className="h-8 text-xs" value={data} onChange={(e) => setData(e.target.value)} onBlur={() => save()} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Valor (R$) *</Label>
        <Input type="number" step="0.01" className="h-8 text-xs font-mono" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={() => save()} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">DIFAL</Label>
        <Select value={difal} onValueChange={(v) => { setDifal(v); onSave({ ...dados, numero_nf: nf, data, valor: valor ? Number(valor) : null, difal: v }); }} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// 5. Logística: custo + concluir
function LogisticaArea({ dados, onSave, disabled }: {
  dados: any; onSave: (d: any) => void; disabled: boolean;
}) {
  const [custo, setCusto] = useState(dados.custo?.toString() ?? "");
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label className="text-xs">Custo da logística (R$) *</Label>
        <Input
          type="number"
          step="0.01"
          className="w-48 font-mono"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          onBlur={() => onSave({ ...dados, custo: custo ? Number(custo) : null })}
          disabled={disabled}
          placeholder="0,00"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
        <Checkbox
          checked={!!dados.concluido}
          onCheckedChange={(v) => onSave({ ...dados, custo: custo ? Number(custo) : null, concluido: !!v })}
          disabled={disabled}
          className="h-5 w-5"
        />
        Logística concluída
      </label>
    </div>
  );
}

// 6. Instalação e Aplicação: espelho do Pós-Venda (somente leitura)
function InstalacaoArea({ posVenda, verificando, semVinculo, onVerificar }: {
  posVenda: { instalacao: any; aplicacao: any } | null;
  verificando: boolean;
  semVinculo: boolean;
  onVerificar: () => void;
}) {
  if (semVinculo) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Saída sem cliente vinculado — não é possível localizar a instalação/aplicação no Pós-Venda.</span>
      </div>
    );
  }

  const linha = (rotulo: string, reg: any) => (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
      <span>{rotulo}</span>
      {reg ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
            <CheckCircle2 className="h-3 w-3" /> {reg.status ?? "registrada"}
          </Badge>
        </div>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> aguardando Pós-Venda
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {linha("Instalação", posVenda?.instalacao)}
      {linha("Aplicação", posVenda?.aplicacao)}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onVerificar} disabled={verificando}>
          {verificando
            ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Verificar novamente
        </Button>
        <Link to="/pos-venda" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Abrir Pós-Venda <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A área conclui automaticamente quando a instalação <strong>e</strong> a aplicação estiverem registradas no Pós-Venda.
      </p>
    </div>
  );
}

// 7. NPS: gerar link externo e acompanhar a resposta do cliente
function NpsArea({ pesquisa, nfPreenchida, gerando, onGerar, onCopiar, disabled }: {
  pesquisa: any;
  nfPreenchida: boolean;
  gerando: boolean;
  onGerar: () => void;
  onCopiar: () => void;
  disabled: boolean;
}) {
  if (!pesquisa) {
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" onClick={onGerar} disabled={disabled || gerando || !nfPreenchida}>
          {gerando ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Star className="h-4 w-4 mr-1.5" />}
          Gerar pesquisa NPS
        </Button>
        {!nfPreenchida && (
          <p className="text-[11px] text-muted-foreground">
            Preencha o número da Nota Fiscal (área Faturamento) para liberar a pesquisa.
          </p>
        )}
      </div>
    );
  }

  const link = `${window.location.origin}/nps/${pesquisa.token}`;
  const respondida = !!pesquisa.respondido_em;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input readOnly value={link} className="h-8 text-xs font-mono flex-1 min-w-[240px]" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="outline" size="sm" onClick={onCopiar}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
        </Button>
      </div>
      {respondida ? (
        <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span>
            Cliente respondeu em {format(new Date(pesquisa.respondido_em), "dd/MM/yyyy", { locale: ptBR })} — nota{" "}
            <strong className="text-base">{pesquisa.nota}</strong>
          </span>
          {pesquisa.comentario && (
            <span className="text-xs text-muted-foreground italic truncate">"{pesquisa.comentario}"</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-muted/40 border px-3 py-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          Envie o link ao cliente. A área conclui automaticamente quando ele responder.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anexos de uma área (imagem da margem, comprovação legal, fotos da caixa)
function AnexosArea({ anexos, canEdit, uploading, accept, capture, label, onUpload, onOpen }: {
  anexos: any[];
  canEdit: boolean;
  uploading: boolean;
  accept: string;
  capture?: boolean;
  label: string;
  onUpload: (f: File) => void;
  onOpen: (stored: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      {anexos.length > 0 && (
        <div className="space-y-1">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded border bg-card px-2 py-1 text-xs">
              {a.tipo_mime?.startsWith("image/")
                ? <Camera className="h-3 w-3 text-muted-foreground shrink-0" />
                : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
              <span className="flex-1 truncate">{a.nome_arquivo}</span>
              <span className="text-muted-foreground shrink-0">
                {(a.tamanho_bytes / 1024).toFixed(0)} KB
              </span>
              <button type="button" onClick={() => onOpen(a.url)} title="Abrir" className="shrink-0">
                <Download className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            {...(capture ? { capture: "environment" } : {})}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : capture ? (
              <Camera className="h-3 w-3" />
            ) : (
              <Paperclip className="h-3 w-3" />
            )}
            {uploading ? "Enviando..." : label}
          </Button>
        </>
      )}
    </div>
  );
}
