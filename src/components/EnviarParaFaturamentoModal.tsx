/**
 * Modal "Enviar para Faturamento" — disparado quando um deal é marcado como GANHO.
 * Coleta a forma de pagamento, consulta API de crédito (se Financiado Interno),
 * e em seguida cria a saida_advance com seus 11 itens.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/crm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import {
  consultarAnaliseCredito,
  type AnaliseCreditoResponse,
} from "@/services/analiseCreditoService";
import { criarSaidaAdvance, type FormaPagamento } from "@/services/saidaAdvanceService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  deal: {
    id: string;
    titulo: string;
    unidades_saude?: { nome?: string } | null;
    linhas_produto?: { nome?: string } | null;
    valor_total?: number | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnviarParaFaturamentoModal({ open, deal, onClose, onSuccess }: Props) {
  const { user } = useAuth();

  const [forma, setForma] = useState<FormaPagamento>("a_vista_cartao");
  const [numeroAnalise, setNumeroAnalise] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [obsExterno, setObsExterno] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [analiseResult, setAnaliseResult] = useState<AnaliseCreditoResponse | null>(null);
  const [analiseDbId, setAnaliseDbId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valorDeal = Number(deal?.valor_total ?? 0);

  // Muda forma de pagamento → limpa resultado anterior
  function handleFormaChange(v: FormaPagamento) {
    setForma(v);
    setAnaliseResult(null);
    setAnaliseDbId(null);
    setNumeroAnalise("");
  }

  // Consulta API e persiste no banco
  async function handleConsultar() {
    if (!numeroAnalise.trim() || !deal || !user) return;
    setConsultando(true);
    setAnaliseResult(null);
    setAnaliseDbId(null);

    const res = await consultarAnaliseCredito(numeroAnalise.trim());

    // Determina status real: aprovado com limite insuficiente → limite_insuficiente
    let statusFinal = res.status;
    if (
      res.status === "aprovado" &&
      res.limite_aprovado !== null &&
      res.limite_aprovado < valorDeal
    ) {
      statusFinal = "limite_insuficiente";
    }

    // Persiste SEMPRE no banco
    const { data: dbRow, error: errAnalise } = await supabase
      .from("analises_credito")
      .insert({
        numero_analise: res.numero_analise,
        deal_id: deal.id,
        consultado_por: user.id,
        status: statusFinal,
        limite_aprovado: res.limite_aprovado,
        parcelas_maximas: res.parcelas_maximas,
        prazo_maximo_dias: res.prazo_maximo_dias,
        validade_analise: res.validade_analise,
        observacoes: res.observacoes,
        cliente_consultado: res.cliente_consultado,
        payload_completo: res as any,
      })
      .select("id")
      .single();

    if (errAnalise || !dbRow?.id) {
      toast.error(errAnalise?.message ?? "Erro ao salvar a análise de crédito");
      setConsultando(false);
      return;
    }

    setAnaliseResult({ ...res, status: statusFinal });
    setAnaliseDbId(dbRow.id);
    setConsultando(false);
  }

  // Verifica se pode enviar para o Advance
  function podeEnviar(): boolean {
    if (forma === "a_vista_cartao") return true;
    if (forma === "financiamento_externo") return instituicao.trim().length > 0;
    if (forma === "financiado_interno") {
      return analiseResult?.status === "aprovado";
    }
    return false;
  }

  // Ação principal: enviar para o Advance
  async function handleEnviar() {
    if (!deal || !user || !podeEnviar()) return;
    setSaving(true);

    // 1. Atualiza deal
    const { error: errDeal } = await supabase.from("deals").update({
      estagio: "finalizado",
      resultado: "ganho",
      data_fechamento: new Date().toISOString(),
      enviado_para_advance: true,
      data_envio_advance: new Date().toISOString(),
      forma_pagamento: forma,
      analise_credito_id: forma === "financiado_interno" ? analiseDbId : null,
      instituicao_financeira_externa:
        forma === "financiamento_externo" ? instituicao || null : null,
    }).eq("id", deal.id);

    if (errDeal) { toast.error(errDeal.message); setSaving(false); return; }

    // 2. Cria saida_advance + 11 itens (helper compartilhado)
    try {
      await criarSaidaAdvance({
        criadoPor: user.id,
        forma,
        dealId: deal.id,
        analiseDbId: forma === "financiado_interno" ? analiseDbId : null,
        instituicao: forma === "financiamento_externo" ? instituicao || null : null,
        obsExterno: forma === "financiamento_externo" ? obsExterno.trim() || null : null,
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar saída Advance");
      setSaving(false);
      return;
    }

    toast.success("Deal enviado para Vendas Advance! 🎉");
    setSaving(false);
    onSuccess();
  }

  // Converter para À Vista sem fechar modal
  function handleConvertarAVista() {
    setForma("a_vista_cartao");
    setAnaliseResult(null);
    setAnaliseDbId(null);
  }

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📦 Enviar para Faturamento
          </DialogTitle>
        </DialogHeader>

        {/* Cabeçalho do deal */}
        <Card className="bg-muted/40">
          <CardContent className="p-3 space-y-1 text-sm">
            <div className="font-semibold">{deal.titulo}</div>
            <div className="text-muted-foreground text-xs">
              {deal.unidades_saude?.nome}
              {deal.linhas_produto?.nome && ` · ${deal.linhas_produto.nome}`}
            </div>
            <div className="font-mono font-bold text-base text-primary">
              {formatCurrency(valorDeal)}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label className="font-semibold">Forma de Pagamento *</Label>
            <RadioGroup
              value={forma}
              onValueChange={(v) => handleFormaChange(v as FormaPagamento)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="a_vista_cartao" id="fp-avista" />
                <Label htmlFor="fp-avista" className="cursor-pointer font-normal">
                  À Vista / Cartão
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="financiado_interno" id="fp-interno" />
                <Label htmlFor="fp-interno" className="cursor-pointer font-normal">
                  Financiado Interno
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="financiamento_externo" id="fp-externo" />
                <Label htmlFor="fp-externo" className="cursor-pointer font-normal">
                  Financiamento Externo
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Financiamento Externo */}
          {forma === "financiamento_externo" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs">Instituição Financeira *</Label>
                <Input
                  placeholder="Ex: Banco Bradesco, Caixa Econômica..."
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o financiamento..."
                  value={obsExterno}
                  onChange={(e) => setObsExterno(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Financiado Interno — Consulta de Crédito */}
          {forma === "financiado_interno" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Número da Análise de Crédito *
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: AC-2024-001"
                    value={numeroAnalise}
                    onChange={(e) => setNumeroAnalise(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleConsultar();
                      }
                    }}
                    disabled={consultando}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleConsultar}
                    disabled={consultando || !numeroAnalise.trim()}
                    className="shrink-0"
                  >
                    {consultando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      "Consultar Análise"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Dica de teste: terminar em 0 = reprovado, 1 = pendente, 2 = limite insuficiente, outros = aprovado
                </p>
              </div>

              {/* Resultado da análise */}
              {analiseResult && (
                <ResultadoAnalise
                  result={analiseResult}
                  valorDeal={valorDeal}
                  onTentarOutro={() => {
                    setNumeroAnalise("");
                    setAnaliseResult(null);
                    setAnaliseDbId(null);
                  }}
                  onConvertarAVista={handleConvertarAVista}
                  onVoltarNegociacao={async () => {
                    await supabase.from("deals").update({ estagio: "negociacao" }).eq("id", deal.id);
                    toast.success("Deal voltou para Negociação");
                    onClose();
                  }}
                  onConsultarNovamente={handleConsultar}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEnviar}
            disabled={!podeEnviar() || saving}
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              "Enviar para Faturamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: card de resultado da análise de crédito
// ---------------------------------------------------------------------------
interface ResultadoProps {
  result: AnaliseCreditoResponse;
  valorDeal: number;
  onTentarOutro: () => void;
  onConvertarAVista: () => void;
  onVoltarNegociacao: () => void;
  onConsultarNovamente: () => void;
}

function ResultadoAnalise({
  result,
  valorDeal,
  onTentarOutro,
  onConvertarAVista,
  onVoltarNegociacao,
  onConsultarNovamente,
}: ResultadoProps) {
  const status = result.status;

  const configMap = {
    aprovado: {
      bg: "bg-green-50 border-green-200",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />,
      titulo: "Análise Aprovada",
      cor: "text-green-700",
    },
    reprovado: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />,
      titulo: "Análise Reprovada",
      cor: "text-red-700",
    },
    pendente: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />,
      titulo: "Análise Pendente",
      cor: "text-yellow-700",
    },
    limite_insuficiente: {
      bg: "bg-orange-50 border-orange-200",
      icon: <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />,
      titulo: "Limite Insuficiente",
      cor: "text-orange-700",
    },
    erro_api: {
      bg: "bg-gray-50 border-gray-200",
      icon: <AlertCircle className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />,
      titulo: "Erro na Consulta",
      cor: "text-gray-700",
    },
  };

  const cfg = configMap[status];

  return (
    <div className={`rounded-md border p-3 space-y-3 ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        {cfg.icon}
        <div className="flex-1 space-y-1">
          <div className={`font-semibold text-sm ${cfg.cor}`}>{cfg.titulo}</div>
          {result.cliente_consultado && (
            <div className="text-xs text-muted-foreground">{result.cliente_consultado}</div>
          )}
        </div>
      </div>

      {/* Detalhes: aprovado */}
      {(status === "aprovado") && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Limite aprovado</div>
            <div className="font-mono font-bold text-green-700">
              {formatCurrency(result.limite_aprovado ?? 0)}
            </div>
          </div>
          {result.parcelas_maximas && (
            <div>
              <div className="text-muted-foreground">Parcelas</div>
              <div className="font-semibold">até {result.parcelas_maximas}x</div>
            </div>
          )}
          {result.validade_analise && (
            <div>
              <div className="text-muted-foreground">Validade</div>
              <div className="font-semibold">
                {format(new Date(result.validade_analise), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Limite insuficiente */}
      {status === "limite_insuficiente" && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Limite aprovado</span>
            <span className="font-mono font-semibold text-orange-700">
              {formatCurrency(result.limite_aprovado ?? 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor do deal</span>
            <span className="font-mono font-semibold">{formatCurrency(valorDeal)}</span>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className="text-muted-foreground">Diferença</span>
            <span className="font-mono font-bold text-destructive">
              {formatCurrency(valorDeal - (result.limite_aprovado ?? 0))}
            </span>
          </div>
        </div>
      )}

      {/* Motivo reprovação / obs */}
      {result.observacoes && (
        <div className="text-xs text-muted-foreground italic">{result.observacoes}</div>
      )}

      {/* Ações por status */}
      {(status === "limite_insuficiente" || status === "reprovado") && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onTentarOutro}>
            Tentar com outro número
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onConvertarAVista}>
            Converter para À Vista
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onVoltarNegociacao}
          >
            Voltar para Negociação
          </Button>
        </div>
      )}

      {status === "pendente" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onConsultarNovamente}
        >
          Consultar Novamente
        </Button>
      )}

      {status === "erro_api" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onConsultarNovamente}
        >
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}
