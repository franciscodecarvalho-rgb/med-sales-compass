/**
 * "Adicionar Diretamente" — cria uma Saída Advance avulsa, sem passar pelo
 * funil (deal_id = null). O usuário informa cliente (opcional), título, valor,
 * linha, tipo e forma de pagamento. A criação reusa o helper criarSaidaAdvance.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { criarSaidaAdvance, type FormaPagamento } from "@/services/saidaAdvanceService";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SEM_CLIENTE = "__sem__";
const SEM_LINHA = "__sem__";

const TIPO_OPTIONS = [
  { value: "venda",        label: "Venda" },
  { value: "demonstracao", label: "Demonstração" },
  { value: "comodato",     label: "Comodato" },
  { value: "locacao",      label: "Locação" },
  { value: "troca",        label: "Troca" },
];

const FORMA_OPTIONS: { value: FormaPagamento; label: string }[] = [
  { value: "a_vista_cartao",        label: "À Vista / Cartão" },
  { value: "financiado_interno",    label: "Financiado Interno" },
  { value: "financiamento_externo", label: "Financiamento Externo" },
];

export function AdicionarSaidaDiretaModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();

  const [unidades, setUnidades] = useState<any[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);

  const [unidadeId, setUnidadeId] = useState<string>(SEM_CLIENTE);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [linhaId, setLinhaId] = useState<string>(SEM_LINHA);
  const [tipoSaida, setTipoSaida] = useState("venda");
  const [forma, setForma] = useState<FormaPagamento>("a_vista_cartao");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // reseta o formulário ao abrir
    setUnidadeId(SEM_CLIENTE);
    setTitulo("");
    setValor("");
    setLinhaId(SEM_LINHA);
    setTipoSaida("venda");
    setForma("a_vista_cartao");

    void Promise.all([
      supabase.from("unidades_saude").select("id, nome").is("archived_at", null).order("nome"),
      supabase.from("linhas_produto").select("id, nome").order("nome"),
    ]).then(([u, l]) => {
      setUnidades(u.data ?? []);
      setLinhas(l.data ?? []);
    });
  }, [open]);

  const clienteNome = unidades.find((u) => u.id === unidadeId)?.nome ?? "";
  const podeSalvar = (unidadeId !== SEM_CLIENTE || titulo.trim().length > 0) && !saving;

  async function handleSalvar() {
    if (!user || !podeSalvar) return;
    setSaving(true);
    try {
      const saidaId = await criarSaidaAdvance({
        criadoPor: user.id,
        forma,
        dealId: null,
        titulo: titulo.trim() || clienteNome || "Saída avulsa",
        unidadeId: unidadeId === SEM_CLIENTE ? null : unidadeId,
        linhaProdutoId: linhaId === SEM_LINHA ? null : linhaId,
        valorTotal: valor ? Number(valor) : null,
        tipoSaida,
      });
      toast.success("Saída Advance criada! 🎉");
      setSaving(false);
      onSuccess();
      void saidaId;
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar saída");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" /> Adicionar Diretamente
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Cria uma saída no Advance sem passar pelo funil de vendas.
        </p>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente (opcional)</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CLIENTE}>— Sem cliente vinculado —</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Título / Descrição {unidadeId === SEM_CLIENTE && <span className="text-destructive">*</span>}
            </Label>
            <Input
              placeholder="Ex: Saída avulsa equipamento X"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            {unidadeId === SEM_CLIENTE && (
              <p className="text-[11px] text-muted-foreground">
                Obrigatório quando não há cliente vinculado.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            {/* Linha */}
            <div className="space-y-1.5">
              <Label className="text-xs">Linha de Produto</Label>
              <Select value={linhaId} onValueChange={setLinhaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_LINHA}>— Nenhuma —</SelectItem>
                  {linhas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo de saída */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Saída</Label>
              <Select value={tipoSaida} onValueChange={setTipoSaida}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={forma} onValueChange={(v) => setForma(v as FormaPagamento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMA_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={!podeSalvar}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
            ) : (
              "Criar Saída"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
