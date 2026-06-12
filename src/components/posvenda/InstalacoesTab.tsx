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
  INSTALACAO_TIPO_LABELS, INSTALACAO_STATUS_BADGE, INSTALACAO_STATUS_LABELS,
  type InstalacaoTipo, type InstalacaoStatus,
} from "@/lib/crm";
import { Plus, Upload } from "lucide-react";
import { format } from "date-fns";
import { LoadMoreBar, PAGE_SIZE } from "@/components/LoadMoreBar";

interface Inst {
  id: string;
  deal_id: string | null;
  unidade_id: string;
  tecnico_id: string | null;
  tipo: InstalacaoTipo;
  status: InstalacaoStatus;
  data_prevista: string | null;
  data_conclusao: string | null;
  pdf_url: string | null;
  observacoes: string | null;
}

export default function InstalacoesTab() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canWrite = isAdminOrGerente || hasRole("pos_venda");
  const { toast } = useToast();
  const [items, setItems] = useState<Inst[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; titulo: string; unidade_id: string }[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [fStatus, setFStatus] = useState("all");
  const [fTipo, setFTipo] = useState("all");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    deal_id: "",
    unidade_id: "",
    tipo: "instalacao" as InstalacaoTipo,
    tecnico_id: "",
    data_prevista: "",
    observacoes: "",
  });

  async function load(p = 1) {
    setLoading(true);
    const [{ data: inst, count }, { data: un }, { data: dl }, { data: tec }] = await Promise.all([
      supabase.from("instalacoes").select("*", { count: "exact" }).is("archived_at", null).order("data_prevista", { ascending: false, nullsFirst: false }).range(0, p * PAGE_SIZE - 1),
      supabase.from("unidades_saude").select("id,nome").is("archived_at", null).order("nome"),
      supabase.from("deals").select("id,titulo,unidade_id,resultado").eq("resultado", "ganho"),
      supabase.from("user_roles").select("user_id, role, profiles!inner(id,nome)").in("role", ["pos_venda"]),
    ]);
    setItems((inst ?? []) as Inst[]);
    setTotal(count ?? 0);
    setUnidades(un ?? []);
    setDeals((dl ?? []) as any);
    setTecnicos((tec ?? []).map((r: any) => ({ id: r.user_id, nome: r.profiles?.nome ?? "—" })));
    setLoading(false);
  }
  useEffect(() => { load(page); }, [page]);

  const filtered = useMemo(() => items.filter((i) =>
    (fStatus === "all" || i.status === fStatus) &&
    (fTipo === "all" || i.tipo === fTipo)
  ), [items, fStatus, fTipo]);

  const unidadeName = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const dealName = (id: string | null) => deals.find((d) => d.id === id)?.titulo ?? "—";
  const tecnicoName = (id: string | null) => tecnicos.find((t) => t.id === id)?.nome ?? "—";

  async function createInst() {
    if (!form.unidade_id) { toast({ title: "Selecione uma unidade", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("instalacoes").insert({
      deal_id: form.deal_id || null,
      unidade_id: form.unidade_id,
      tipo: form.tipo,
      tecnico_id: form.tecnico_id || null,
      data_prevista: form.data_prevista || null,
      observacoes: form.observacoes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Registro criado" });
    setOpen(false);
    setForm({ deal_id: "", unidade_id: "", tipo: "instalacao", tecnico_id: "", data_prevista: "", observacoes: "" });
    load();
  }

  async function changeStatus(id: string, status: InstalacaoStatus) {
    const patch: any = { status };
    if (status === "concluido") patch.data_conclusao = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("instalacoes").update(patch).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  }

  async function uploadPdf(id: string, file: File) {
    const path = `${id}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("posvenda-pdfs").upload(path, file, { upsert: true });
    if (up.error) { toast({ title: "Erro upload", description: up.error.message, variant: "destructive" }); return; }
    const { data: url } = supabase.storage.from("posvenda-pdfs").getPublicUrl(path);
    const { error: updErr } = await supabase.from("instalacoes").update({ pdf_url: url.publicUrl }).eq("id", id);
    if (updErr) { toast({ title: "Erro ao vincular PDF", description: updErr.message, variant: "destructive" }); return; }
    toast({ title: "PDF enviado" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={fTipo} onValueChange={setFTipo}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(INSTALACAO_TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(INSTALACAO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto"><Plus className="mr-2 h-4 w-4" />Nova Instalação/Aplicação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Instalação / Aplicação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Deal vinculado (ganhos)</Label>
                  <Select value={form.deal_id} onValueChange={(v) => {
                    const d = deals.find((dd) => dd.id === v);
                    setForm({ ...form, deal_id: v, unidade_id: d?.unidade_id ?? form.unidade_id });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sem deal" /></SelectTrigger>
                    <SelectContent>{deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.titulo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as InstalacaoTipo })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(INSTALACAO_TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data prevista</Label>
                    <Input type="date" value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Técnico</Label>
                  <Select value={form.tecnico_id} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sem técnico" /></SelectTrigger>
                    <SelectContent>{tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={createInst} disabled={saving}>{saving ? "Criando..." : "Criar"}</Button>
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
              <TableHead>Deal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Data prevista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro.</TableCell></TableRow>}
            {filtered.map((it, idx) => (
              <TableRow key={it.id} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                <TableCell className="font-medium">{unidadeName(it.unidade_id)}</TableCell>
                <TableCell className="max-w-[180px] truncate">{dealName(it.deal_id)}</TableCell>
                <TableCell>{INSTALACAO_TIPO_LABELS[it.tipo]}</TableCell>
                <TableCell>{tecnicoName(it.tecnico_id)}</TableCell>
                <TableCell>{it.data_prevista ? new Date(it.data_prevista).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={INSTALACAO_STATUS_BADGE[it.status]}>{INSTALACAO_STATUS_LABELS[it.status]}</Badge></TableCell>
                <TableCell>
                  {it.pdf_url ? (
                    <a href={it.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Ver</a>
                  ) : canWrite ? (
                    <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      <Upload className="h-3 w-3" /> Upload
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPdf(it.id, e.target.files[0])} />
                    </label>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {canWrite && it.status !== "concluido" && (
                    <Select value="" onValueChange={(v) => changeStatus(it.id, v as InstalacaoStatus)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Mudar" /></SelectTrigger>
                      <SelectContent>
                        {(["pendente", "em_andamento", "concluido"] as InstalacaoStatus[])
                          .filter((s) => s !== it.status)
                          .map((s) => <SelectItem key={s} value={s}>{INSTALACAO_STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <LoadMoreBar loaded={items.length} total={total} loading={loading} onLoadMore={() => setPage((p) => p + 1)} />
      </div>
    </div>
  );
}
