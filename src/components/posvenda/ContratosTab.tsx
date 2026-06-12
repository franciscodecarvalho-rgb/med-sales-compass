import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CONTRATO_STATUS_BADGE, CONTRATO_STATUS_LABELS, computeVigenciaStatus, formatCurrency } from "@/lib/crm";
import { Plus } from "lucide-react";
import { LoadMoreBar, PAGE_SIZE } from "@/components/LoadMoreBar";

interface Contrato {
  id: string; unidade_id: string; linha_id: string | null;
  tipo_contrato: string; vigencia_inicio: string; vigencia_fim: string;
  valor: number; cobertura: string | null; status: any;
}

export default function ContratosTab() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canWrite = isAdminOrGerente || hasRole("pos_venda");
  const { toast } = useToast();
  const [items, setItems] = useState<Contrato[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [linhas, setLinhas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState("all");
  const [fUnidade, setFUnidade] = useState("all");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    unidade_id: "", linha_id: "", tipo_contrato: "",
    vigencia_inicio: "", vigencia_fim: "", valor: "0", cobertura: "",
  });

  async function load(p = 1) {
    setLoading(true);
    const [{ data: c, count }, { data: u }, { data: l }] = await Promise.all([
      supabase.from("contratos_manutencao").select("*", { count: "exact" }).is("archived_at", null).order("vigencia_fim").range(0, p * PAGE_SIZE - 1),
      supabase.from("unidades_saude").select("id,nome").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("id,nome").is("archived_at", null).order("nome"),
    ]);
    setItems((c ?? []) as Contrato[]);
    setTotal(count ?? 0);
    setUnidades(u ?? []);
    setLinhas(l ?? []);
    setLoading(false);
  }
  useEffect(() => { load(page); }, [page]);

  const enriched = useMemo(() => items.map((c) => ({
    ...c, computed: computeVigenciaStatus(c.vigencia_fim),
  })), [items]);

  const filtered = useMemo(() => enriched.filter((c) =>
    (fStatus === "all" || c.computed === fStatus) &&
    (fUnidade === "all" || c.unidade_id === fUnidade)
  ), [enriched, fStatus, fUnidade]);

  const unidadeName = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const linhaName = (id: string | null) => linhas.find((l) => l.id === id)?.nome ?? "—";

  async function create() {
    if (!form.unidade_id || !form.tipo_contrato || !form.vigencia_inicio || !form.vigencia_fim) {
      toast({ title: "Preencha unidade, tipo e vigência", variant: "destructive" }); return;
    }
    if (form.vigencia_inicio > form.vigencia_fim) {
      toast({ title: "Início da vigência não pode ser depois do fim", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await supabase.from("contratos_manutencao").insert({
      unidade_id: form.unidade_id, linha_id: form.linha_id || null,
      tipo_contrato: form.tipo_contrato, vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim, valor: Number(form.valor) || 0,
      cobertura: form.cobertura || null, created_by: user?.id ?? null,
      status: computeVigenciaStatus(form.vigencia_fim) === "vencida" ? "vencido" : computeVigenciaStatus(form.vigencia_fim) === "a_vencer" ? "a_vencer" : "ativo",
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contrato criado" });
    setOpen(false);
    setForm({ unidade_id: "", linha_id: "", tipo_contrato: "", vigencia_inicio: "", vigencia_fim: "", valor: "0", cobertura: "" });
    load();
  }

  function rowBg(comp: string, idx: number) {
    if (comp === "vencida") return "bg-destructive/10";
    if (comp === "a_vencer") return "bg-warning/10";
    return idx % 2 === 0 ? "" : "bg-muted/30";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativos</SelectItem>
            <SelectItem value="a_vencer">A vencer</SelectItem>
            <SelectItem value="vencida">Vencidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fUnidade} onValueChange={setFUnidade}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas unidades</SelectItem>
            {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="ml-auto"><Plus className="mr-2 h-4 w-4" />Novo Contrato</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Contrato de Manutenção</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Linha</Label>
                    <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sem linha" /></SelectTrigger>
                      <SelectContent>{linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de contrato</Label>
                    <Input value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })} placeholder="Ex: Preventiva" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Início</Label><Input type="date" value={form.vigencia_inicio} onChange={(e) => setForm({ ...form, vigencia_inicio: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="date" value={form.vigencia_fim} onChange={(e) => setForm({ ...form, vigencia_fim: e.target.value })} /></div>
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Cobertura</Label>
                  <Textarea rows={2} value={form.cobertura} onChange={(e) => setForm({ ...form, cobertura: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create} disabled={saving}>{saving ? "Criando..." : "Criar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum contrato.</TableCell></TableRow>}
            {filtered.map((c, i) => {
              const labelKey = c.computed === "vencida" ? "vencido" : c.computed === "a_vencer" ? "a_vencer" : "ativo";
              return (
                <TableRow key={c.id} className={rowBg(c.computed, i)}>
                  <TableCell className="font-medium">{unidadeName(c.unidade_id)}</TableCell>
                  <TableCell>{linhaName(c.linha_id)}</TableCell>
                  <TableCell>{c.tipo_contrato}</TableCell>
                  <TableCell className="text-xs">{new Date(c.vigencia_inicio).toLocaleDateString("pt-BR")} → {new Date(c.vigencia_fim).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(c.valor)}</TableCell>
                  <TableCell><Badge variant="outline" className={CONTRATO_STATUS_BADGE[labelKey as any]}>{CONTRATO_STATUS_LABELS[labelKey as any]}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <LoadMoreBar loaded={items.length} total={total} loading={loading} onLoadMore={() => setPage((p) => p + 1)} />
      </div>
    </div>
  );
}
