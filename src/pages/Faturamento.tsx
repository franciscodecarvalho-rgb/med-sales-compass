import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/crm";
import { format } from "date-fns";

export default function Faturamento() {
  const { user, hasRole, isAdminOrGerente } = useAuth();
  const canEdit = isAdminOrGerente || hasRole("assistente_vendas");

  const [pendentes, setPendentes] = useState<any[]>([]);
  const [faturados, setFaturados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodoIni, setPeriodoIni] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  const [dealAlvo, setDealAlvo] = useState<any | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: f }, { data: dGanhos }] = await Promise.all([
      supabase.from("faturamento")
        .select(`*, deals!faturamento_deal_id_fkey(id, titulo, valor_total, data_fechamento, unidades_saude(nome), profiles!deals_vendedor_profile_fkey(nome))`)
        .is("archived_at", null)
        .order("data_faturamento", { ascending: false }),
      supabase.from("deals")
        .select(`id, titulo, valor_total, data_fechamento, unidades_saude(nome), profiles!deals_vendedor_profile_fkey(nome)`)
        .eq("estagio", "finalizado")
        .eq("resultado", "ganho")
        .is("archived_at", null),
    ]);
    const faturadosArr = f ?? [];
    setFaturados(faturadosArr);
    const idsFaturados = new Set(faturadosArr.map((x) => x.deal_id));
    const pend = (dGanhos ?? []).filter((d) => !idsFaturados.has(d.id));
    setPendentes(pend);
    setLoading(false);
  }

  const pendFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return pendentes.filter((d) =>
      !q || d.titulo.toLowerCase().includes(q) || d.unidades_saude?.nome?.toLowerCase().includes(q)
    );
  }, [pendentes, search]);

  const fatFiltrados = useMemo(() => {
    return faturados.filter((f) => {
      if (search) {
        const q = search.toLowerCase();
        if (!f.deals?.titulo?.toLowerCase().includes(q) &&
            !f.deals?.unidades_saude?.nome?.toLowerCase().includes(q) &&
            !f.numero_nf?.toLowerCase().includes(q)) return false;
      }
      if (periodoIni && f.data_faturamento < periodoIni) return false;
      if (periodoFim && f.data_faturamento > periodoFim) return false;
      return true;
    });
  }, [faturados, search, periodoIni, periodoFim]);

  const totalFaturado = fatFiltrados.reduce((s, f) => s + Number(f.valor_faturado || 0), 0);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" /> Faturamento
          </h1>
          <p className="text-sm text-muted-foreground">
            {pendentes.length} aguardando · {faturados.length} faturados
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar deal, unidade ou NF..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-2">
            Aguardando faturamento
            <Badge variant="secondary">{pendentes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="faturados" className="gap-2">
            Faturados
            <Badge variant="secondary">{faturados.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fechado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
                  {!loading && pendFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem deals aguardando faturamento.</TableCell></TableRow>
                  )}
                  {pendFiltrados.map((d, i) => (
                    <TableRow key={d.id} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        <Link to={`/deals/${d.id}`} className="hover:underline">{d.titulo}</Link>
                      </TableCell>
                      <TableCell>{d.unidades_saude?.nome}</TableCell>
                      <TableCell className="text-sm">{d.profiles?.nome}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(d.valor_total)}</TableCell>
                      <TableCell className="text-sm">
                        {d.data_fechamento ? format(new Date(d.data_fechamento), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <Button size="sm" onClick={() => setDealAlvo(d)}>
                            <FileText className="mr-2 h-4 w-4" /> Registrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faturados" className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-[160px]" />
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">Total faturado</div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalFaturado)}</div>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor deal</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Data fat.</TableHead>
                    <TableHead className="text-right">Valor faturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
                  {!loading && fatFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem faturamentos no período.</TableCell></TableRow>
                  )}
                  {fatFiltrados.map((f, i) => (
                    <TableRow key={f.id} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        <Link to={`/deals/${f.deal_id}`} className="hover:underline">{f.deals?.titulo}</Link>
                      </TableCell>
                      <TableCell>{f.deals?.unidades_saude?.nome}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(f.deals?.valor_total)}</TableCell>
                      <TableCell><Badge variant="outline">{f.numero_nf}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(f.data_faturamento), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-success">{formatCurrency(f.valor_faturado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dealAlvo} onOpenChange={(o) => !o && setDealAlvo(null)}>
        {dealAlvo && (
          <RegistrarFaturamento deal={dealAlvo} userId={user?.id}
            onSaved={() => { setDealAlvo(null); void load(); }} />
        )}
      </Dialog>
    </div>
  );
}

function RegistrarFaturamento({ deal, userId, onSaved }: { deal: any; userId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    numero_nf: "",
    data_faturamento: format(new Date(), "yyyy-MM-dd"),
    valor_faturado: deal.valor_total?.toString() ?? "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero_nf || !form.data_faturamento || !form.valor_faturado) {
      toast.error("Preencha NF, data e valor"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("faturamento").insert({
      deal_id: deal.id,
      numero_nf: form.numero_nf,
      data_faturamento: form.data_faturamento,
      valor_faturado: Number(form.valor_faturado),
      registrado_por: userId ?? null,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Faturamento registrado");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar faturamento</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Card className="bg-muted/40">
          <CardContent className="p-3 text-sm space-y-1">
            <div className="font-semibold">{deal.titulo}</div>
            <div className="text-muted-foreground text-xs">{deal.unidades_saude?.nome}</div>
            <div className="text-xs">Valor do deal: <span className="font-mono font-medium">{formatCurrency(deal.valor_total)}</span></div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Número da NF *</Label>
            <Input value={form.numero_nf} onChange={(e) => setForm({ ...form, numero_nf: e.target.value })} placeholder="000123" />
          </div>
          <div className="space-y-2">
            <Label>Data de faturamento *</Label>
            <Input type="date" value={form.data_faturamento} onChange={(e) => setForm({ ...form, data_faturamento: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Valor faturado (R$) *</Label>
          <Input type="number" step="0.01" value={form.valor_faturado} onChange={(e) => setForm({ ...form, valor_faturado: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
