import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Wrench, Activity, ClipboardCheck, FileWarning, ShieldCheck, AlertCircle,
} from "lucide-react";
import {
  CHAMADO_PRIORIDADE_BADGE, CHAMADO_PRIORIDADE_LABELS,
  CHAMADO_STATUS_BADGE, CHAMADO_STATUS_LABELS,
  INSTALACAO_STATUS_BADGE, INSTALACAO_STATUS_LABELS, INSTALACAO_TIPO_LABELS,
  daysBetween,
} from "@/lib/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KpiCard } from "./KpiCard";

const PRIO_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

export function DashboardTecnico() {
  const [loading, setLoading] = useState(true);
  const [chamados, setChamados] = useState<any[]>([]);
  const [instalacoes, setInstalacoes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [garantias, setGarantias] = useState<any[]>([]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const limite30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const hoje = new Date().toISOString().slice(0, 10);
    const [ch, ins, ct, gr] = await Promise.all([
      supabase.from("chamados").select("*, unidades_saude(nome)").in("status", ["aberto", "em_atendimento"]).is("archived_at", null).limit(50),
      supabase.from("instalacoes").select("*, unidades_saude(nome)").in("status", ["pendente", "em_andamento"]).is("archived_at", null).limit(50),
      supabase.from("contratos_manutencao").select("*, unidades_saude(nome)").lte("vigencia_fim", limite30).gte("vigencia_fim", hoje).is("archived_at", null).limit(50),
      supabase.from("garantias").select("*, unidades_saude(nome)").lte("data_fim", limite30).gte("data_fim", hoje).is("archived_at", null).limit(50),
    ]);

    const sorted = (ch.data ?? []).sort((a, b) => {
      const p = (PRIO_ORDER[a.prioridade] ?? 9) - (PRIO_ORDER[b.prioridade] ?? 9);
      return p !== 0 ? p : new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime();
    });
    setChamados(sorted);
    setInstalacoes(ins.data ?? []);
    setContratos(ct.data ?? []);
    setGarantias(gr.data ?? []);
    setLoading(false);
  }

  const abertos = chamados.filter(c => c.status === "aberto");
  const emAtend = chamados.filter(c => c.status === "em_atendimento");
  const instPend = instalacoes.filter(i => i.tipo === "instalacao" && i.status === "pendente");
  const aplPend = instalacoes.filter(i => i.tipo === "aplicacao" && i.status === "pendente");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel técnico</h1>
        <p className="text-sm text-muted-foreground">Suas operações e alertas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Chamados abertos" value={abertos.length} icon={Wrench} variant="info" />
        <KpiCard title="Em atendimento" value={emAtend.length} icon={Activity} variant="warning" />
        <KpiCard title="Instalações pendentes" value={instPend.length} icon={ClipboardCheck} variant="primary" />
        <KpiCard title="Aplicações pendentes" value={aplPend.length} icon={ClipboardCheck} variant="default" />
        <KpiCard title="Contratos a vencer" value={contratos.length} icon={FileWarning} variant="warning" hint="próximos 30 dias" />
        <KpiCard title="Garantias a vencer" value={garantias.length} icon={ShieldCheck} variant="warning" hint="próximos 30 dias" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Chamados abertos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!loading && chamados.length === 0 && <p className="text-sm text-muted-foreground">Sem chamados abertos.</p>}
          {chamados.map(c => {
            const dias = daysBetween(c.data_abertura);
            const cor = dias < 1 ? "text-success" : dias < 3 ? "text-warning" : "text-destructive";
            return (
              <Link key={c.id} to={`/unidades/${c.unidade_id}`} className="block">
                <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{c.descricao_equipamento}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.unidades_saude?.nome} · {c.descricao_problema}</div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${CHAMADO_PRIORIDADE_BADGE[c.prioridade as keyof typeof CHAMADO_PRIORIDADE_BADGE]}`}>{CHAMADO_PRIORIDADE_LABELS[c.prioridade as keyof typeof CHAMADO_PRIORIDADE_LABELS]}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${CHAMADO_STATUS_BADGE[c.status as keyof typeof CHAMADO_STATUS_BADGE]}`}>{CHAMADO_STATUS_LABELS[c.status as keyof typeof CHAMADO_STATUS_LABELS]}</Badge>
                  <span className={`font-mono text-xs ${cor}`}>{dias}d</span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Instalações e aplicações pendentes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!loading && instalacoes.length === 0 && <p className="text-sm text-muted-foreground">Nada pendente.</p>}
          {instalacoes.map(i => (
            <Link key={i.id} to={`/unidades/${i.unidade_id}`} className="block">
              <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{i.unidades_saude?.nome}</div>
                  <div className="text-[11px] text-muted-foreground">{INSTALACAO_TIPO_LABELS[i.tipo as keyof typeof INSTALACAO_TIPO_LABELS]}{i.data_prevista ? ` · ${format(new Date(i.data_prevista), "dd/MM/yyyy", { locale: ptBR })}` : ""}</div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${INSTALACAO_STATUS_BADGE[i.status as keyof typeof INSTALACAO_STATUS_BADGE]}`}>{INSTALACAO_STATUS_LABELS[i.status as keyof typeof INSTALACAO_STATUS_LABELS]}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />Alertas — próximos 30 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Contratos a vencer</div>
              <div className="space-y-2">
                {contratos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum.</p>}
                {contratos.map(c => (
                  <Link key={c.id} to={`/unidades/${c.unidade_id}`} className="block rounded-md border border-warning/30 bg-warning/5 p-2 hover:bg-warning/10 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{c.unidades_saude?.nome}</div>
                      <span className="text-[11px] font-mono text-warning shrink-0">{format(new Date(c.vigencia_fim), "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{c.tipo_contrato}</div>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Garantias a vencer</div>
              <div className="space-y-2">
                {garantias.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma.</p>}
                {garantias.map(g => (
                  <Link key={g.id} to={`/unidades/${g.unidade_id}`} className="block rounded-md border border-warning/30 bg-warning/5 p-2 hover:bg-warning/10 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{g.unidades_saude?.nome}</div>
                      <span className="text-[11px] font-mono text-warning shrink-0">{format(new Date(g.data_fim), "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{g.descricao_equipamento}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
