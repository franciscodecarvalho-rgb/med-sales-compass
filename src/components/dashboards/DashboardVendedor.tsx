import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import {
  Kanban, CheckSquare, AlertTriangle, Building2, Snowflake, Wrench,
  Calendar, TrendingUp, Flame,
} from "lucide-react";
import {
  formatCurrency, daysBetween, STAGE_LABELS, STAGE_ORDER,
  TAREFA_PRIORIDADE_BADGE, TAREFA_PRIORIDADE_LABELS,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "./KpiCard";
import MetaAgendamentosCards from "./MetaAgendamentosCards";
import AgendaTab from "./AgendaTab";
import { toast } from "sonner";

export function DashboardVendedor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    dealsAbertos: 0, valorPipeline: 0, tarefasHoje: 0, tarefasAtrasadas: 0, discovery: 0,
  });
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [dealsAtencao, setDealsAtencao] = useState<any[]>([]);
  const [relacFrios, setRelacFrios] = useState<any[]>([]);
  const [pipelinePorEstagio, setPipelinePorEstagio] = useState<Record<string, { count: number; valor: number }>>({});
  const [discoveryUnidades, setDiscoveryUnidades] = useState<any[]>([]);

  useEffect(() => { if (user) void load(); }, [user]);

  async function load() {
    setLoading(true);
    // Sincroniza status de tarefas atrasadas antes de contar
    await supabase.rpc("marcar_tarefas_atrasadas");
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
    const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const abertasStatus = ["pendente", "em_andamento", "atrasada"] as const;
    const [vendas, manut, tHoje, tAtras, disc, allTarefas, allDeals, ultAnot, discList] = await Promise.all([
      supabase.from("deals").select("id, valor_total").eq("vendedor_id", user!.id).eq("resultado", "em_andamento").is("archived_at", null),
      supabase.from("deals_manutencao").select("id, valor_total").eq("vendedor_id", user!.id).eq("resultado", "em_andamento").is("archived_at", null),
      supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("responsavel_id", user!.id).in("status", abertasStatus).gte("data_vencimento", inicioHoje).lt("data_vencimento", fimHoje).is("archived_at", null),
      supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("responsavel_id", user!.id).in("status", abertasStatus).lt("data_vencimento", inicioHoje).is("archived_at", null),

      supabase.from("discovery").select("id", { count: "exact", head: true }).eq("vendedor_id", user!.id).eq("status", "em_pesquisa").is("archived_at", null),
      supabase.from("tarefas").select("*, deals(titulo), unidades_saude(nome), medicos(nome)").eq("responsavel_id", user!.id).in("status", ["pendente", "em_andamento", "atrasada"]).is("archived_at", null).order("data_vencimento", { ascending: true, nullsFirst: false }).limit(30),
      supabase.from("deals").select("id, titulo, valor_total, estagio, data_entrada_estagio, unidades_saude(nome), linhas_produto(nome, cor, limite_amarelo_dias, limite_verde_dias)").eq("vendedor_id", user!.id).eq("resultado", "em_andamento").is("archived_at", null),
      supabase.from("anotacoes").select("medico_id, unidade_id, created_at").eq("autor_id", user!.id).is("archived_at", null).order("created_at", { ascending: false }).limit(500),
      supabase.from("discovery").select("id, nome, cidade, porte, estados(sigla)").eq("vendedor_id", user!.id).eq("status", "em_pesquisa").is("archived_at", null).limit(8),
    ]);

    const valorVendas = (vendas.data ?? []).reduce((s, d) => s + Number(d.valor_total || 0), 0);
    const valorManut = (manut.data ?? []).reduce((s, d) => s + Number(d.valor_total || 0), 0);

    setKpis({
      dealsAbertos: (vendas.data?.length ?? 0) + (manut.data?.length ?? 0),
      valorPipeline: valorVendas + valorManut,
      tarefasHoje: tHoje.count ?? 0,
      tarefasAtrasadas: tAtras.count ?? 0,
      discovery: disc.count ?? 0,
    });

    // ordena tarefas: deal > medico/unidade > livre
    const sorted = (allTarefas.data ?? []).sort((a, b) => {
      const rank = (t: any) => t.deal_id ? 0 : (t.medico_id || t.unidade_id ? 1 : 2);
      return rank(a) - rank(b);
    });
    setTarefas(sorted.slice(0, 12));

    // deals atenção: parados além do limite amarelo
    const atencao = (allDeals.data ?? [])
      .map(d => {
        const dias = daysBetween(d.data_entrada_estagio);
        const limite = (d.linhas_produto as any)?.limite_amarelo_dias ?? 14;
        return { ...d, dias, vermelho: dias > limite };
      })
      .filter(d => d.vermelho)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 6);
    setDealsAtencao(atencao);

    // pipeline por estágio
    const pipe: Record<string, { count: number; valor: number }> = {};
    STAGE_ORDER.forEach(s => { pipe[s] = { count: 0, valor: 0 }; });
    (allDeals.data ?? []).forEach(d => {
      pipe[d.estagio] ||= { count: 0, valor: 0 };
      pipe[d.estagio].count++;
      pipe[d.estagio].valor += Number(d.valor_total || 0);
    });
    setPipelinePorEstagio(pipe);

    // relacionamentos frios
    const ultMed: Record<string, string> = {};
    const ultUni: Record<string, string> = {};
    (ultAnot.data ?? []).forEach(a => {
      if (a.medico_id && !ultMed[a.medico_id]) ultMed[a.medico_id] = a.created_at;
      if (a.unidade_id && !ultUni[a.unidade_id]) ultUni[a.unidade_id] = a.created_at;
    });
    const limiteFrio = new Date(trintaDias);
    const friosMedIds = Object.entries(ultMed).filter(([, d]) => new Date(d) < limiteFrio).map(([id, d]) => ({ id, ultimo: d }));
    const friosUniIds = Object.entries(ultUni).filter(([, d]) => new Date(d) < limiteFrio).map(([id, d]) => ({ id, ultimo: d }));

    const [meds, unis] = await Promise.all([
      friosMedIds.length ? supabase.from("medicos").select("id, nome").in("id", friosMedIds.map(x => x.id)) : Promise.resolve({ data: [] as any[] }),
      friosUniIds.length ? supabase.from("unidades_saude").select("id, nome").in("id", friosUniIds.map(x => x.id)) : Promise.resolve({ data: [] as any[] }),
    ]);
    const frios = [
      ...(meds.data ?? []).map(m => ({ ...m, tipo: "medico" as const, ultimo: friosMedIds.find(x => x.id === m.id)!.ultimo })),
      ...(unis.data ?? []).map(u => ({ ...u, tipo: "unidade" as const, ultimo: friosUniIds.find(x => x.id === u.id)!.ultimo })),
    ].sort((a, b) => new Date(a.ultimo).getTime() - new Date(b.ultimo).getTime()).slice(0, 8);
    setRelacFrios(frios);

    setDiscoveryUnidades(discList.data ?? []);
    setLoading(false);
  }

  async function toggleTarefa(t: any) {
    const novo = t.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase.from("tarefas").update({
      status: novo,
      concluida_em: novo === "concluida" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) return toast.error("Erro ao atualizar tarefa");
    void load();
  }

  const maxValor = Math.max(...Object.values(pipelinePorEstagio).map(p => p.valor), 1);

  return (
    <div className="space-y-6 p-6">
      {/* Meta diária — primeira coisa que o vendedor vê ao abrir o painel */}
      {user && <MetaAgendamentosCards userId={user.id} showHistorico canRegister />}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu painel</h1>
        <p className="text-sm text-muted-foreground">Sua atividade comercial em um relance</p>
      </div>

      <Tabs defaultValue="painel">
        <TabsList>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-6 space-y-6">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Deals abertos" value={kpis.dealsAbertos} icon={Kanban} variant="primary" />
        <KpiCard title="Pipeline ativo" value={formatCurrency(kpis.valorPipeline)} icon={TrendingUp} variant="info" />
        <KpiCard title="Tarefas hoje" value={kpis.tarefasHoje} icon={Calendar} variant="warning" />
        <KpiCard title="Atrasadas" value={kpis.tarefasAtrasadas} icon={AlertTriangle} variant="destructive" />
        <KpiCard title="Discovery" value={kpis.discovery} icon={Building2} variant="default" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" />Tarefas do dia</CardTitle>
            <Link to="/tarefas" className="text-xs text-primary hover:underline">ver todas →</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!loading && tarefas.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas pendentes. 🎉</p>}
            {tarefas.map(t => {
              const overdue = t.status === "atrasada" || (t.data_vencimento && new Date(t.data_vencimento) < new Date());
              const link = t.deal_id ? `/deals/${t.deal_id}` : t.medico_id ? `/medicos/${t.medico_id}` : t.unidade_id ? `/unidades/${t.unidade_id}` : "/tarefas";
              const entidade = t.deals?.titulo || t.medicos?.nome || t.unidades_saude?.nome;
              return (
                <div key={t.id} className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${overdue ? "border-destructive/40 bg-destructive/5" : t.deal_id ? "border-l-4 border-l-primary" : "hover:bg-muted/40"}`}>
                  <Checkbox checked={t.status === "concluida"} onCheckedChange={() => toggleTarefa(t)} className="mt-0.5" />
                  <Link to={link} className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.titulo}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${TAREFA_PRIORIDADE_BADGE[t.prioridade as keyof typeof TAREFA_PRIORIDADE_BADGE]}`}>
                        {TAREFA_PRIORIDADE_LABELS[t.prioridade as keyof typeof TAREFA_PRIORIDADE_LABELS]}
                      </Badge>
                      {entidade && <span className="text-[11px] text-muted-foreground truncate">{entidade}</span>}
                      {t.data_vencimento && (
                        <span className={`text-[11px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {format(new Date(t.data_vencimento), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-destructive" />Deals com atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && dealsAtencao.length === 0 && <p className="text-sm text-muted-foreground">Nenhum deal parado. 👍</p>}
            {dealsAtencao.map(d => (
              <Link key={d.id} to={`/deals/${d.id}`} className="block">
                <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 hover:bg-destructive/10 transition-colors">
                  <div className="h-8 w-1 rounded-full" style={{ backgroundColor: d.linhas_produto?.cor || "hsl(var(--primary))" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{d.titulo}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.unidades_saude?.nome} · {STAGE_LABELS[d.estagio as keyof typeof STAGE_LABELS]}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(d.valor_total)}</div>
                    <div className="font-mono text-[11px] text-destructive">{d.dias}d parado</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Meu pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STAGE_ORDER.filter(s => s !== "finalizado").map(stage => {
              const p = pipelinePorEstagio[stage] || { count: 0, valor: 0 };
              const pct = (p.valor / maxValor) * 100;
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{STAGE_LABELS[stage]}</span>
                    <span className="text-muted-foreground">{p.count} · {formatCurrency(p.valor)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Snowflake className="h-5 w-5 text-info" />Relacionamentos frios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && relacFrios.length === 0 && <p className="text-sm text-muted-foreground">Todos os contatos em dia. ❄️→🔥</p>}
            {relacFrios.map(r => {
              const dias = daysBetween(r.ultimo);
              const link = r.tipo === "medico" ? `/medicos/${r.id}` : `/unidades/${r.id}`;
              return (
                <Link key={`${r.tipo}-${r.id}`} to={link} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.tipo === "medico" ? <Wrench className="h-4 w-4 text-muted-foreground shrink-0" /> : <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{r.tipo === "medico" ? `Dr. ${r.nome}` : r.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{r.tipo === "medico" ? "Médico" : "Unidade"}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">há {dias}d</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-info" />Discovery</CardTitle>
          <Link to="/unidades" className="text-xs text-primary hover:underline">ver todas →</Link>
        </CardHeader>
        <CardContent>
          {discoveryUnidades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma unidade em discovery.</p>}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {discoveryUnidades.map(u => (
              <Link key={u.id} to={`/unidades/${u.id}`} className="rounded-md border p-3 hover:bg-muted/40 transition-colors">
                <div className="font-medium text-sm truncate">{u.nome}</div>
                <div className="text-[11px] text-muted-foreground truncate">{u.cidade || "—"}{u.estado ? ` · ${u.estado}` : ""}</div>
                {u.porte && <Badge variant="outline" className="text-[10px] mt-1">{u.porte}</Badge>}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          {user && <AgendaTab userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
