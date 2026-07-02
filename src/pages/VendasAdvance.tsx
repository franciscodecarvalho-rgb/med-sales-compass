import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck, Search, AlertTriangle, CheckCircle2, Clock, Trophy, PlusCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AREAS_ADVANCE } from "@/services/saidaAdvanceService";
import { FaturamentoTab } from "@/components/FaturamentoTab";
import { EnviarParaFaturamentoModal } from "@/components/EnviarParaFaturamentoModal";
import { PuxarDoFunilModal } from "@/components/advance/PuxarDoFunilModal";
import { AdicionarSaidaDiretaModal } from "@/components/advance/AdicionarSaidaDiretaModal";

const FORMA_LABELS: Record<string, { label: string; color: string }> = {
  a_vista_cartao:       { label: "À Vista / Cartão",       color: "bg-green-100 text-green-800 border-green-300" },
  financiado_interno:   { label: "Financiado Interno",     color: "bg-blue-100 text-blue-800 border-blue-300" },
  financiamento_externo:{ label: "Financiamento Externo",  color: "bg-purple-100 text-purple-800 border-purple-300" },
};

const TIPO_LABELS: Record<string, string> = {
  venda: "Venda", demonstracao: "Demonstração", comodato: "Comodato",
  locacao: "Locação", troca: "Troca",
};

export default function VendasAdvance() {
  const { hasRole, isAdminOrGerente } = useAuth();
  const navigate = useNavigate();

  const [saidas, setSaidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<"em_andamento" | "finalizado" | "todas">("em_andamento");
  const [filterTipo, setFilterTipo] = useState("todas");
  const [filterForma, setFilterForma] = useState("todas");
  const [search, setSearch] = useState("");

  // Modais de criação de saída
  const [showPuxar, setShowPuxar] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [advanceDeal, setAdvanceDeal] = useState<any>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("saidas_advance")
      .select(`
        *,
        deals(
          id, titulo, valor_total, vendedor_id, forma_pagamento,
          unidades_saude(nome),
          linhas_produto(nome, cor),
          profiles!deals_vendedor_profile_fkey(nome)
        ),
        unidade:unidades_saude(nome),
        linha:linhas_produto(nome, cor),
        saidas_advance_itens(id, concluido, chave_item)
      `)
      .order("criado_em", { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }
    setSaidas(data ?? []);
    setLoading(false);
  }

  const agora = Date.now();

  const filtradas = useMemo(() => {
    return (saidas || []).filter((s) => {
      const forma = s.deals?.forma_pagamento ?? s.forma_pagamento;
      if (filterStatus !== "todas" && s.status !== filterStatus) return false;
      if (filterTipo !== "todas" && s.tipo_saida !== filterTipo) return false;
      if (filterForma !== "todas" && forma !== filterForma) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          s.deals?.titulo?.toLowerCase().includes(q) ||
          s.titulo?.toLowerCase().includes(q) ||
          s.deals?.unidades_saude?.nome?.toLowerCase().includes(q) ||
          s.unidade?.nome?.toLowerCase().includes(q) ||
          s.id_olist?.toLowerCase().includes(q) ||
          s.proposta_olist?.toLowerCase().includes(q) ||
          s.pedido_olist?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [saidas, filterStatus, filterTipo, filterForma, search]);

  // KPI cards
  const emAndamento = saidas.filter((s) => s.status === "em_andamento").length;
  const finalizadasMes = saidas.filter((s) => {
    if (s.status !== "finalizado" || !s.finalizado_em) return false;
    const d = new Date(s.finalizado_em);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const aguardando15 = saidas.filter((s) => {
    if (s.status !== "em_andamento") return false;
    return differenceInDays(new Date(), new Date(s.criado_em)) > 15;
  }).length;

  return (
    <div className="space-y-4 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" /> Vendas Advance
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtradas.length} saídas · pipeline pós-venda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPuxar(true)}>
            <Trophy className="h-4 w-4 mr-1.5 text-amber-500" /> Puxar do Funil
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> Adicionar Diretamente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="saidas">
        <TabsList>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="saidas" className="space-y-4 mt-4">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{emAndamento}</div>
              <div className="text-xs text-muted-foreground">Em andamento</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{finalizadasMes}</div>
              <div className="text-xs text-muted-foreground">Finalizadas no mês</div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${aguardando15 > 0 ? "border-l-amber-500" : "border-l-gray-300"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className={`h-8 w-8 shrink-0 ${aguardando15 > 0 ? "text-amber-500" : "text-gray-400"}`} />
            <div>
              <div className="text-2xl font-bold">{aguardando15}</div>
              <div className="text-xs text-muted-foreground">Aguardando +15 dias</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar cliente, OLIST, deal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterForma} onValueChange={setFilterForma}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as formas</SelectItem>
            {Object.entries(FORMA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Linha</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nenhuma saída encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((s, i) => {
                const itens = s.saidas_advance_itens ?? [];
                const total = itens.length;
                const concluidos = itens.filter((it: any) => it.concluido).length;
                const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
                const forma = s.deals?.forma_pagamento ?? s.forma_pagamento;
                const clienteNome = s.deals?.unidades_saude?.nome ?? s.unidade?.nome ?? s.titulo;
                const subtitulo = s.deals?.titulo ?? (s.unidade?.nome ? s.titulo : null);
                const linhaNome = s.deals?.linhas_produto?.nome ?? s.linha?.nome;
                const valorTotal = s.deals?.valor_total ?? s.valor_total;
                const atrasada =
                  s.status === "em_andamento" &&
                  differenceInDays(new Date(), new Date(s.criado_em)) > 15;

                return (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""} ${atrasada ? "border-l-2 border-l-amber-400" : ""}`}
                    onClick={() => navigate(`/vendas-advance/${s.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{clienteNome}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{subtitulo}</div>
                    </TableCell>
                    <TableCell>
                      {s.tipo_saida ? (
                        <Badge variant="outline">{TIPO_LABELS[s.tipo_saida] ?? s.tipo_saida}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{linhaNome ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {formatCurrency(valorTotal)}
                    </TableCell>
                    <TableCell>
                      {forma ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${FORMA_LABELS[forma]?.color ?? ""}`}
                        >
                          {FORMA_LABELS[forma]?.label ?? forma}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        {/* Barra segmentada por bloco */}
                        <BarraProgressoSegmentada itens={itens} />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {concluidos}/{total}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.status === "em_andamento" ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" /> Em andamento
                          </Badge>
                          {atrasada && (
                            <span title="+15 dias"><AlertTriangle className="h-3 w-3 text-amber-500" /></span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Finalizado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.criado_em
                        ? format(new Date(s.criado_em), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/vendas-advance/${s.id}`)}
                      >
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="faturamento">
          <FaturamentoTab />
        </TabsContent>

      </Tabs>

      {/* Puxar do funil → seleciona deal ganho → modal de faturamento cria a saída */}
      <PuxarDoFunilModal
        open={showPuxar}
        onClose={() => setShowPuxar(false)}
        onPick={(deal) => { setShowPuxar(false); setAdvanceDeal(deal); }}
      />
      <EnviarParaFaturamentoModal
        open={!!advanceDeal}
        deal={advanceDeal}
        onClose={() => setAdvanceDeal(null)}
        onSuccess={() => { setAdvanceDeal(null); void load(); }}
      />

      {/* Adicionar diretamente → cria saída avulsa (sem deal) */}
      <AdicionarSaidaDiretaModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); void load(); }}
      />
    </div>
  );
}

// Barra de progresso segmentada: um segmento por área (7), aceso quando concluída
function BarraProgressoSegmentada({ itens }: { itens: any[] }) {
  return (
    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted gap-px">
      {AREAS_ADVANCE.map((area) => {
        const item = itens.find((it) => it.chave_item === area.chave);
        return (
          <div
            key={area.chave}
            title={area.titulo}
            className={`flex-1 transition-colors ${item?.concluido ? area.cor : "bg-muted"}`}
          />
        );
      })}
    </div>
  );
}
