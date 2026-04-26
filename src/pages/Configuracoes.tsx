import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const [linhas, setLinhas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data } = await supabase.from("linhas_produto").select("*").is("archived_at", null).order("nome");
    setLinhas(data ?? []);
  }

  async function updateLinha(id: string, patch: any) {
    const { error } = await supabase.from("linhas_produto").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Atualizado");
    void load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Linhas de produto e parâmetros do sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova linha</Button>
          </DialogTrigger>
          <NovaLinhaForm onSaved={() => { setOpen(false); void load(); }} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="h-4 w-4" /> Linhas de produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {linhas.map((l) => (
            <div key={l.id} className="grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: l.cor }} />
                <Input defaultValue={l.nome} onBlur={(e) => e.target.value !== l.nome && updateLinha(l.id, { nome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cor</Label>
                <Input type="color" defaultValue={l.cor} className="h-8 w-16 p-1"
                  onBlur={(e) => e.target.value !== l.cor && updateLinha(l.id, { cor: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">🟢 dias</Label>
                <Input type="number" min="1" defaultValue={l.limite_verde_dias} className="w-20"
                  onBlur={(e) => Number(e.target.value) !== l.limite_verde_dias && updateLinha(l.id, { limite_verde_dias: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">🟡 dias</Label>
                <Input type="number" min="1" defaultValue={l.limite_amarelo_dias} className="w-20"
                  onBlur={(e) => Number(e.target.value) !== l.limite_amarelo_dias && updateLinha(l.id, { limite_amarelo_dias: Number(e.target.value) })} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => updateLinha(l.id, { archived_at: new Date().toISOString() })}>
                Arquivar
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Os valores 🟢/🟡 (em dias) controlam as cores do contador de tempo no Kanban. Acima do amarelo = vermelho.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NovaLinhaForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ nome: "", descricao: "", cor: "#0ea5e9" });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("linhas_produto").insert(form);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Linha criada");
    onSaved();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova linha de produto</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-20 p-1" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
