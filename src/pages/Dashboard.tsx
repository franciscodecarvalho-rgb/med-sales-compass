import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, UserRound, Kanban, CheckSquare, TrendingUp, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, STAGE_LABELS, TAREFA_PRIORIDADE_LABELS } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { user, isAdminOrGerente } = useAuth();
  const [stats, setStats] = useState({
    unidades: 0,
    medicos: 0,
    dealsAbertos: 0,
    valorPipeline: 0,
  });
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [meusDeals, setMeusDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [un, md, dl, tk] = await Promise.all([
      supabase.from("unidades_saude").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase.from("medicos").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase.from("deals").select("id, valor_total").eq("resultado", "em_andamento").is("archived_at", null),
      supabase.from("tarefas").select("*").eq("responsavel_id", user!.id).neq("status", "concluida").neq("status", "cancelada").order("data_vencimento", { ascending: true, nullsFirst: false }).limit(8),
    ]);

    const valor = (dl.data ?? []).reduce((s, d) => s + Number(d.valor_total || 0), 0);
    setStats({
      unidades: un.count ?? 0,
      medicos: md.count ?? 0,
      dealsAbertos: dl.data?.length ?? 0,
      valorPipeline: valor,
    });
    setTarefas(tk.data ?? []);

    const { data: mDeals } = await supabase
      .from("deals")
      .select("id, titulo, valor_total, estagio, data_entrada_estagio, unidades_saude(nome), linhas_produto(nome, cor)")
      .eq("vendedor_id", user!.id)
      .eq("resultado", "em_andamento")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(6);
    setMeusDeals(mDeals ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu dia</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Unidades de Saúde" value={stats.unidades} icon={Building2} />
        <KpiCard title="Médicos cadastrados" value={stats.medicos} icon={UserRound} />
        <KpiCard title="Deals em aberto" value={stats.dealsAbertos} icon={Kanban} />
        <KpiCard
          title="Pipeline"
          value={formatCurrency(stats.valorPipeline)}
          icon={TrendingUp}
          highlight
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tarefas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Minhas tarefas
            </CardTitle>
            <Link to="/tarefas" className="text-xs text-primary hover:underline">
              ver todas →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!loading && tarefas.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem tarefas pendentes. 🎉</p>
            )}
            {tarefas.map((t) => {
              const overdue = t.data_vencimento && new Date(t.data_vencimento) < new Date();
              return (
                <div key={t.id} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${
                    t.prioridade === "alta" ? "bg-destructive" :
                    t.prioridade === "media" ? "bg-warning" : "bg-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.titulo}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {TAREFA_PRIORIDADE_LABELS[t.prioridade as keyof typeof TAREFA_PRIORIDADE_LABELS]}
                      </Badge>
                      {t.data_vencimento && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {overdue && <AlertCircle className="h-3 w-3" />}
                          {format(new Date(t.data_vencimento), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Meus deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-primary" />
              {isAdminOrGerente ? "Deals recentes" : "Meus deals"}
            </CardTitle>
            <Link to="/funil-vendas" className="text-xs text-primary hover:underline">
              abrir funil →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && meusDeals.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum deal em andamento.</p>
            )}
            {meusDeals.map((d) => (
              <Link key={d.id} to={`/deals/${d.id}`} className="block">
                <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors">
                  <div
                    className="h-8 w-1 rounded-full"
                    style={{ backgroundColor: d.linhas_produto?.cor || "hsl(var(--primary))" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{d.titulo}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.unidades_saude?.nome} · {d.linhas_produto?.nome}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(d.valor_total)}</div>
                    <Badge variant="secondary" className="text-[10px]">
                      {STAGE_LABELS[d.estagio as keyof typeof STAGE_LABELS]}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, highlight }: {
  title: string; value: string | number; icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 shadow-glow" : ""}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          highlight ? "gradient-primary text-primary-foreground" : "bg-muted text-primary"
        }`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
