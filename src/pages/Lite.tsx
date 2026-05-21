import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, Phone, AlertCircle, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { maskTelefone } from "@/lib/masks";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Linha = { id: string; nome: string };
type LiteDeal = {
  id: string;
  titulo: string;
  observacoes: string | null;
  unidade_id: string | null;
  created_at: string;
};

const LINHA_KEY = "lite:linha_id";

export default function Lite() {
  const { user } = useAuth();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [linhaId, setLinhaId] = useState<string>(() => localStorage.getItem(LINHA_KEY) ?? "");
  const [deals, setDeals] = useState<LiteDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line
  }, [user?.id]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [d, l] = await Promise.all([
      supabase
        .from("deals")
        .select("id, titulo, observacoes, unidade_id, created_at")
        .eq("vendedor_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("linhas_produto").select("id, nome").is("archived_at", null).order("nome"),
    ]);
    if (d.error) toast.error(d.error.message);
    setDeals((d.data ?? []) as LiteDeal[]);
    setLinhas((l.data ?? []) as Linha[]);
    setLoading(false);
  }

  function abrirNovo() {
    setNome("");
    setTelefone("");
    setObs("");
    setOpen(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!nome.trim()) { toast.error("Informe o nome do lead"); return; }
    if (!linhaId) { toast.error("Escolha uma linha de produto"); return; }
    setSaving(true);
    const observacoes = [
      "📱 Lead Modo Lite",
      telefone.trim() ? `Tel: ${telefone.trim()}` : null,
      obs.trim() ? `\n${obs.trim()}` : null,
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("deals").insert({
      titulo: nome.trim(),
      vendedor_id: user.id,
      linha_id: linhaId,
      valor_total: 0,
      observacoes,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead salvo!");
    setNome(""); setTelefone(""); setObs("");
    void load();
  }

  function salvarLinha(id: string) {
    setLinhaId(id);
    localStorage.setItem(LINHA_KEY, id);
  }

  const filtered = useMemo(() => {
    if (!busca.trim()) return deals;
    const q = busca.toLowerCase();
    return deals.filter((d) =>
      d.titulo.toLowerCase().includes(q) || (d.observacoes ?? "").toLowerCase().includes(q)
    );
  }, [deals, busca]);

  const hoje = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return deals.filter((d) => new Date(d.created_at) >= today).length;
  }, [deals]);

  function extrairTel(observacoes: string | null): string | null {
    if (!observacoes) return null;
    const m = observacoes.match(/Tel:\s*([^\n]+)/);
    return m ? m[1].trim() : null;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Zap className="h-6 w-6 text-primary" />
              Modo Lite
            </h1>
            <p className="text-xs text-muted-foreground">
              {hoje} {hoje === 1 ? "lead" : "leads"} hoje · {deals.length} no total
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={abrirNovo}
          className="mt-3 h-14 w-full gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-base font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50"
        >
          <Plus className="h-6 w-6" />
          Novo lead
        </Button>

        <div className="relative mt-3">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nos meus leads..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <Zap className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {busca ? "Nenhum lead encontrado." : "Nenhum lead ainda. Toque em \"Novo lead\" para começar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const tel = extrairTel(d.observacoes);
            return (
              <Link
                key={d.id}
                to={`/deals/${d.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{d.titulo}</div>
                    {tel && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {tel}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(d.created_at), { locale: ptBR, addSuffix: true })}
                    </div>
                  </div>
                  {!d.unidade_id && (
                    <Badge variant="outline" className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      pendente unidade
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Novo lead rápido
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            {!linhaId && (
              <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Linha de produto (configurar uma vez)
                </Label>
                <Select value={linhaId} onValueChange={salvarLinha}>
                  <SelectTrigger><SelectValue placeholder="Escolha sua linha" /></SelectTrigger>
                  <SelectContent>
                    {linhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome do lead *</Label>
              <Input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Dr. Carlos / Hospital X"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Contexto, interesse, próximo passo..."
                rows={3}
              />
            </div>
            {linhaId && (
              <button
                type="button"
                onClick={() => { localStorage.removeItem(LINHA_KEY); setLinhaId(""); }}
                className="text-xs text-muted-foreground underline"
              >
                Trocar linha de produto
              </button>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
              <Button type="submit" disabled={saving || !nome.trim() || !linhaId} className="h-12 flex-1 text-base font-bold">
                {saving ? "Salvando..." : "Salvar lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
