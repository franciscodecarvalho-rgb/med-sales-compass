import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { TAREFA_PRIORIDADE_LABELS } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Tarefas() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [view, setView] = useState<"hoje" | "atrasadas" | "todas" | "concluidas">("hoje");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) void load(); }, [user, view]);

  async function load() {
    setLoading(true);
    let q = supabase.from("tarefas")
      .select("*, deals(titulo), unidades_saude(nome), medicos(nome)")
      .eq("responsavel_id", user!.id)
      .order("data_vencimento", { ascending: true, nullsFirst: false });

    if (view === "concluidas") q = q.eq("status", "concluida");
    else q = q.in("status", ["pendente", "em_andamento"]);

    const { data, error } = await q;
    if (error) toast.error(error.message);
    let filtered = data ?? [];
    const now = new Date();
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    if (view === "hoje") {
      filtered = filtered.filter((t) =>
        t.data_vencimento && new Date(t.data_vencimento) <= endOfDay
      );
    } else if (view === "atrasadas") {
      filtered = filtered.filter((t) =>
        t.data_vencimento && new Date(t.data_vencimento) < now
      );
    }
    setItems(filtered);
    setLoading(false);
  }

  async function toggleConcluir(t: any) {
    const novo = t.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase.from("tarefas").update({
      status: novo,
      concluida_em: novo === "concluida" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-sm text-muted-foreground">Hub central de atividades</p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="atrasadas">Atrasadas</TabsTrigger>
          <TabsTrigger value="todas">Todas pendentes</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {items.map((t) => {
            const overdue = t.data_vencimento && new Date(t.data_vencimento) < new Date() && t.status !== "concluida";
            const link = t.deal_id ? `/deals/${t.deal_id}` :
                         t.unidade_id ? `/unidades/${t.unidade_id}` :
                         t.medico_id ? `/medicos/${t.medico_id}` : null;
            return (
              <Card key={t.id} className={overdue ? "border-destructive/40" : ""}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Checkbox
                    checked={t.status === "concluida"}
                    onCheckedChange={() => toggleConcluir(t)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                      {t.titulo}
                    </div>
                    {t.descricao && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {TAREFA_PRIORIDADE_LABELS[t.prioridade as keyof typeof TAREFA_PRIORIDADE_LABELS]}
                      </Badge>
                      {t.data_vencimento && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                          {format(new Date(t.data_vencimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {link && (
                        <Link to={link} className="text-xs text-primary hover:underline">
                          {t.deals?.titulo || t.unidades_saude?.nome || (t.medicos?.nome && `Dr. ${t.medicos.nome}`)}
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              <CheckSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
              Nenhuma tarefa nesta visão.
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
