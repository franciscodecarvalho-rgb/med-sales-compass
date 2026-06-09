import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CONSUMIVEL_ESTAGIO_LABELS, CONSUMIVEL_ESTAGIO_BADGE,
  ORIGEM_EQUIPAMENTO_LABELS,
  type ConsumiveiEstagio, type OrigemEquipamento,
} from "@/lib/crm";

interface Prospecto {
  id: string;
  unidade_id: string;
  linha_id: string;
  vendedor_id: string;
  estagio: ConsumiveiEstagio;
  origem_equipamento: OrigemEquipamento;
  notas: string | null;
  unidades_saude: { nome: string } | null;
  linhas_produto: { nome: string; cor: string } | null;
  profiles: { nome: string } | null;
}

export default function ProspeccaoTab({ unidadeId }: { unidadeId?: string }) {
  const { user, isAdminOrGerente } = useAuth();
  const [items, setItems] = useState<Prospecto[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterEstagio, setFilterEstagio] = useState<ConsumiveiEstagio | "todos">("todos");

  useEffect(() => { void load(); }, [unidadeId]);

  async function load() {
    setLoading(true);
    const [prosp, ln, un] = await Promise.all([
      (async () => {
        let q = supabase
          .from("consumiveis_prospeccao")
          .select("*, unidades_saude(nome), linhas_produto(nome, cor), profiles!consumiveis_prospeccao_vendedor_id_fkey(nome)")
          .is("archived_at", null)
          .order("created_at", { ascending: false });
        if (unidadeId) q = q.eq("unidade_id", unidadeId);
        return await q;
      })(),
      supabase.from("linhas_produto").select("id, nome, cor").is("archived_at", null).order("nome"),
      !unidadeId ? supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome") : Promise.resolve(null),
    ] as Promise<any>[]);
    setItems((prosp.data ?? []) as Prospecto[]);
    setLinhas(ln.data ?? []);
    if (un) setUnidades(un.data ?? []);
    setLoading(false);
  }

  const filtered = items.filter(p => filterEstagio === "todos" || p.estagio === filterEstagio);

  async function avancar(p: Prospecto) {
    if (p.estagio !== "interesse") return;
    const { error } = await supabase.from("consumiveis_prospeccao")
      .update({ estagio: "convertido" })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Avançado para Convertido");
    void load();
  }

  async function graduar(p: Prospecto) {
    // Cria registro de recorrência e arquiva o prospecto
    const { error: insErr } = await supabase.from("consumiveis_recorrencia").insert({
      unidade_id: p.unidade_id,
      linha_id: p.linha_id,
      vendedor_id: p.vendedor_id,
      origem_equipamento: p.origem_equipamento,
    });
    if (insErr) {
      // Se já existe (UNIQUE), apenas reativa
      if (!insErr.message.includes("unique")) {
        toast.error(insErr.message); return;
      }
      await supabase.from("consumiveis_recorrencia")
        .update({ archived_at: null })
        .eq("unidade_id", p.unidade_id)
        .eq("linha_id", p.linha_id);
    }
    await supabase.from("consumiveis_prospeccao")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", p.id);
    toast.success("Graduado! Entrou no radar de recorrência.");
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterEstagio} onValueChange={v => setFilterEstagio(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="interesse">Interesse</SelectItem>
            <SelectItem value="convertido">Convertido</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo prospecto</Button>
            </DialogTrigger>
            <NovoProspectoForm
              linhas={linhas}
              unidades={unidades}
              fixedUnidadeId={unidadeId}
              onSaved={() => { setOpen(false); void load(); }}
            />
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum prospecto encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const canEdit = isAdminOrGerente || p.vendedor_id === user?.id;
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!unidadeId && (
                        <span className="font-semibold text-sm">{p.unidades_saude?.nome}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", CONSUMIVEL_ESTAGIO_BADGE[p.estagio])}
                      >
                        {CONSUMIVEL_ESTAGIO_LABELS[p.estagio]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderLeft: `3px solid ${p.linhas_produto?.cor ?? "#888"}` }}
                      >
                        {p.linhas_produto?.nome}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                      <span>{ORIGEM_EQUIPAMENTO_LABELS[p.origem_equipamento]}</span>
                      {!unidadeId && p.profiles?.nome && <span>Vendedor: {p.profiles.nome}</span>}
                    </div>
                    {p.notas && <p className="text-xs text-muted-foreground italic">{p.notas}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 shrink-0">
                      {p.estagio === "interesse" && (
                        <Button size="sm" variant="outline" onClick={() => avancar(p)}>
                          <ArrowRight className="mr-1 h-3.5 w-3.5" /> Avançar
                        </Button>
                      )}
                      {p.estagio === "convertido" && (
                        <Button size="sm" onClick={() => graduar(p)}>
                          <GraduationCap className="mr-1 h-3.5 w-3.5" /> Graduar
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
    </div>
  );
}

function NovoProspectoForm({ linhas, unidades, fixedUnidadeId, onSaved }: {
  linhas: any[]; unidades: any[]; fixedUnidadeId?: string; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    unidade_id: fixedUnidadeId ?? "",
    linha_id: "",
    origem_equipamento: "desconhecido" as OrigemEquipamento,
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unidade_id || !form.linha_id || !user) return;
    setSaving(true);
    const { error } = await supabase.from("consumiveis_prospeccao").insert({
      unidade_id: form.unidade_id,
      linha_id: form.linha_id,
      vendedor_id: user.id,
      origem_equipamento: form.origem_equipamento,
      notas: form.notas || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Prospecto criado");
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo prospecto consumível</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        {!fixedUnidadeId && (
          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={form.unidade_id} onValueChange={v => setForm({ ...form, unidade_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Linha *</Label>
          <Select value={form.linha_id} onValueChange={v => setForm({ ...form, linha_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {linhas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Origem do equipamento</Label>
          <Select value={form.origem_equipamento} onValueChange={v => setForm({ ...form, origem_equipamento: v as OrigemEquipamento })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(ORIGEM_EQUIPAMENTO_LABELS) as [OrigemEquipamento, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !form.unidade_id || !form.linha_id}>
            {saving ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
