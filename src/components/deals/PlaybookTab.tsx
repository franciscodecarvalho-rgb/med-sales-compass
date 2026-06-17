import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PERGUNTAS_PROSPECCAO } from "@/config/prospeccaoPerguntas";

interface Props {
  dealId: string;
}

export default function PlaybookTab({ dealId }: Props) {
  const { user } = useAuth();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editadoPor, setEditadoPor] = useState<{ nome?: string; em?: string } | null>(null);

  useEffect(() => { void load(); }, [dealId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_prospeccao")
      .select("respostas, updated_at, profiles:updated_by(nome)")
      .eq("deal_id", dealId)
      .maybeSingle();
    if (error) toast.error(error.message);
    setRespostas(((data?.respostas as Record<string, string>) ?? {}));
    if (data?.updated_at) {
      setEditadoPor({ nome: (data as any).profiles?.nome, em: data.updated_at });
    }
    setDirty(false);
    setLoading(false);
  }

  function setResp(id: string, valor: string) {
    setRespostas(r => ({ ...r, [id]: valor }));
    setDirty(true);
  }

  async function salvar() {
    if (!user) return;
    setSaving(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("deal_prospeccao").upsert({
      deal_id: dealId,
      respostas,
      updated_by: user.id,
      updated_at: agora,
    }, { onConflict: "deal_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Prospecção salva");
    setDirty(false);
    setEditadoPor({ nome: "você", em: agora });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const preenchidas = PERGUNTAS_PROSPECCAO.filter(p => (respostas[p.id] ?? "").trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Prospecção</h2>
          <p className="text-xs text-muted-foreground">
            {preenchidas}/{PERGUNTAS_PROSPECCAO.length} respondidas
            {editadoPor?.em && (
              <> · última edição {editadoPor.nome ? `por ${editadoPor.nome} ` : ""}em {format(new Date(editadoPor.em), "dd/MM/yyyy HH:mm")}</>
            )}
          </p>
        </div>
        <Button size="sm" onClick={salvar} disabled={saving || !dirty}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvando..." : dirty ? "Salvar" : "Salvo"}
        </Button>
      </div>

      <div className="space-y-4">
        {PERGUNTAS_PROSPECCAO.map(p => (
          <div key={p.id} className="space-y-1.5">
            <Label className="text-sm font-medium">{p.pergunta}</Label>
            <Textarea
              rows={2}
              value={respostas[p.id] ?? ""}
              onChange={e => setResp(p.id, e.target.value)}
              placeholder={p.ajuda}
            />
            {p.ajuda && <p className="text-[11px] text-muted-foreground">{p.ajuda}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={salvar} disabled={saving || !dirty}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvando..." : dirty ? "Salvar" : "Salvo"}
        </Button>
      </div>
    </div>
  );
}
