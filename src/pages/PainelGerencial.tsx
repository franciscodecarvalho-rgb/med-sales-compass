import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboards/KpiCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Trophy, CheckCircle2, AlertTriangle, Search,
  DollarSign, Target, Users as UsersIcon, ListTodo,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Periodo = "7d" | "30d" | "90d" | "ano" | "tudo";

const PERIODO_DIAS: Record<Periodo, number | null> = {
  "7d": 7, "30d": 30, "90d": 90, "ano": 365, "tudo": null,
};

interface Profile { id: string; nome: string; email: string; }
interface Deal { id: string; vendedor_id: string; estagio: string; resultado: string; valor_total: number; created_at: string; data_fechamento: string | null; }
interface Tarefa { id: string; responsavel_id: string; status: string; created_at: string; concluida_em: string | null; data_vencimento: string | null; }
interface Discovery { id: string; vendedor_id: string; status: string; created_at: string; unidade_gerada_id: string | null; }

interface UserStats {
  user: Profile;
  deals_total: number;
  deals_ganhos: number;
  deals_perdidos: number;
  deals_andamento: number;
  receita: number;
  ticket_medio: number;
  conversao: number;
  tarefas_total: number;
  tarefas_concluidas: number;
  tarefas_atrasadas: number;
  tarefas_taxa_conclusao: number;
  discoveries: number;
  discoveries_convertidos: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--info))", "hsl(var(--muted-foreground))"];

export default function PainelGerencial() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);

  const desde = useMemo(() => {
    const dias = PERIODO_DIAS[periodo];
    if (!dias) return null;
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString();
  }, [periodo]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pRes, dRes, tRes, discRes] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").eq("ativo", true),
        (() => {
          let q = supabase.from("deals").select("id, vendedor_id, estagio, resultado, valor_total, created_at, data_fechamento").is("archived_at", null);
          if (desde) q = q.gte("created_at", desde);
          return q;
        })(),
        (() => {
          let q = supabase.from("tarefas").select("id, responsavel_id, status, created_at, concluida_em, data_vencimento").is("archived_at", null);
          if (desde) q = q.gte("created_at", desde);
          return q;
        })(),
        (() => {
          let q = supabase.from("discovery").select("id, vendedor_id, status, created_at, unidade_gerada_id").is("archived_at", null);
          if (desde) q = q.gte("created_at", desde);
          return q;
        })(),
      ]);
      setProfiles((pRes.data as Profile[]) ?? []);
      setDeals((dRes.data as Deal[]) ?? []);
      setTarefas((tRes.data as Tarefa[]) ?? []);
      setDiscoveries((discRes.data as Discovery[]) ?? []);
      setLoading(false);
    }
    load();
  }, [desde]);

  // Totais gerais
  const totais = useMemo(() => {
    const ganhos = deals.filter((d) => d.resultado === "ganho");
    const perdidos = deals.filter((d) => d.resultado === "perdido");
    const receita = ganhos.reduce((s, d) => s + Number(d.valor_total || 0), 0);
    const tarefasConc = tarefas.filter((t) => t.status === "concluida");
    const tarefasAtr = tarefas.filter((t) => t.status === "atrasada");
    const discConv = discoveries.filter((d) => d.unidade_gerada_id);
    return {
      deals_total: deals.length,
      ganhos: ganhos.length,
      perdidos: perdidos.length,
      andamento: deals.length - ganhos.length - perdidos.length,
      receita,
      ticket_medio: ganhos.length ? receita / ganhos.length : 0,
      conversao: deals.length ? (ganhos.length / deals.length) * 100 : 0,
      tarefas_total: tarefas.length,
      tarefas_concluidas: tarefasConc.length,
      tarefas_atrasadas: tarefasAtr.length,
      tarefas_taxa: tarefas.length ? (tarefasConc.length / tarefas.length) * 100 : 0,
      discoveries: discoveries.length,
      discoveries_convertidos: discConv.length,
    };
  }, [deals, tarefas, discoveries]);

  // Por usuário
  const stats: UserStats[] = useMemo(() => {
    return profiles.map((u) => {
      const ud = deals.filter((d) => d.vendedor_id === u.id);
      const ganhos = ud.filter((d) => d.resultado === "ganho");
      const perdidos = ud.filter((d) => d.resultado === "perdido");
      const receita = ganhos.reduce((s, d) => s + Number(d.valor_total || 0), 0);
      const ut = tarefas.filter((t) => t.responsavel_id === u.id);
      const utConc = ut.filter((t) => t.status === "concluida");
      const utAtr = ut.filter((t) => t.status === "atrasada");
      const udisc = discoveries.filter((d) => d.vendedor_id === u.id);
      return {
        user: u,
        deals_total: ud.length,
        deals_ganhos: ganhos.length,
        deals_perdidos: perdidos.length,
        deals_andamento: ud.length - ganhos.length - perdidos.length,
        receita,
        ticket_medio: ganhos.length ? receita / ganhos.length : 0,
        conversao: ud.length ? (ganhos.length / ud.length) * 100 : 0,
        tarefas_total: ut.length,
        tarefas_concluidas: utConc.length,
        tarefas_atrasadas: utAtr.length,
        tarefas_taxa_conclusao: ut.length ? (utConc.length / ut.length) * 100 : 0,
        discoveries: udisc.length,
        discoveries_convertidos: udisc.filter((d) => d.unidade_gerada_id).length,
      };
    }).filter((s) => s.deals_total + s.tarefas_total + s.discoveries > 0)
      .sort((a, b) => b.receita - a.receita);
  }, [profiles, deals, tarefas, discoveries]);

  // Gráficos
  const chartReceitaPorUser = stats.slice(0, 10).map((s) => ({
    nome: s.user.nome.split(" ")[0],
    receita: s.receita,
    ganhos: s.deals_ganhos,
  }));

  const chartTarefasPorUser = stats.slice(0, 10).map((s) => ({
    nome: s.user.nome.split(" ")[0],
    concluidas: s.tarefas_concluidas,
    atrasadas: s.tarefas_atrasadas,
    pendentes: s.tarefas_total - s.tarefas_concluidas - s.tarefas_atrasadas,
  }));

  const chartLeadsPorUser = stats.slice(0, 10).map((s) => ({
    nome: s.user.nome.split(" ")[0],
    discoveries: s.discoveries,
    convertidos: s.discoveries_convertidos,
  }));

  const pieResultados = [
    { name: "Ganhos", value: totais.ganhos },
    { name: "Em andamento", value: totais.andamento },
    { name: "Perdidos", value: totais.perdidos },
  ];

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Gerencial</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de vendas, produtividade e Discovery.</p>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="ano">Último ano</SelectItem>
            <SelectItem value="tudo">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando dados...</div>
      ) : (
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="usuarios">Por Usuário</TabsTrigger>
          </TabsList>

          {/* ============ GERAL ============ */}
          <TabsContent value="geral" className="space-y-6">
            {/* KPIs principais */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard title="Receita Ganha" value={fmt(totais.receita)} icon={DollarSign} variant="primary" hint={`${totais.ganhos} deals ganhos`} />
              <KpiCard title="Conversão" value={`${totais.conversao.toFixed(1)}%`} icon={Target} variant="success" hint={`${totais.ganhos}/${totais.deals_total}`} />
              <KpiCard title="Ticket Médio" value={fmt(totais.ticket_medio)} icon={TrendingUp} variant="info" />
              <KpiCard title="Deals em Andamento" value={totais.andamento} icon={Trophy} variant="default" />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard title="Tarefas Concluídas" value={totais.tarefas_concluidas} icon={CheckCircle2} variant="success" hint={`${totais.tarefas_taxa.toFixed(0)}% de taxa`} />
              <KpiCard title="Tarefas Atrasadas" value={totais.tarefas_atrasadas} icon={AlertTriangle} variant="destructive" />
              <KpiCard title="Discoveries Criados" value={totais.discoveries} icon={Search} variant="info" />
              <KpiCard title="Convertidos em Unidade" value={totais.discoveries_convertidos} icon={UsersIcon} variant="success" hint={totais.discoveries ? `${((totais.discoveries_convertidos/totais.discoveries)*100).toFixed(0)}% conv.` : ""} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Receita por Vendedor (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartReceitaPorUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição de Deals</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieResultados} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {pieResultados.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tarefas por Vendedor (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartTarefasPorUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="concluidas" stackId="a" fill="hsl(var(--success))" />
                      <Bar dataKey="pendentes" stackId="a" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="atrasadas" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Geração de Leads (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartLeadsPorUser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="discoveries" fill="hsl(var(--info))" radius={[4,4,0,0]} />
                      <Bar dataKey="convertidos" fill="hsl(var(--success))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ POR USUÁRIO ============ */}
          <TabsContent value="usuarios" className="space-y-6">
            {/* Top 3 cards */}
            <div className="grid gap-3 md:grid-cols-3">
              {stats.slice(0, 3).map((s, i) => (
                <Card key={s.user.id} className={i === 0 ? "border-primary/40 shadow-glow" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className={i === 0 ? "h-5 w-5 text-warning" : "h-5 w-5 text-muted-foreground"} />
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">#{i+1}</span>
                      </div>
                      <Badge variant="secondary">{s.deals_ganhos} ganhos</Badge>
                    </div>
                    <div className="font-semibold truncate">{s.user.nome}</div>
                    <div className="text-2xl font-bold mt-2">{fmt(s.receita)}</div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                      <div><div className="text-muted-foreground">Conv.</div><div className="font-semibold">{s.conversao.toFixed(0)}%</div></div>
                      <div><div className="text-muted-foreground">Tarefas</div><div className="font-semibold">{s.tarefas_concluidas}/{s.tarefas_total}</div></div>
                      <div><div className="text-muted-foreground">Leads</div><div className="font-semibold">{s.discoveries}</div></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabela completa */}
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking Completo</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Ganhos</TableHead>
                        <TableHead className="text-right">Andam.</TableHead>
                        <TableHead className="text-right">Perdas</TableHead>
                        <TableHead className="text-right">Conv.</TableHead>
                        <TableHead className="text-right">Ticket Méd.</TableHead>
                        <TableHead className="text-right">Tarefas (✓/Tot)</TableHead>
                        <TableHead className="text-right">Atras.</TableHead>
                        <TableHead className="text-right">Disc.</TableHead>
                        <TableHead className="text-right">Conv. Disc.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.length === 0 && (
                        <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Sem dados no período.</TableCell></TableRow>
                      )}
                      {stats.map((s) => (
                        <TableRow key={s.user.id}>
                          <TableCell className="font-medium">{s.user.nome}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(s.receita)}</TableCell>
                          <TableCell className="text-right text-success">{s.deals_ganhos}</TableCell>
                          <TableCell className="text-right">{s.deals_andamento}</TableCell>
                          <TableCell className="text-right text-destructive">{s.deals_perdidos}</TableCell>
                          <TableCell className="text-right">{s.conversao.toFixed(0)}%</TableCell>
                          <TableCell className="text-right">{fmt(s.ticket_medio)}</TableCell>
                          <TableCell className="text-right">{s.tarefas_concluidas}/{s.tarefas_total}</TableCell>
                          <TableCell className="text-right">{s.tarefas_atrasadas > 0 ? <span className="text-destructive font-medium">{s.tarefas_atrasadas}</span> : 0}</TableCell>
                          <TableCell className="text-right">{s.discoveries}</TableCell>
                          <TableCell className="text-right text-success">{s.discoveries_convertidos}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
