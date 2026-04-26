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
import { npsColorClass } from "@/lib/crm";
import { Plus } from "lucide-react";

interface Nps { id: string; unidade_id: string; nota: number; data: string; comentarios: string | null; }

export default function NpsTab() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canWrite = isAdminOrGerente || hasRole("pos_venda");
  const { toast } = useToast();
  const [items, setItems] = useState<Nps[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fUnidade, setFUnidade] = useState("all");
  const [fFaixa, setFFaixa] = useState("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unidade_id: "", nota: "9", data: new Date().toISOString().slice(0, 10), comentarios: "" });

  async function load() {
    setLoading(true);
    const [{ data: n }, { data: u }] = await Promise.all([
      supabase.from("nps").select("*").is("archived_at", null).order("data", { ascending: false }),
      supabase.from("unidades_saude").select("id,nome").is("archived_at", null).order("nome"),
    ]);
    setItems((n ?? []) as Nps[]);
    setUnidades(u ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((n) => {
    if (fUnidade !== "all" && n.unidade_id !== fUnidade) return false;
    if (fFaixa === "detratores" && n.nota > 6) return false;
    if (fFaixa === "neutros" && (n.nota < 7 || n.nota > 8)) return false;
    if (fFaixa === "promotores" && n.nota < 9) return false;
    return true;
  }), [items, fUnidade, fFaixa]);

  const avg = filtered.length ? (filtered.reduce((s, n) => s + n.nota, 0) / filtered.length).toFixed(1) : "—";
  const unidadeName = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";

  async function create() {
    const nota = parseInt(form.nota);
    if (!form.unidade_id || isNaN(nota) || nota < 0 || nota > 10) {
      toast({ title: "Selecione unidade e nota (0-10)", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("nps").insert({
      unidade_id: form.unidade_id, nota, data: form.data,
      comentarios: form.comentarios || null, created_by: user?.id ?? null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "NPS registrado" });
    setOpen(false);
    setForm({ unidade_id: "", nota: "9", data: new Date().toISOString().slice(0, 10), comentarios: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Média:</span> <span className="font-bold text-lg">{avg}</span>
        </div>
        <Select value={fUnidade} onValueChange={setFUnidade}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas unidades</SelectItem>
            {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fFaixa} onValueChange={setFFaixa}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Faixa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas faixas</SelectItem>
            <SelectItem value="detratores">Detratores (0-6)</SelectItem>
            <SelectItem value="neutros">Neutros (7-8)</SelectItem>
            <SelectItem value="promotores">Promotores (9-10)</SelectItem>
          </SelectContent>
        </Select>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="ml-auto"><Plus className="mr-2 h-4 w-4" />Registrar NPS</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Registrar NPS</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nota (0-10)</Label><Input type="number" min={0} max={10} value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></div>
                  <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Comentários</Label>
                  <Textarea rows={3} value={form.comentarios} onChange={(e) => setForm({ ...form, comentarios: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create}>Registrar</Button>
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
              <TableHead>Nota</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Comentário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum registro.</TableCell></TableRow>}
            {filtered.map((n, i) => (
              <TableRow key={n.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                <TableCell className="font-medium">{unidadeName(n.unidade_id)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${npsColorClass(n.nota)} font-bold text-base px-3 py-0.5`}>{n.nota}</Badge>
                </TableCell>
                <TableCell>{new Date(n.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="max-w-[420px] truncate text-muted-foreground">{n.comentarios || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
