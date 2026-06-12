/**
 * Página de detalhe de uma Saída Advance.
 * Cobre: Cabeçalho sticky, campos comerciais, 4 blocos de checklist,
 * observações gerais, sistema de anexos PDF, finalizar/reabrir,
 * cross-check com Pós-Venda.
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
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Save, CheckCircle2, Clock, Paperclip, FileText, Download,
  ChevronDown, ChevronRight, Info, AlertTriangle, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
const TIPO_OPTIONS = [
  { value: "venda",       label: "Venda" },
  { value: "demonstracao",label: "Demonstração" },
  { value: "comodato",    label: "Comodato" },
  { value: "locacao",     label: "Locação" },
  { value: "troca",       label: "Troca" },
];

const FORMA_LABELS: Record<string, string> = {
  a_vista_cartao:        "À Vista / Cartão",
  financiado_interno:    "Financiado Interno",
  financiamento_externo: "Financiamento Externo",
};

const BLOCO_META: Array<{
  chave: string;
  titulo: string;
  itens: Array<{ chave: string; label: string; temCamposExtras?: boolean; tipo?: string }>;
}> = [
  {
    chave: "cadastro",
    titulo: "Cadastro",
    itens: [
      { chave: "cadastro_completo_cliente", label: "Cadastro Completo Cliente (Pop1)" },
      { chave: "checagem_regulatoria",      label: "Checagem Regulatória (Pop2)" },
    ],
  },
  {
    chave: "margem_financeiro",
    titulo: "Margem e Financeiro",
    itens: [
      { chave: "validacao_margem",    label: "Validação da Margem (Form 1 anexado)" },
      { chave: "financiamento",       label: "Financiamento", temCamposExtras: true, tipo: "financiamento" },
      { chave: "validacao_pagamento", label: "Validação de Pagamento" },
    ],
  },
  {
    chave: "faturamento",
    titulo: "Faturamento",
    itens: [
      { chave: "validacao_estoque_lotes", label: "Validação Estoque e Lotes" },
      { chave: "inspecao_saida",          label: "Inspeção de Saída" },
      { chave: "upload_fotos",            label: "Upload de Fotos" },
      { chave: "nota_fiscal",             label: "Nota Fiscal", temCamposExtras: true, tipo: "nota_fiscal" },
    ],
  },
  {
    chave: "logistica",
    titulo: "Logística",
    itens: [
      { chave: "transportadora",       label: "Transportadora", temCamposExtras: true, tipo: "transportadora" },
      { chave: "abrir_contas_pagar",   label: "Abrir Contas a Pagar" },
    ],
  },
];

// ---------------------------------------------------------------------------
export default function VendasAdvanceDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole, isAdminOrGerente } = useAuth();

  const canEdit = hasRole("admin") || hasRole("equipe_advance");
  const canView = isAdminOrGerente || hasRole("equipe_advance") || hasRole("pos_venda");

  const [saida, setSaida] = useState<any>(null);
  const [deal, setDeal] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [posVenda, setPosVenda] = useState<any>(null);
  const [analise, setAnalise] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Campos do formulário
  type TipoSaida = "venda" | "demonstracao" | "comodato" | "locacao" | "troca";
  const [tipoSaida, setTipoSaida] = useState<TipoSaida | "">("");
  const [idOlist, setIdOlist] = useState("");
  const [propostaOlist, setPropostaOlist] = useState("");
  const [pedidoOlist, setPedidoOlist] = useState("");
  const [obsGerais, setObsGerais] = useState("");

  // observações dos itens: chave → texto
  const [obsItens, setObsItens] = useState<Record<string, string>>({});
  // dados_extras dos itens: chave → obj
  const [extrasItens, setExtrasItens] = useState<Record<string, any>>({});

  // UI
  const [salvando, setSalvando] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [openFinalizar, setOpenFinalizar] = useState(false);
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  const cabecalhoRef = useRef<HTMLDivElement>(null);
  const secaoRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);

    const [{ data: saidaData }, { data: itensData }, { data: anexosData }] = await Promise.all([
      supabase
        .from("saidas_advance")
        .select(`*, deals(*, unidades_saude(nome), linhas_produto(nome, cor), profiles!deals_vendedor_profile_fkey(nome))`)
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
    ]);

    if (!saidaData) { toast.error("Saída não encontrada"); navigate("/vendas-advance"); return; }

    setSaida(saidaData);
    setDeal(saidaData.deals);
    setItens(itensData ?? []);
    setAnexos(anexosData ?? []);

    setTipoSaida(saidaData.tipo_saida ?? "");
    setIdOlist(saidaData.id_olist ?? "");
    setPropostaOlist(saidaData.proposta_olist ?? "");
    setPedidoOlist(saidaData.pedido_olist ?? "");
    setObsGerais(saidaData.observacoes_gerais ?? "");

    const obsMap: Record<string, string> = {};
    const extrasMap: Record<string, any> = {};
    (itensData ?? []).forEach((it: any) => {
      if (it.observacao) obsMap[it.chave_item] = it.observacao;
      if (it.dados_extras) extrasMap[it.chave_item] = it.dados_extras;
    });
    setObsItens(obsMap);
    setExtrasItens(extrasMap);

    // Pós-Venda relacionado
    if (saidaData.deals?.id) {
      const { data: inst } = await supabase
        .from("instalacoes")
        .select("*")
        .eq("deal_id", saidaData.deals.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPosVenda(inst);
    }

    // Análise de crédito
    const financItem = (itensData ?? []).find(
      (it: any) => it.chave_item === "financiamento" && (it.dados_extras as any)?.analise_credito_id
    );
    const analiseCreditoId = (financItem?.dados_extras as any)?.analise_credito_id;
    if (analiseCreditoId) {
      const { data: an } = await supabase
        .from("analises_credito")
        .select("*")
        .eq("id", analiseCreditoId)
        .maybeSingle();
      setAnalise(an);
    }

    setLoading(false);
  }

  // ---------------------------------------------------------------------------
  // Salvar campos gerais
  async function salvar() {
    if (!id || !canEdit) return;
    setSalvando(true);
    await supabase.from("saidas_advance").update({
      tipo_saida: tipoSaida || null,
      id_olist: idOlist || null,
      proposta_olist: propostaOlist || null,
      pedido_olist: pedidoOlist || null,
      observacoes_gerais: obsGerais || null,
    }).eq("id", id);
    setSalvando(false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  }

  // Auto-save no blur
  const autoSave = useCallback(async () => {
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

  // ---------------------------------------------------------------------------
  // Toggle item concluído
  async function toggleItem(chaveItem: string, concluido: boolean) {
    if (!user || !canEdit) return;
    const it = itens.find((i) => i.chave_item === chaveItem);
    if (!it) return;

    const { error } = await supabase.from("saidas_advance_itens").update({
      concluido,
      concluido_por: concluido ? user.id : null,
      concluido_em: concluido ? new Date().toISOString() : null,
    }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }

    setItens((prev) =>
      prev.map((i) =>
        i.chave_item === chaveItem ? { ...i, concluido, concluido_por: concluido ? user.id : null, concluido_em: concluido ? new Date().toISOString() : null } : i
      )
    );
    toast.success(concluido ? "Item marcado ✓" : "Item desmarcado", { duration: 1500 });
  }

  // Salvar observação de um item (blur)
  async function salvarObsItem(chaveItem: string) {
    if (!canEdit) return;
    const it = itens.find((i) => i.chave_item === chaveItem);
    if (!it) return;
    await supabase.from("saidas_advance_itens")
      .update({ observacao: obsItens[chaveItem] || null })
      .eq("id", it.id);
  }

  // Salvar dados_extras de um item
  async function salvarExtrasItem(chaveItem: string, extras: any) {
    if (!canEdit) return;
    const it = itens.find((i) => i.chave_item === chaveItem);
    if (!it) return;
    await supabase.from("saidas_advance_itens")
      .update({ dados_extras: extras })
      .eq("id", it.id);
    setExtrasItens((prev) => ({ ...prev, [chaveItem]: extras }));
  }

  // ---------------------------------------------------------------------------
  // Upload de anexo
  async function handleUpload(chaveItem: string | null, arquivo: File) {
    if (!user || !canEdit || !id) return;
    setUploadingItem(chaveItem ?? "_geral");

    const path = `saidas-advance/${id}/${Date.now()}-${arquivo.name}`;
    const { error: upErr } = await supabase.storage
      .from("advance-anexos")
      .upload(path, arquivo, { upsert: false });

    if (upErr) { toast.error("Erro no upload: " + upErr.message); setUploadingItem(null); return; }

    const { data: urlData } = supabase.storage.from("advance-anexos").getPublicUrl(path);

    await supabase.from("saidas_advance_anexos").insert({
      saida_id: id,
      item_chave: chaveItem,
      nome_arquivo: arquivo.name,
      url: urlData.publicUrl,
      tamanho_bytes: arquivo.size,
      tipo_mime: arquivo.type,
      anexado_por: user.id,
    });

    toast.success("Anexo salvo");
    setUploadingItem(null);
    void load();
  }

  // ---------------------------------------------------------------------------
  // Finalizar saída
  async function handleFinalizar() {
    if (!id || !user) return;
    if (!tipoSaida) { toast.error("Defina o Tipo de Saída antes de finalizar"); return; }
    await supabase.from("saidas_advance").update({
      status: "finalizado",
      finalizado_em: new Date().toISOString(),
      finalizado_por: user.id,
      tipo_saida: tipoSaida,
    }).eq("id", id);
    toast.success("Saída finalizada!");
    setOpenFinalizar(false);
    void load();
  }

  // Reabrir saída (admin)
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

  const totalItens = itens.length;
  const concluidosItens = itens.filter((i) => i.concluido).length;
  const isFinalizado = saida.status === "finalizado";
  const forma = deal?.forma_pagamento;

  return (
    <div className="relative pb-20">
      {/* ── CABEÇALHO STICKY ── */}
      <div
        ref={cabecalhoRef}
        className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm px-6 py-3"
      >
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
              <span>{deal?.profiles?.nome}</span>
              <span className="font-semibold">{concluidosItens}/{totalItens} itens</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedIndicator && (
              <span className="text-xs text-green-600 font-medium">✓ Salvo</span>
            )}
            {canEdit && !isFinalizado && (
              <Button variant="outline" size="sm" onClick={salvar} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            )}
            {canEdit && !isFinalizado && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setOpenFinalizar(true)}
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
        <div className="flex-1 min-w-0 space-y-6">

          {/* Campos comerciais */}
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
                  disabled={!canEdit}
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
                <Input
                  value={idOlist}
                  onChange={(e) => setIdOlist(e.target.value)}
                  onBlur={autoSave}
                  disabled={!canEdit}
                  placeholder="OL-10001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Proposta OLIST</Label>
                <Input
                  value={propostaOlist}
                  onChange={(e) => setPropostaOlist(e.target.value)}
                  onBlur={autoSave}
                  disabled={!canEdit}
                  placeholder="PROP-2024-001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pedido OLIST</Label>
                <Input
                  value={pedidoOlist}
                  onChange={(e) => setPedidoOlist(e.target.value)}
                  onBlur={autoSave}
                  disabled={!canEdit}
                  placeholder="PED-2024-001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Blocos de checklist */}
          {BLOCO_META.map((bloco) => {
            const isOpen = colapsados[bloco.chave] !== true;
            const itensBloco = itens.filter((i) => i.bloco === bloco.chave);
            const concBloco = itensBloco.filter((i) => i.concluido).length;
            const anexosBloco = anexos.filter(
              (a) => itensBloco.some((i) => i.chave_item === a.item_chave)
            );

            return (
              <Card
                key={bloco.chave}
                id={`bloco-${bloco.chave}`}
                ref={(el) => { secaoRefs.current[bloco.chave] = el; }}
              >
                <CardHeader
                  className="cursor-pointer pb-2"
                  onClick={() => setColapsados((c) => ({ ...c, [bloco.chave]: !c[bloco.chave] }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-base">{bloco.titulo}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {concBloco}/{itensBloco.length}
                      </span>
                    </div>
                    {concBloco === itensBloco.length && itensBloco.length > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4 pt-0">
                    {bloco.itens.map((itemMeta) => {
                      const item = itens.find((i) => i.chave_item === itemMeta.chave);
                      if (!item) return null;
                      const anexosItem = anexos.filter((a) => a.item_chave === itemMeta.chave);

                      return (
                        <div
                          key={itemMeta.chave}
                          className={`rounded-lg border p-3 transition-colors ${
                            item.concluido ? "bg-green-50/60 border-green-200" : "bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`item-${itemMeta.chave}`}
                              checked={!!item.concluido}
                              onCheckedChange={(v) => toggleItem(itemMeta.chave, !!v)}
                              disabled={!canEdit}
                              className="mt-0.5 h-5 w-5"
                            />
                            <div className="flex-1 space-y-2">
                              <label
                                htmlFor={`item-${itemMeta.chave}`}
                                className={`text-sm font-medium cursor-pointer ${
                                  item.concluido ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {itemMeta.label}
                              </label>

                              {/* Campos extras por tipo */}
                              {itemMeta.tipo === "financiamento" && (
                                <CamposFinanciamento
                                  forma={forma}
                                  extrasDb={extrasItens[itemMeta.chave]}
                                  analise={analise}
                                />
                              )}
                              {itemMeta.tipo === "nota_fiscal" && canEdit && (
                                <CamposNotaFiscal
                                  extras={extrasItens[itemMeta.chave] ?? {}}
                                  onChange={(e) => salvarExtrasItem(itemMeta.chave, e)}
                                  disabled={!canEdit}
                                />
                              )}
                              {itemMeta.tipo === "transportadora" && canEdit && (
                                <CamposTransportadora
                                  extras={extrasItens[itemMeta.chave] ?? {}}
                                  onChange={(e) => salvarExtrasItem(itemMeta.chave, e)}
                                  disabled={!canEdit}
                                />
                              )}

                              {/* Observação */}
                              <Textarea
                                placeholder="Observação (opcional)..."
                                className="text-xs resize-none min-h-[60px]"
                                value={obsItens[itemMeta.chave] ?? ""}
                                onChange={(e) =>
                                  setObsItens((p) => ({ ...p, [itemMeta.chave]: e.target.value }))
                                }
                                onBlur={() => salvarObsItem(itemMeta.chave)}
                                disabled={!canEdit}
                              />

                              {/* Anexos do item */}
                              <AnexosItem
                                itemChave={itemMeta.chave}
                                anexos={anexosItem}
                                canEdit={canEdit}
                                uploading={uploadingItem === itemMeta.chave}
                                onUpload={(f) => handleUpload(itemMeta.chave, f)}
                              />

                              {item.concluido && item.concluido_em && (
                                <div className="text-[10px] text-muted-foreground">
                                  Concluído em {format(new Date(item.concluido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
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
                onBlur={autoSave}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>

          {/* Cross-check Pós-Venda */}
          {posVenda && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" /> Pós-Venda Relacionado
                  <span className="text-[10px] font-normal">(somente leitura)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Instalação</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{posVenda.status ?? "—"}</Badge>
                    <Link to="/pos-venda" className="text-xs text-primary hover:underline">
                      Ver Pós-Venda →
                    </Link>
                  </div>
                </div>
                {posVenda.observacoes && (
                  <p className="text-xs text-muted-foreground">{posVenda.observacoes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* TOC lateral (oculto em mobile) */}
        <div className="hidden xl:block w-48 shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Seções</p>
            {BLOCO_META.map((b) => {
              const it = itens.filter((i) => i.bloco === b.chave);
              const conc = it.filter((i) => i.concluido).length;
              return (
                <button
                  key={b.chave}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    document.getElementById(`bloco-${b.chave}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span>{b.titulo}</span>
                  <span className="text-xs text-muted-foreground">{conc}/{it.length}</span>
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
              {concluidosItens} de {totalItens} itens concluídos. Itens pendentes ficarão
              registrados como não concluídos.
            </p>
            {concluidosItens < totalItens && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{totalItens - concluidosItens} itens ainda pendentes.</span>
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
              disabled={!tipoSaida}
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
// Sub-componentes
// ---------------------------------------------------------------------------

function CamposFinanciamento({ forma, extrasDb, analise }: {
  forma?: string; extrasDb?: any; analise?: any;
}) {
  const formaLabel = forma ? (
    {
      a_vista_cartao: "À Vista / Cartão",
      financiado_interno: "Financiado Interno",
      financiamento_externo: "Financiamento Externo",
    }[forma] ?? forma
  ) : extrasDb?.forma_pagamento;

  return (
    <div className="rounded-md bg-muted/30 px-3 py-2 space-y-1 text-sm">
      {formaLabel && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Forma:</span>
          <Badge variant="outline" className="text-xs">{formaLabel}</Badge>
        </div>
      )}
      {extrasDb?.instituicao && (
        <div className="text-xs text-muted-foreground">Instituição: {extrasDb.instituicao}</div>
      )}
      {analise && (
        <div className="text-xs space-y-0.5">
          <div>
            <span className="text-muted-foreground">Análise:</span>{" "}
            <span className="font-medium">{analise.numero_analise}</span>
            {" "}
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

function CamposNotaFiscal({ extras, onChange, disabled }: {
  extras: any; onChange: (e: any) => void; disabled: boolean;
}) {
  const [nf, setNf] = useState(extras.numero_nf ?? "");
  const [data, setData] = useState(extras.data ?? "");
  const [valor, setValor] = useState(extras.valor?.toString() ?? "");
  const [difal, setDifal] = useState(extras.difal ?? "nao");
  const [obs, setObs] = useState(extras.obs ?? "");

  function save() {
    onChange({ numero_nf: nf, data, valor: valor ? Number(valor) : null, difal, obs });
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px]">Nº NF</Label>
        <Input className="h-7 text-xs" value={nf} onChange={(e) => setNf(e.target.value)} onBlur={save} disabled={disabled} placeholder="000123" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Data NF</Label>
        <Input type="date" className="h-7 text-xs" value={data} onChange={(e) => setData(e.target.value)} onBlur={save} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Valor (R$)</Label>
        <Input type="number" step="0.01" className="h-7 text-xs font-mono" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={save} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">DIFAL</Label>
        <Select value={difal} onValueChange={(v) => { setDifal(v); setTimeout(save, 0); }} disabled={disabled}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-[10px]">Obs.</Label>
        <Input className="h-7 text-xs" value={obs} onChange={(e) => setObs(e.target.value)} onBlur={save} disabled={disabled} />
      </div>
    </div>
  );
}

function CamposTransportadora({ extras, onChange, disabled }: {
  extras: any; onChange: (e: any) => void; disabled: boolean;
}) {
  const [nome, setNome] = useState(extras.nome ?? "");
  const [obs, setObs] = useState(extras.obs ?? "");

  function save() { onChange({ nome, obs }); }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-1 col-span-2">
        <Label className="text-[10px]">Transportadora</Label>
        <Input className="h-7 text-xs" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={save} disabled={disabled} placeholder="Nome ou código" />
      </div>
      <div className="space-y-1 col-span-2">
        <Label className="text-[10px]">Obs.</Label>
        <Input className="h-7 text-xs" value={obs} onChange={(e) => setObs(e.target.value)} onBlur={save} disabled={disabled} />
      </div>
    </div>
  );
}

function AnexosItem({ itemChave, anexos, canEdit, uploading, onUpload }: {
  itemChave: string;
  anexos: any[];
  canEdit: boolean;
  uploading: boolean;
  onUpload: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      {anexos.length > 0 && (
        <div className="space-y-1">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded border bg-card px-2 py-1 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{a.nome_arquivo}</span>
              <span className="text-muted-foreground shrink-0">
                {(a.tamanho_bytes / 1024).toFixed(0)} KB
              </span>
              <a href={a.url} target="_blank" rel="noopener noreferrer" title="Baixar">
                <Download className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </a>
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
            accept=".pdf,image/*"
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
            ) : (
              <Paperclip className="h-3 w-3" />
            )}
            {uploading ? "Enviando..." : "Anexar PDF"}
          </Button>
        </>
      )}
    </div>
  );
}
