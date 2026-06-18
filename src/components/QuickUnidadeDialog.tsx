import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ESTADOS_BR, UNIDADE_TIPO_LABELS, UnidadeTipo } from "@/lib/crm";
import { maskCnpj, maskTelefone } from "@/lib/masks";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (unidade: { id: string; nome: string }) => void;
}

/** Modal compacto para criar uma Unidade de Saúde rapidamente. */
export default function QuickUnidadeDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "hospital" as UnidadeTipo,
    cnpj: "",
    cidade: "",
    estado: "",
    telefone: "",
  });

  const reset = () => setForm({
    nome: "", tipo: "hospital", cnpj: "", cidade: "", estado: "", telefone: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("unidades_saude").insert({
      nome: form.nome.trim(),
      tipo: form.tipo,
      cnpj: form.cnpj || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      telefone: form.telefone || null,
      status: "lead",
      created_by: user?.id ?? null,
    }).select("id, nome").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Unidade criada");
    onCreated(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova unidade de saúde</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Hospital Santa Maria" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as UnidadeTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIDADE_TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
              placeholder="(00) 00000-0000" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.nome.trim()}>
              {saving ? "Salvando..." : "Criar unidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
