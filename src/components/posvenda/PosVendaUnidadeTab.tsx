import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CHAMADO_PRIORIDADE_BADGE, CHAMADO_PRIORIDADE_LABELS,
  CHAMADO_STATUS_BADGE, CHAMADO_STATUS_LABELS,
  INSTALACAO_STATUS_BADGE, INSTALACAO_STATUS_LABELS, INSTALACAO_TIPO_LABELS,
  CONTRATO_STATUS_BADGE, CONTRATO_STATUS_LABELS,
  GARANTIA_STATUS_BADGE, GARANTIA_STATUS_LABELS,
  computeVigenciaStatus, formatCurrency, npsColorClass,
} from "@/lib/crm";

interface Props { unidadeId: string }

export default function PosVendaUnidadeTab({ unidadeId }: Props) {
  const [chamados, setChamados] = useState<any[]>([]);
  const [inst, setInst] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [garantias, setGarantias] = useState<any[]>([]);
  const [npsList, setNpsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, b, c, d, e] = await Promise.all([
        supabase.from("chamados").select("*").eq("unidade_id", unidadeId).is("archived_at", null).order("data_abertura", { ascending: false }),
        supabase.from("instalacoes").select("*").eq("unidade_id", unidadeId).is("archived_at", null).order("data_prevista", { ascending: false, nullsFirst: false }),
        supabase.from("contratos_manutencao").select("*").eq("unidade_id", unidadeId).is("archived_at", null).order("vigencia_fim"),
        supabase.from("garantias").select("*").eq("unidade_id", unidadeId).is("archived_at", null).order("data_fim"),
        supabase.from("nps").select("*").eq("unidade_id", unidadeId).is("archived_at", null).order("data", { ascending: false }),
      ]);
      setChamados(a.data ?? []); setInst(b.data ?? []); setContratos(c.data ?? []);
      setGarantias(d.data ?? []); setNpsList(e.data ?? []);
      setLoading(false);
    })();
  }, [unidadeId]);

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">Carregando...</div>;

  const Section = ({ title, count, children }: any) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title} <span className="text-muted-foreground font-normal">({count})</span></h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <Section title="Chamados" count={chamados.length}>
        {chamados.length === 0 ? <Card><CardContent className="p-3 text-xs text-muted-foreground">Sem chamados.</CardContent></Card> : chamados.map((c) => (
          <Card key={c.id}><CardContent className="flex items-center justify-between p-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{c.descricao_equipamento}</div>
              <div className="text-xs text-muted-foreground truncate">{c.descricao_problema}</div>
            </div>
            <Badge variant="outline" className={CHAMADO_PRIORIDADE_BADGE[c.prioridade]}>{CHAMADO_PRIORIDADE_LABELS[c.prioridade]}</Badge>
            <Badge variant="outline" className={CHAMADO_STATUS_BADGE[c.status]}>{CHAMADO_STATUS_LABELS[c.status]}</Badge>
          </CardContent></Card>
        ))}
      </Section>

      <Section title="Instalações / Aplicações" count={inst.length}>
        {inst.length === 0 ? <Card><CardContent className="p-3 text-xs text-muted-foreground">Sem registros.</CardContent></Card> : inst.map((i) => (
          <Card key={i.id}><CardContent className="flex items-center justify-between p-3 gap-3">
            <div className="text-sm">
              <span className="font-medium">{INSTALACAO_TIPO_LABELS[i.tipo as keyof typeof INSTALACAO_TIPO_LABELS]}</span>
              <span className="text-muted-foreground"> • {i.data_prevista ? new Date(i.data_prevista).toLocaleDateString("pt-BR") : "sem data"}</span>
            </div>
            <Badge variant="outline" className={INSTALACAO_STATUS_BADGE[i.status as keyof typeof INSTALACAO_STATUS_BADGE]}>{INSTALACAO_STATUS_LABELS[i.status as keyof typeof INSTALACAO_STATUS_LABELS]}</Badge>
          </CardContent></Card>
        ))}
      </Section>

      <Section title="Contratos de Manutenção" count={contratos.length}>
        {contratos.length === 0 ? <Card><CardContent className="p-3 text-xs text-muted-foreground">Sem contratos.</CardContent></Card> : contratos.map((c) => {
          const computed = computeVigenciaStatus(c.vigencia_fim);
          const k = computed === "vencida" ? "vencido" : computed === "a_vencer" ? "a_vencer" : "ativo";
          return (
            <Card key={c.id}><CardContent className="flex items-center justify-between p-3 gap-3">
              <div className="text-sm">
                <div className="font-medium">{c.tipo_contrato}</div>
                <div className="text-xs text-muted-foreground">Até {new Date(c.vigencia_fim).toLocaleDateString("pt-BR")} • {formatCurrency(Number(c.valor))}</div>
              </div>
              <Badge variant="outline" className={CONTRATO_STATUS_BADGE[k as any]}>{CONTRATO_STATUS_LABELS[k as any]}</Badge>
            </CardContent></Card>
          );
        })}
      </Section>

      <Section title="Garantias" count={garantias.length}>
        {garantias.length === 0 ? <Card><CardContent className="p-3 text-xs text-muted-foreground">Sem garantias.</CardContent></Card> : garantias.map((g) => {
          const computed = computeVigenciaStatus(g.data_fim);
          return (
            <Card key={g.id}><CardContent className="flex items-center justify-between p-3 gap-3">
              <div className="text-sm">
                <div className="font-medium">{g.descricao_equipamento}</div>
                <div className="text-xs text-muted-foreground">Até {new Date(g.data_fim).toLocaleDateString("pt-BR")}</div>
              </div>
              <Badge variant="outline" className={GARANTIA_STATUS_BADGE[computed as any]}>{GARANTIA_STATUS_LABELS[computed as any]}</Badge>
            </CardContent></Card>
          );
        })}
      </Section>

      <Section title="NPS" count={npsList.length}>
        {npsList.length === 0 ? <Card><CardContent className="p-3 text-xs text-muted-foreground">Sem registros.</CardContent></Card> : npsList.map((n) => (
          <Card key={n.id}><CardContent className="flex items-center justify-between p-3 gap-3">
            <div className="text-sm">
              <div className="font-medium">{new Date(n.data).toLocaleDateString("pt-BR")}</div>
              {n.comentarios && <div className="text-xs text-muted-foreground line-clamp-1">{n.comentarios}</div>}
            </div>
            <Badge variant="outline" className={`${npsColorClass(n.nota)} font-bold`}>{n.nota}</Badge>
          </CardContent></Card>
        ))}
      </Section>
    </div>
  );
}
