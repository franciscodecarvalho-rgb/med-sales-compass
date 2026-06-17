import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  playbooks, resolvePlaybookKey, ETAPAS_PLAYBOOK, PLAYBOOKS_DISPONIVEIS, type EtapaKey,
} from "@/config/playbooks";

interface Props {
  dealId: string;
  linhaNome?: string | null;
  estagioAtual?: string; // estágio do deal — só para destacar a aba correspondente
}

interface ProgressRow { playbook: string; etapa: string; item_id: string; checked: boolean; checked_at: string | null; checked_by_nome?: string | null }

export default function PlaybookTab({ dealId, linhaNome, estagioAtual }: Props) {
  const { user } = useAuth();
  const [playbookKey, setPlaybookKey] = useState<string>(() => resolvePlaybookKey(linhaNome));
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);

  // chave do progresso: `${etapa}:${item_id}` (item_id já é globalmente único)
  const pkey = (etapa: string, itemId: string) => `${etapa}:${itemId}`;

  useEffect(() => { void load(); }, [dealId, playbookKey]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_playbook_progress")
      .select("playbook, etapa, item_id, checked, checked_at, profiles:checked_by(nome)")
      .eq("deal_id", dealId)
      .eq("playbook", playbookKey);
    if (error) toast.error(error.message);
    const map: Record<string, ProgressRow> = {};
    (data ?? []).forEach((r: any) => {
      map[pkey(r.etapa, r.item_id)] = {
        playbook: r.playbook, etapa: r.etapa, item_id: r.item_id,
        checked: r.checked, checked_at: r.checked_at, checked_by_nome: r.profiles?.nome,
      };
    });
    setProgress(map);
    setLoading(false);
  }

  async function toggle(etapa: EtapaKey, itemId: string) {
    if (!user) return;
    const k = pkey(etapa, itemId);
    const atual = progress[k]?.checked ?? false;
    const novo = !atual;

    // update otimista
    setProgress(p => ({
      ...p,
      [k]: { playbook: playbookKey, etapa, item_id: itemId, checked: novo,
             checked_at: novo ? new Date().toISOString() : null, checked_by_nome: novo ? "você" : null },
    }));

    const { error } = await supabase.from("deal_playbook_progress").upsert({
      deal_id: dealId, playbook: playbookKey, etapa, item_id: itemId,
      checked: novo,
      checked_by: novo ? user.id : null,
      checked_at: novo ? new Date().toISOString() : null,
    }, { onConflict: "deal_id,playbook,etapa,item_id" });

    if (error) {
      toast.error(error.message);
      setProgress(p => ({ ...p, [k]: { ...p[k], checked: atual } }));
    }
  }

  const conteudo = playbooks[playbookKey];

  // mapeia estágio do deal → aba de playbook (só pra default/destaque)
  const etapaDoDeal: EtapaKey | undefined = useMemo(() => {
    const e = estagioAtual ?? "";
    return (ETAPAS_PLAYBOOK.find(x => x.key === e)?.key);
  }, [estagioAtual]);

  const [tab, setTab] = useState<EtapaKey>(etapaDoDeal ?? "prospeccao");
  useEffect(() => { if (etapaDoDeal) setTab(etapaDoDeal); }, [etapaDoDeal]);

  function progressoEtapa(etapa: EtapaKey) {
    const items = conteudo[etapa].items;
    const done = items.filter(i => progress[pkey(etapa, i.id)]?.checked).length;
    return { done, total: items.length };
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      {/* Seletor de playbook */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Playbook:</span>
        <Select value={playbookKey} onValueChange={setPlaybookKey}>
          <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLAYBOOKS_DISPONIVEIS.map(p => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {resolvePlaybookKey(linhaNome) === playbookKey && linhaNome && (
          <span className="text-xs text-muted-foreground">(sugerido pela linha: {linhaNome})</span>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as EtapaKey)}>
        <TabsList className="flex flex-wrap h-auto">
          {ETAPAS_PLAYBOOK.map(e => {
            const { done, total } = progressoEtapa(e.key);
            const isAtual = etapaDoDeal === e.key;
            return (
              <TabsTrigger key={e.key} value={e.key} className="gap-1.5">
                {isAtual && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Etapa atual do deal" />}
                {e.label}
                <span className={cn("text-[10px]", done === total && total > 0 ? "text-success" : "text-muted-foreground")}>
                  {done}/{total}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ETAPAS_PLAYBOOK.map(e => {
          const items = conteudo[e.key].items;
          const { done, total } = progressoEtapa(e.key);
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <TabsContent key={e.key} value={e.key} className="space-y-3 mt-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{done} de {total} itens concluídos</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full transition-all", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {items.map(item => {
                const row = progress[pkey(e.key, item.id)];
                const checked = row?.checked ?? false;
                return (
                  <div key={item.id} className={cn(
                    "rounded-lg border p-3 transition-colors",
                    checked ? "bg-success/5 border-success/30" : "bg-card"
                  )}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(e.key, item.id)}
                        className="mt-0.5 h-5 w-5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className={cn("text-sm font-medium", checked && "text-muted-foreground")}>
                          {item.item}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.guidance}</p>
                        {checked && row?.checked_at && (
                          <p className="text-[10px] text-muted-foreground">
                            ✓ {row.checked_by_nome ?? ""} · {format(new Date(row.checked_at), "dd/MM HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
