import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/crm";

export default function Equipamentos() {
  const [items, setItems] = useState<any[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const [eq, ln] = await Promise.all([
      supabase.from("equipamentos").select("*, linhas_produto(nome, cor)").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("*").is("archived_at", null).order("nome"),
    ]);
    if (eq.error) toast.error(eq.error.message);
    setItems(eq.data ?? []);
    setLinhas(ln.data ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Catálogo por linha de produto</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo equipamento</Button>
          </DialogTrigger>
          <EquipForm linhas={linhas} onSaved={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                    style={{ backgroundColor: (e.linhas_produto?.cor || "#0ea5e9") + "20", color: e.linhas_produto?.cor || "#0ea5e9" }}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{e.nome}</div>
                    {e.modelo && <div className="text-xs text-muted-foreground">Modelo: {e.modelo}</div>}
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {e.linhas_produto?.nome}
                    </Badge>
                    {e.valor_referencia && (
                      <div className="mt-1 text-sm font-medium">{formatCurrency(e.valor_referencia)}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>}
        </div>
      )}
    </div>
  );
}

function EquipForm({ linhas, onSaved }: { linhas: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", modelo: "", linha_id: "", valor_referencia: "", descricao: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.linha_id) { toast.error("Selecione uma linha"); return; }
    setSaving(true);
    const { error } = await supabase.from("equipamentos").insert({
      nome: form.nome,
      modelo: form.modelo || null,
      linha_id: form.linha_id,
      valor_referencia: form.valor_referencia ? Number(form.valor_referencia) : null,
      descricao: form.descricao || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Equipamento criado");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Valor referência (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_referencia}
              onChange={(e) => setForm({ ...form, valor_referencia: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Linha *</Label>
          <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea rows={2} value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
