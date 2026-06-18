/**
 * "Puxar do Funil" — lista os deals GANHOS que ainda não foram enviados ao
 * Vendas Advance e deixa o usuário escolher um para puxar. Ao escolher,
 * delega para o EnviarParaFaturamentoModal (que coleta forma de pagamento /
 * análise de crédito e cria a saída).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/crm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Trophy, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (deal: any) => void;
}

export function PuxarDoFunilModal({ open, onClose, onPick }: Props) {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    supabase
      .from("deals")
      .select("id, titulo, valor_total, data_fechamento, unidades_saude(nome), linhas_produto(nome)")
      .eq("resultado", "ganho")
      .eq("enviado_para_advance", false)
      .is("archived_at", null)
      .order("data_fechamento", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDeals(data ?? []);
        setLoading(false);
      });
  }, [open]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) =>
      d.titulo?.toLowerCase().includes(q) ||
      d.unidades_saude?.nome?.toLowerCase().includes(q)
    );
  }, [deals, search]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Puxar do Funil
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Deals ganhos que ainda não estão no Advance. Escolha um para enviar.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar deal ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}
          {!loading && filtrados.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum deal ganho disponível para puxar.
            </div>
          )}
          {filtrados.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onPick(d)}
              className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {d.unidades_saude?.nome ?? d.titulo}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {d.titulo}
                  {d.linhas_produto?.nome && ` · ${d.linhas_produto.nome}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-sm font-semibold text-primary">
                  {formatCurrency(d.valor_total)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
