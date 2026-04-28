import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  Kanban, TrendingUp, TrendingDown, Trophy, Target, Download, AlertTriangle,
  Building2, Users,
} from "lucide-react";
import {
  formatCurrency, daysBetween, STAGE_LABELS, STAGE_ORDER,
  UNIDADE_CICLO_LABELS,
} from "@/lib/crm";
import { KpiCard } from "./KpiCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type Filtros = {
  vendedor: string;
  estado: string;
  cidade: string;
  linha: string;
  periodo: "mes" | "trimestre" | "ano" | "tudo";
};

export function DashboardGerente() {
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [linhas, setLinhas] = useState<{ id: string; nome: string }[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    vendedor: "all", estado: "all", cidade: "all", linha: "all", periodo: "mes",
  });

  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [allUnidades, setAllUnidades] = useState<any[]>([]);
  const [tarefasAgg, setTarefasAgg] = useState<any[]>([]);

  useEffect(() => {
    void Promise.all([
      supabase.from("profiles").select("id, nome").eq("ativo", true).then(r => setVendedores(r.data ?? [])),
      supabase.from("linhas_produto").select("id, nome").is("archived_at", null).then(r => setLinhas(r.data ?? [])),
    ]);
  }, []);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [deals, unis, anots, tarefas] = await Promise.all([
      supabase.from("deals").select("id, titulo, valor_total, estagio, resultado, data_entrada_estagio, data_fechamento, vendedor_id, linha_id, unidade_id, motivo_perda, motivos_perda(nome), unidades_saude(nome, cidade, estado), linhas_produto(nome, cor, limite_amarelo_dias), profiles!deals_vendedor_id_fkey:profiles(nome)").is("archived_at", null).limit(2000),
      supabase.from("unidades_saude").select("id, nome, ciclo, estado, cidade").is("archived_at", null).limit(2000),
      supabase.from("anotacoes").select("autor_id, created_at").is("archived_at", null).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(2000),
      supabase.from("tarefas").select("responsavel_id, status, updated_at").is("archived_at", null).limit(5000),
    ]);

    setAllDeals(deals.data ?? []);
    setAllUnidades(unis.data ?? []);
    setEstados(Array.from(new Set((unis.data ?? []).map((u: any) => u.estado).filter(Boolean))).sort());
    setCidades(Array.from(new Set((unis.data ?? []).map((u: any) => u.cidade).filter(Boolean))).sort());

    // agrega atividade de vendedores
    const aggMap: Record<string, any> = {};
    (anots.data ?? []).forEach((a: any) => {
      aggMap[a.autor_id] ||= { id: a.autor_id, anotacoes: 0, tarefas_concluidas: 0, tarefas_atrasadas: 0 };
      aggMap[a.autor_id].anotacoes++;
    });
    (tarefas.data ?? []).forEach((t: any) => {
      aggMap[t.responsavel_id] ||= { id: t.responsavel_id, anotacoes: 0, tarefas_concluidas: 0, tarefas_atrasadas: 0 };
      if (t.status === "concluida") aggMap[t.responsavel_id].tarefas_concluidas++;
      if (t.status === "atrasada") aggMap[t.responsavel_id].tarefas_atrasadas++;
    });
    setTarefasAgg(Object.values(aggMap));
    setLoading(false);
  }

  const dealsFiltrados = useMemo(() => {
    const cutoff = filtros.periodo === "tudo" ? null
      : filtros.periodo === "mes" ? new Date(Date.now() - 30 * 86400000)
      : filtros.periodo === "trimestre" ? new Date(Date.now() - 90 * 86400000)
      : new Date(Date.now() - 365 * 86400000);
    return allDeals.filter(d => {
      if (filtros.vendedor !== "all" && d.vendedor_id !== filtros.vendedor) return false;
      if (filtros.linha !== "all" && d.linha_id !== filtros.linha) return false;
      if (filtros.estado !== "all" && d.unidades_saude?.estado !== filtros.estado) return false;
      if (filtros.cidade !== "all" && d.unidades_saude?.cidade !== filtros.cidade) return false;
      if (cutoff && d.data_fechamento && new Date(d.data_fechamento) < cutoff && d.resultado !== "em_andamento") return false;
      return true;
    });
  }, [allDeals, filtros]);

  const dealsAbertos = dealsFiltrados.filter(d => d.resultado === "em_andamento");
  const valorPipeline = dealsAbertos.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  const ganhos = dealsFiltrados.filter(d => d.resultado === "ganho");
  const perdidos = dealsFiltrados.filter(d => d.resultado === "perdido");
  const valorGanhos = ganhos.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  const taxaConv = (ganhos.length + perdidos.length) > 0
    ? Math.round((ganhos.length / (ganhos.length + perdidos.length)) * 100) : 0;

  // pipeline por estágio × linha
  const pipePorEstagio = useMemo(() => STAGE_ORDER.filter(s => s !== "finalizado").map(s => {
    const ds = dealsAbertos.filter(d => d.estagio === s);
    return {
      estagio: STAGE_LABELS[s].slice(0, 6),
      valor: ds.reduce((sum, d) => sum + Number(d.valor_total || 0), 0),
      qtd: ds.length,
    };
  }), [dealsAbertos]);

  // motivos de perda
  const motivosPerda = useMemo(() => {
    const m: Record<string, number> = {};
    perdidos.forEach(d => {
      const key = d.motivos_perda?.nome || d.motivo_perda || "Não informado";
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [perdidos]);

  const dealsParados = useMemo(() => dealsAbertos
    .map(d => ({ ...d, dias: daysBetween(d.data_entrada_estagio), limite: d.linhas_produto?.limite_amarelo_dias ?? 14 }))
    .filter(d => d.dias > d.limite)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 8),
  [dealsAbertos]);

  // cobertura
  const coberturaCiclo = useMemo(() => {
    const c: Record<string, number> = {};
    allUnidades.forEach(u => { c[u.ciclo] = (c[u.ciclo] || 0) + 1; });
    return c;
  }, [allUnidades]);
  const coberturaEstado = useMemo(() => {
    const c: Record<string, number> = {};
    allUnidades.forEach(u => { if (u.estado) c[u.estado] = (c[u.estado] || 0) + 1; });
    return Object.entries(c).map(([e, q]) => ({ estado: e, qtd: q })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);
  }, [allUnidades]);

  function exportarExcel() {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dealsFiltrados.map(d => ({
        Titulo: d.titulo, Valor: Number(d.valor_total),
        Estagio: STAGE_LABELS[d.estagio as keyof typeof STAGE_LABELS],
        Resultado: d.resultado, Unidade: d.unidades_saude?.nome,
        Cidade: d.unidades_saude?.cidade, Estado: d.unidades_saude?.estado,
        Linha: d.linhas_produto?.nome, Vendedor: d.profiles?.nome,
        Fechamento: d.data_fechamento,
      }))), "Deals");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pipePorEstagio), "Pipeline");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motivosPerda), "Motivos de perda");
      XLSX.writeFile(wb, `dashboard-gerente-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar");
    }
  }

  const cores = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--success))"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard gerencial</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada da equipe</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportarExcel}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="p-4 grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Select value={filtros.vendedor} onValueChange={v => setFiltros({ ...filtros, vendedor: v })}>
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtros.estado} onValueChange={v => setFiltros({ ...filtros, estado: v })}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estados</SelectItem>
              {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtros.cidade} onValueChange={v => setFiltros({ ...filtros, cidade: v })}>
            <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas cidades</SelectItem>
              {cidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtros.linha} onValueChange={v => setFiltros({ ...filtros, linha: v })}>
            <SelectTrigger><SelectValue placeholder="Linha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas linhas</SelectItem>
              {linhas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtros.periodo} onValueChange={v => setFiltros({ ...filtros, periodo: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Últimos 30 dias</SelectItem>
              <SelectItem value="trimestre">Últimos 90 dias</SelectItem>
              <SelectItem value="ano">Último ano</SelectItem>
              <SelectItem value="tudo">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Deals abertos" value={dealsAbertos.length} icon={Kanban} variant="primary" />
        <KpiCard title="Pipeline" value={formatCurrency(valorPipeline)} icon={TrendingUp} variant="info" />
        <KpiCard title="Ganhos no período" value={ganhos.length} hint={formatCurrency(valorGanhos)} icon={Trophy} variant="success" />
        <KpiCard title="Perdidos" value={perdidos.length} icon={TrendingDown} variant="destructive" />
        <KpiCard title="Conversão" value={`${taxaConv}%`} icon={Target} variant="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pipeline por estágio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipePorEstagio}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="estagio" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => formatCurrency(v as number)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Deals parados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {dealsParados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum deal parado.</p>}
            {dealsParados.map(d => (
              <Link key={d.id} to={`/deals/${d.id}`} className="block">
                <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3 hover:bg-destructive/10">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.titulo}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.profiles?.nome || "—"} · {STAGE_LABELS[d.estagio as keyof typeof STAGE_LABELS]}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(d.valor_total)}</div>
                    <div className="font-mono text-[11px] text-destructive">{d.dias}d</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Atividade dos vendedores</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left p-2">Vendedor</th><th className="p-2">Anotações (7d)</th><th className="p-2">Tarefas concluídas</th><th className="p-2">Tarefas atrasadas</th></tr>
              </thead>
              <tbody>
                {tarefasAgg.map(a => {
                  const v = vendedores.find(x => x.id === a.id);
                  if (!v) return null;
                  const ruim = a.tarefas_atrasadas > 5 && a.anotacoes < 3;
                  return (
                    <tr key={a.id} className={`border-b ${ruim ? "bg-destructive/5" : ""}`}>
                      <td className="p-2 font-medium">{v.nome}</td>
                      <td className="p-2 text-center">{a.anotacoes}</td>
                      <td className="p-2 text-center text-success">{a.tarefas_concluidas}</td>
                      <td className={`p-2 text-center ${a.tarefas_atrasadas > 0 ? "text-destructive font-medium" : ""}`}>{a.tarefas_atrasadas}</td>
                    </tr>
                  );
                })}
                {tarefasAgg.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Sem atividade no período.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Encerrados no período</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-success/30 bg-success/5 p-4">
                <div className="text-xs text-muted-foreground">Ganhos</div>
                <div className="text-2xl font-bold text-success">{ganhos.length}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(valorGanhos)}</div>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <div className="text-xs text-muted-foreground">Perdidos</div>
                <div className="text-2xl font-bold text-destructive">{perdidos.length}</div>
              </div>
            </div>
            {motivosPerda.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={motivosPerda} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" outerRadius={70} label={(e: any) => e.nome}>
                    {motivosPerda.map((_, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-info" />Cobertura de unidades</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(coberturaCiclo).map(([k, v]) => (
                <div key={k} className="rounded-md border p-3 text-center">
                  <div className="text-xs text-muted-foreground">{UNIDADE_CICLO_LABELS[k as keyof typeof UNIDADE_CICLO_LABELS] || k}</div>
                  <div className="text-xl font-bold">{v}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top estados</div>
              {coberturaEstado.map(e => {
                const max = coberturaEstado[0]?.qtd || 1;
                return (
                  <div key={e.estado} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-8">{e.estado}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-info" style={{ width: `${(e.qtd / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{e.qtd}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
