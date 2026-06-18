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
import {
  CHAMADO_PRIORIDADE_BADGE, CHAMADO_PRIORIDADE_LABELS,
  CHAMADO_STATUS_BADGE, CHAMADO_STATUS_LABELS,
  type ChamadoPrioridade, type ChamadoStatus,
} from "@/lib/crm";
import { Plus, Search } from "lucide-react";
import { ExportButton, exportToExcel } from "@/lib/export";
import { LoadMoreBar, PAGE_SIZE } from "@/components/LoadMoreBar";

interface Chamado {
  id: string;
  codigo: string | null;
  unidade_id: string;
  descricao_equipamento: string;
  descricao_problema: string;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  tecnico_id: string | null;
  data_abertura: string;
  data_resolucao: string | null;
}

// Tempo decorrido desde a abertura: label + cor (SLA: <1d verde, <3d amarelo, depois vermelho)
function elapsedInfo(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const color = d < 1 ? "text-success" : d < 3 ? "text-warning" : "text-destructive";
  return { label: `${d}d ${h}h`, color };
}

export default function ChamadosTab() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canWrite = isAdminOrGerente || hasRole("pos_venda");
  const { toast } = useToast();
  const [items, setItems] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [_, force] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [fStatus, setFStatus] = useState<string>("all");
  const [fPrior, setFPrior] = useState<string>("all");
  const [fSearch, setFSearch] = useState("");

  // Modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unidade_id: "",
    descricao_equipamento: "",
    descricao_problema: "",
    prioridade: "media" as ChamadoPrioridade,
    tecnico_id: "",
  });

  // Tick para contador
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  async function load(p = 1) {
    setLoading(true);
    const [{ data: ch, count }, { data: un }, { data: tec }] = await Promise.all([
      supabase.from("chamados").select("*", { count: "exact" }).is("archived_at", null).order("data_abertura", { ascending: false }).range(0, p * PAGE_SIZE - 1),
      supabase.from("unidades_saude").select("id,nome").is("archived_at", null).order("nome"),
      supabase.from("user_roles").select("user_id, role, profiles!inner(id,nome)").in("role", ["pos_venda"]),
    ]);
    setItems((ch ?? []) as Chamado[]);
    setTotal(count ?? 0);
    setUnidades(un ?? []);
    const tecList = (tec ?? []).map((r: any) => ({ id: r.user_id, nome: r.profiles?.nome ?? "—" }));
    setTecnicos(tecList);
    setLoading(false);
  }
  useEffect(() => { load(page); }, [page]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (fPrior !== "all" && c.prioridade !== fPrior) return false;
      if (fSearch) {
        const t = fSearch.toLowerCase();
        if (!c.descricao_equipamento.toLowerCase().includes(t) && !c.descricao_problema.toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [items, fStatus, fPrior, fSearch]);

  const unidadeName = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const tecnicoName = (id: string | null) => tecnicos.find((t) => t.id === id)?.nome ?? "—";

  async function createChamado() {
    if (!form.unidade_id || !form.descricao_equipamento || !form.descricao_problema) {
      toast({ title: "Preencha unidade, equipamento e problema", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("chamados").insert({
      unidade_id: form.unidade_id,
      descricao_equipamento: form.descricao_equipamento,
      descricao_problema: form.descricao_problema,
      prioridade: form.prioridade,
      tecnico_id: form.tecnico_id || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro ao criar chamado", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Chamado criado" });
    setOpen(false);
    setForm({ unidade_id: "", descricao_equipamento: "", descricao_problema: "", prioridade: "media", tecnico_id: "" });
    load();
  }

  async function changeStatus(id: string, status: ChamadoStatus) {
    const patch: any = { status };
    if (status === "resolvido" || status === "fechado") patch.data_resolucao = new Date().toISOString();
    const { error } = await supabase.from("chamados").update(patch).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar equipamento/problema..." value={fSearch} onChange={(e) => setFSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(CHAMADO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fPrior} onValueChange={setFPrior}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(CHAMADO_PRIORIDADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <ExportButton onExport={() => exportToExcel(filtered.map((c: any) => ({
          Equipamento: c.descricao_equipamento, Problema: c.descricao_problema,
          Prioridade: CHAMADO_PRIORIDADE_LABELS[c.prioridade as ChamadoPrioridade],
          Status: CHAMADO_STATUS_LABELS[c.status as ChamadoStatus],
          Abertura: c.data_abertura, Resolucao: c.data_resolucao,
        })), "chamados", "Chamados")} />
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Chamado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Chamado Técnico</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipamento</Label>
                  <Input value={form.descricao_equipamento} onChange={(e) => setForm({ ...form, descricao_equipamento: e.target.value })} />
                </div>
                <div>
                  <Label>Descrição do problema</Label>
                  <Textarea rows={3} value={form.descricao_problema} onChange={(e) => setForm({ ...form, descricao_problema: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as ChamadoPrioridade })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHAMADO_PRIORIDADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Técnico</Label>
                    <Select value={form.tecnico_id} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sem técnico" /></SelectTrigger>
                      <SelectContent>{tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={createChamado} disabled={saving}>{saving ? "Criando..." : "Criar Chamado"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Problema</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tempo aberto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum chamado.</TableCell></TableRow>}
            {filtered.map((c, i) => {
              const isOpen = c.status !== "resolvido" && c.status !== "fechado";
              return (
                <TableRow key={c.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <TableCell className="font-mono text-xs">{c.codigo ?? "—"}</TableCell>
                  <TableCell className="font-medium">{unidadeName(c.unidade_id)}</TableCell>
                  <TableCell>{c.descricao_equipamento}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{c.descricao_problema}</TableCell>
                  <TableCell><Badge variant="outline" className={CHAMADO_PRIORIDADE_BADGE[c.prioridade]}>{CHAMADO_PRIORIDADE_LABELS[c.prioridade]}</Badge></TableCell>
                  <TableCell>{tecnicoName(c.tecnico_id)}</TableCell>
                  <TableCell><Badge variant="outline" className={CHAMADO_STATUS_BADGE[c.status]}>{CHAMADO_STATUS_LABELS[c.status]}</Badge></TableCell>
                  <TableCell className={`text-right font-mono text-xs ${isOpen ? elapsedInfo(c.data_abertura).color : "text-muted-foreground"}`}>
                    {isOpen ? elapsedInfo(c.data_abertura).label : "—"}
                  </TableCell>
                  <TableCell>
                    {canWrite && isOpen && (
                      <Select value="" onValueChange={(v) => changeStatus(c.id, v as ChamadoStatus)}>
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Mudar status" /></SelectTrigger>
                        <SelectContent>
                          {(["aberto", "em_atendimento", "resolvido", "fechado"] as ChamadoStatus[])
                            .filter((s) => s !== c.status)
                            .map((s) => <SelectItem key={s} value={s}>{CHAMADO_STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
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
