import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  consumivelId: string;
  unidadeNome: string;
  linhaNome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export default function RegistrarCompraDialog({ consumivelId, unidadeNome, linhaNome, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("compras_consumiveis").insert({
      consumivel_id: consumivelId,
      data,
      observacao: observacao || null,
      registrado_por: user.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Compra registrada");
    setObservacao("");
    setData(format(new Date(), "yyyy-MM-dd"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-1">
          {unidadeNome} · <span className="font-medium">{linhaNome}</span>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Data da compra *</Label>
            <Input type="date" required value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              rows={2}
              placeholder="Opcional — quantidade, contexto..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
