import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, ShoppingCart, Pause, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CONSUMIVEL_STATUS_LABELS, CONSUMIVEL_STATUS_BADGE,
  ORIGEM_EQUIPAMENTO_LABELS,
  type ConsumiveiStatus, type OrigemEquipamento,
} from "@/lib/crm";
import RegistrarCompraDialog from "./RegistrarCompraDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_ORDER: ConsumiveiStatus[] = ["em_risco", "atencao", "inativo", "ativo", "pausado"];

interface Rec {
  id: string;
  unidade_id: string;
  linha_id: string;
  vendedor_id: string;
  origem_equipamento: OrigemEquipamento;
  data_ultima_compra: string | null;
  ciclo_estimado_dias: number | null;
  ciclo_editado_dias: number | null;
  status: ConsumiveiStatus;
  pausa_motivo: string | null;
  pausa_ate: string | null;
  unidades_saude: { nome: string } | null;
  linhas_produto: { nome: string; cor: string } | null;
  profiles: { nome: string } | null;
}

interface PausarState { id: string; unidadeNome: string }

export default function RadarTab({ unidadeId }: { unidadeId?: string }) {
  const { user, isAdminOrGerente } = useAuth();
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ConsumiveiStatus | "todos">("todos");
  const [compraAlvo, setCompraAlvo] = useState<Rec | null>(null);
  const [pausarAlvo, setPausarAlvo] = useState<PausarState | null>(null);

  useEffect(() => { void load(); }, [unidadeId]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("consumiveis_recorrencia")
      .select("*, unidades_saude(nome), linhas_produto(nome, cor), profiles!consumiveis_recorrencia_vendedor_id_fkey(nome)")
      .is("archived_at", null)
      .order("status");
    if (unidadeId) q = q.eq("unidade_id", unidadeId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data ?? []) as Rec[]);
    setLoading(false);
  }

  const filtered = items
    .filter(r => filterStatus === "todos" || r.status === filterStatus)
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.unidades_saude?.nome?.toLowerCase().includes(q) ||
        r.linhas_produto?.nome?.toLowerCase().includes(q) ||
        r.profiles?.nome?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const counts = items.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function diasDesde(data: string | null) {
    if (!data) return null;
    return Math.floor((Date.now() - new Date(data).getTime()) / 86400000);
  }

  function cicloEfetivo(r: Rec) {
    return r.ciclo_editado_dias ?? r.ciclo_estimado_dias;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {!unidadeId && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["em_risco", "atencao", "ativo", "inativo"] as ConsumiveiStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(f => f === s ? "todos" : s)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                filterStatus === s ? "ring-2 ring-primary" : "hover:bg-muted/40"
              )}
            >
              <div className="text-2xl font-bold">{counts[s] ?? 0}</div>
              <div className="text-xs text-muted-foreground">{CONSUMIVEL_STATUS_LABELS[s]}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar unidade, linha, vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!unidadeId && (
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {(["em_risco", "atencao", "ativo", "inativo", "pausado"] as ConsumiveiStatus[]).map(s => (
                <SelectItem key={s} value={s}>{CONSUMIVEL_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const dias = diasDesde(r.data_ultima_compra);
            const ciclo = cicloEfetivo(r);
            const canEdit = isAdminOrGerente || r.vendedor_id === user?.id;
            return (
              <Card key={r.id} className={cn(
                r.status === "em_risco" && "border-destructive/40",
                r.status === "atencao" && "border-warning/40",
              )}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {unidadeId ? (
                        <span className="font-semibold text-sm">{r.linhas_produto?.nome}</span>
                      ) : (
                        <Link to={`/unidades/${r.unidade_id}`} className="font-semibold text-sm hover:underline">
                          {r.unidades_saude?.nome}
                        </Link>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", CONSUMIVEL_STATUS_BADGE[r.status])}
                      >
                        {CONSUMIVEL_STATUS_LABELS[r.status]}
                      </Badge>
                      {!unidadeId && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderLeft: `3px solid ${r.linhas_produto?.cor ?? "#888"}` }}
                        >
                          {r.linhas_produto?.nome}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {dias !== null ? (
                        <span>Última compra: <strong className={cn(
                          dias > (ciclo ?? 999) * 1.8 ? "text-destructive" :
                          dias > (ciclo ?? 999) * 1.1 ? "text-warning" : "text-foreground"
                        )}>{dias}d atrás</strong></span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem compras registradas</span>
                      )}
                      {ciclo && <span>Ciclo: {ciclo}d{r.ciclo_editado_dias ? " (editado)" : ""}</span>}
                      {r.data_ultima_compra && ciclo && (() => {
                        const proxima = new Date(r.data_ultima_compra);
                        proxima.setDate(proxima.getDate() + ciclo);
                        const diasAteProx = Math.ceil((proxima.getTime() - Date.now()) / 86400000);
                        const atrasada = diasAteProx < 0;
                        return (
                          <span>
                            Próximo contato:{" "}
                            <strong className={cn(atrasada ? "text-destructive" : diasAteProx <= 7 ? "text-warning" : "text-foreground")}>
                              {format(proxima, "dd/MM/yyyy", { locale: ptBR })}
                              {" "}({atrasada ? `${Math.abs(diasAteProx)}d atrás` : diasAteProx === 0 ? "hoje" : `em ${diasAteProx}d`})
                            </strong>
                          </span>
                        );
                      })()}
                      <span>{ORIGEM_EQUIPAMENTO_LABELS[r.origem_equipamento]}</span>
                      {!unidadeId && r.profiles?.nome && <span>Vendedor: {r.profiles.nome}</span>}
                    </div>
                    {r.status === "pausado" && r.pausa_motivo && (
                      <p className="text-xs text-muted-foreground italic">
                        Pausado: {r.pausa_motivo}
                        {r.pausa_ate && ` (até ${format(new Date(r.pausa_ate), "dd/MM/yyyy", { locale: ptBR })})`}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setCompraAlvo(r)}>
                        <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Comprou
                      </Button>
                      {r.status !== "pausado" ? (
                        <Button size="sm" variant="ghost" onClick={() => setPausarAlvo({ id: r.id, unidadeNome: r.unidades_saude?.nome ?? "" })}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          await supabase.from("consumiveis_recorrencia")
                            .update({ status: "ativo", pausa_motivo: null, pausa_ate: null })
                            .eq("id", r.id);
                          toast.success("Despausado");
                          void load();
                        }}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog registrar compra */}
      {compraAlvo && (
        <RegistrarCompraDialog
          consumivelId={compraAlvo.id}
          unidadeNome={compraAlvo.unidades_saude?.nome ?? ""}
          linhaNome={compraAlvo.linhas_produto?.nome ?? ""}
          open={!!compraAlvo}
          onOpenChange={v => !v && setCompraAlvo(null)}
          onSaved={() => { setCompraAlvo(null); void load(); }}
        />
      )}

      {/* Dialog pausar */}
      {pausarAlvo && (
        <PausarDialog
          consumivelId={pausarAlvo.id}
          unidadeNome={pausarAlvo.unidadeNome}
          open={!!pausarAlvo}
          onOpenChange={v => !v && setPausarAlvo(null)}
          onSaved={() => { setPausarAlvo(null); void load(); }}
        />
      )}
    </div>
  );
}

function PausarDialog({ consumivelId, unidadeNome, open, onOpenChange, onSaved }: {
  consumivelId: string; unidadeNome: string;
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [ate, setAte] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("consumiveis_recorrencia").update({
      status: "pausado",
      pausa_motivo: motivo || null,
      pausa_ate: ate || null,
    }).eq("id", consumivelId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pausado");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pausar monitoramento</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{unidadeNome}</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea rows={2} placeholder="Ex: equipamento em manutenção..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Retomar automaticamente em</Label>
            <Input type="date" value={ate} onChange={e => setAte(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Opcional. Deixe em branco para pausar indefinidamente.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Pausar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
