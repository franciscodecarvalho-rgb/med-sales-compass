import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GARANTIA_STATUS_BADGE, GARANTIA_STATUS_LABELS, computeVigenciaStatus } from "@/lib/crm";
import { Plus, Sparkles } from "lucide-react";
import { NewDealManutDialog } from "@/pages/FunilManutencao";

interface Garantia {
  id: string; unidade_id: string; descricao_equipamento: string;
  linha_id: string | null; data_inicio: string; data_fim: string; status: any;
}

export default function GarantiasTab() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canWrite = isAdminOrGerente || hasRole("pos_venda");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<Garantia[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [linhas, setLinhas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState("all");
  const [fUnidade, setFUnidade] = useState("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unidade_id: "", descricao_equipamento: "", linha_id: "",
    data_inicio: "", data_fim: "",
  });

  // Modal de geração de oportunidade de manutenção
  const [oportGarantia, setOportGarantia] = useState<Garantia | null>(null);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setVendedores(data ?? []));
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: g }, { data: u }, { data: l }] = await Promise.all([
      supabase.from("garantias").select("*").is("archived_at", null).order("data_fim"),
      supabase.from("unidades_saude").select("id,nome").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("id,nome").is("archived_at", null).order("nome"),
    ]);
    setItems((g ?? []) as Garantia[]);
    setUnidades(u ?? []);
    setLinhas(l ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => items.map((g) => ({ ...g, computed: computeVigenciaStatus(g.data_fim) })), [items]);
  const filtered = useMemo(() => enriched.filter((g) =>
    (fStatus === "all" || g.computed === fStatus) &&
    (fUnidade === "all" || g.unidade_id === fUnidade)
  ), [enriched, fStatus, fUnidade]);

  const unidadeName = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const linhaName = (id: string | null) => linhas.find((l) => l.id === id)?.nome ?? "—";

  async function create() {
    if (!form.unidade_id || !form.descricao_equipamento || !form.data_inicio || !form.data_fim) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("garantias").insert({
      unidade_id: form.unidade_id, descricao_equipamento: form.descricao_equipamento,
      linha_id: form.linha_id || null, data_inicio: form.data_inicio, data_fim: form.data_fim,
      status: computeVigenciaStatus(form.data_fim), created_by: user?.id ?? null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Garantia criada" });
    setOpen(false);
    setForm({ unidade_id: "", descricao_equipamento: "", linha_id: "", data_inicio: "", data_fim: "" });
    load();
  }

  function gerarOportunidade(g: Garantia) {
    setOportGarantia(g);
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
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="a_vencer">A vencer</SelectItem>
            <SelectItem value="vencida">Vencidas</SelectItem>
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
            <DialogTrigger asChild><Button className="ml-auto"><Plus className="mr-2 h-4 w-4" />Nova Garantia</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Garantia</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipamento</Label>
                  <Input value={form.descricao_equipamento} onChange={(e) => setForm({ ...form, descricao_equipamento: e.target.value })} />
                </div>
                <div>
                  <Label>Linha</Label>
                  <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sem linha" /></SelectTrigger>
                    <SelectContent>{linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create}>Criar</Button>
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
              <TableHead>Equipamento</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma garantia.</TableCell></TableRow>}
            {filtered.map((g, i) => {
              const labelKey = g.computed;
              return (
                <TableRow key={g.id} className={rowBg(g.computed, i)}>
                  <TableCell className="font-medium">{unidadeName(g.unidade_id)}</TableCell>
                  <TableCell>{g.descricao_equipamento}</TableCell>
                  <TableCell>{linhaName(g.linha_id)}</TableCell>
                  <TableCell>{new Date(g.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{new Date(g.data_fim).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline" className={GARANTIA_STATUS_BADGE[labelKey as any]}>{GARANTIA_STATUS_LABELS[labelKey as any]}</Badge></TableCell>
                  <TableCell>
                    {g.computed === "vencida" && canWrite && (
                      <Button size="sm" variant="outline" onClick={() => gerarOportunidade(g)}>
                        <Sparkles className="mr-1 h-3 w-3" />Gerar oportunidade
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
