import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KpiCard } from "./KpiCard";

export function DashboardAssistente() {
  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [faturados, setFaturados] = useState<any[]>([]);
  const [valorMes, setValorMes] = useState(0);
  const [qtdMes, setQtdMes] = useState(0);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const [ganhos, fats] = await Promise.all([
      supabase.from("deals").select("id, titulo, valor_total, data_fechamento, vendedor_id, unidades_saude(nome), profiles!deals_vendedor_id_fkey:profiles(nome)").eq("resultado", "ganho").is("archived_at", null).limit(200),
      supabase.from("faturamento").select("*, deals(titulo, unidades_saude(nome))").is("archived_at", null).order("data_faturamento", { ascending: false }).limit(50),
    ]);
    const faturadosIds = new Set((fats.data ?? []).map((f: any) => f.deal_id));
    setPendentes((ganhos.data ?? []).filter(d => !faturadosIds.has(d.id)));
    setFaturados(fats.data ?? []);
    const noMes = (fats.data ?? []).filter((f: any) => f.data_faturamento >= inicioMes);
    setQtdMes(noMes.length);
    setValorMes(noMes.reduce((s: number, f: any) => s + Number(f.valor_faturado || 0), 0));
    setLoading(false);
  }

  const valorPendente = pendentes.reduce((s, d) => s + Number(d.valor_total || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de faturamento</h1>
        <p className="text-sm text-muted-foreground">Sua fila de notas fiscais</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Aguardando faturamento" value={pendentes.length} icon={Clock} variant="warning" />
        <KpiCard title="Valor pendente" value={formatCurrency(valorPendente)} icon={DollarSign} variant="info" />
        <KpiCard title="Faturado no mês" value={qtdMes} hint={formatCurrency(valorMes)} icon={CheckCircle2} variant="success" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-warning" />Fila de faturamento</CardTitle>
          <Link to="/faturamento" className="text-xs text-primary hover:underline">abrir página →</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {!loading && pendentes.length === 0 && <p className="text-sm text-muted-foreground">Tudo faturado. 🎉</p>}
          {pendentes.map(d => (
            <div key={d.id} className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.titulo}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {d.unidades_saude?.nome} · {d.profiles?.nome || "—"}
                  {d.data_fechamento && ` · fechado em ${format(new Date(d.data_fechamento), "dd/MM/yyyy", { locale: ptBR })}`}
                </div>
              </div>
              <div className="text-sm font-semibold shrink-0">{formatCurrency(d.valor_total)}</div>
              <Button asChild size="sm">
                <Link to={`/faturamento?deal=${d.id}`}>Faturar</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-success" />Faturados recentemente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!loading && faturados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum faturamento registrado.</p>}
          {faturados.slice(0, 10).map(f => (
            <div key={f.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{f.deals?.titulo || "—"}</div>
                <div className="text-[11px] text-muted-foreground truncate">NF {f.numero_nf} · {f.deals?.unidades_saude?.nome}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{formatCurrency(f.valor_faturado)}</div>
                <div className="text-[11px] text-muted-foreground">{format(new Date(f.data_faturamento), "dd/MM/yyyy", { locale: ptBR })}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
