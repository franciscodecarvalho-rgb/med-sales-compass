import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import MetaAgendamentosCards from "./MetaAgendamentosCards";

interface Vendedor { id: string; nome: string }

export default function MetaAgendamentosGestor() {
  const { user } = useAuth();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selecionado, setSelecionado] = useState<string>("");
  const [metaAtual, setMetaAtual] = useState<number | null>(null);
  const [metaLigAtual, setMetaLigAtual] = useState<number | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [novaMeta, setNovaMeta] = useState("");
  const [novaMetaLig, setNovaMetaLig] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { void loadVendedores(); }, []);
  useEffect(() => { if (selecionado) void loadMeta(); }, [selecionado, reloadKey]);

  async function loadVendedores() {
    const { data } = await supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome");
    setVendedores((data ?? []) as Vendedor[]);
    if (data?.length) setSelecionado(data[0].id);
  }

  async function loadMeta() {
    const { data } = await supabase.from("metas_atividade")
      .select("meta_agendamentos_dia, meta_ligacoes_dia")
      .eq("user_id", selecionado).eq("ativo", true)
      .maybeSingle();
    setMetaAtual(data?.meta_agendamentos_dia ?? null);
    setMetaLigAtual(data?.meta_ligacoes_dia ?? null);
    setNovaMeta(data?.meta_agendamentos_dia?.toString() ?? "");
    setNovaMetaLig(data?.meta_ligacoes_dia?.toString() ?? "");
  }

  async function salvarMeta(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(novaMeta);
    if (!valor || valor < 1) { toast.error("Meta de agendamentos deve ser ao menos 1"); return; }
    const valorLig = novaMetaLig ? Number(novaMetaLig) : null;
    if (valorLig !== null && valorLig < 1) { toast.error("Meta de ligações deve ser ao menos 1"); return; }
    if (!user) return;
    setSaving(true);

    // Desativa a meta anterior (histórico preservado) e cria a nova
    await supabase.from("metas_atividade")
      .update({ ativo: false })
      .eq("user_id", selecionado).eq("ativo", true);

    const { error } = await supabase.from("metas_atividade").insert({
      user_id: selecionado,
      meta_agendamentos_dia: valor,
      meta_ligacoes_dia: valorLig,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Meta atualizada");
    setOpenEdit(false);
    setReloadKey(k => k + 1);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" /> Agendamentos por Vendedor
          </CardTitle>
          <div className="ml-auto flex items-center gap-2">
            <Select value={selecionado} onValueChange={setSelecionado}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vendedor..." /></SelectTrigger>
              <SelectContent>
                {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  {metaAtual ? `Metas: ${metaLigAtual ?? "—"} lig · ${metaAtual} ag` : "Definir metas"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Metas diárias de atividade</DialogTitle></DialogHeader>
                <form onSubmit={salvarMeta} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {vendedores.find(v => v.id === selecionado)?.nome} — dias úteis (seg–sex). Funil ligações → agendamentos.
                  </p>
                  <div className="space-y-2">
                    <Label>Ligações por dia</Label>
                    <Input type="number" min={1} value={novaMetaLig}
                      onChange={e => setNovaMetaLig(e.target.value)} placeholder="Ex: 20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agendamentos por dia * <span className="font-normal text-muted-foreground">(call + visita)</span></Label>
                    <Input type="number" min={1} required value={novaMeta}
                      onChange={e => setNovaMeta(e.target.value)} placeholder="Ex: 4" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selecionado && metaAtual !== null ? (
          <MetaAgendamentosCards key={`${selecionado}-${reloadKey}`} userId={selecionado} />
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            {selecionado ? "Sem meta definida para este vendedor. Use o botão acima para definir." : "Selecione um vendedor."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
