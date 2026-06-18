import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Step = "input" | "loading" | "review";

interface ParsedRow {
  nome: string;
  cidade: string | null;
  estado_sigla: string | null;
  estado_id: string | null;
  tipo_nome: string | null;
  tipo_id: string | null;
  telefone: string | null;
  site: string | null;
  informacoes_adicionais: string | null;
  _selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

export default function ImportarPlanilhaDialog({ open, onOpenChange, onImported }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [pastas, setPastas] = useState<{ id: string; nome: string }[]>([]);
  const [pastaId, setPastaId] = useState("");      // "" | id existente | "__nova__"
  const [novaPasta, setNovaPasta] = useState("");

  useEffect(() => {
    if (!open) return;
    void (supabase as any).from("discovery_pastas")
      .select("id, nome").is("archived_at", null).order("ordem").order("nome")
      .then(({ data }: { data: { id: string; nome: string }[] | null }) => setPastas(data ?? []));
  }, [open]);

  // Pasta obrigatória: existente selecionada OU nova com nome preenchido
  const pastaDeterminada = pastaId !== "" && (pastaId !== "__nova__" || novaPasta.trim().length > 0);

  const reset = () => {
    setStep("input");
    setRawText("");
    setEtiqueta("");
    setRows([]);
    setPastaId("");
    setNovaPasta("");
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const processar = async () => {
    if (!rawText.trim()) return;
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("discovery-import-ai", {
        body: { rawText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parsed: ParsedRow[] = (data.unidades ?? []).map((u: any) => ({
        ...u,
        _selected: true,
      }));
      if (parsed.length === 0) {
        toast.error("Nenhuma unidade identificada no texto");
        setStep("input");
        return;
      }
      setRows(parsed);
      setStep("review");
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar");
      setStep("input");
    }
  };

  const importar = async () => {
    if (!user) return;
    if (!pastaDeterminada) { toast.error("Determine uma pasta para a importação"); return; }
    const sel = rows.filter(r => r._selected && r.nome.trim());
    if (sel.length === 0) { toast.error("Selecione ao menos uma linha"); return; }
    setImporting(true);

    // Resolve a pasta de destino (cria a nova, se for o caso)
    let destinoPastaId = pastaId;
    let pastaNome = pastas.find(p => p.id === pastaId)?.nome ?? "";
    if (pastaId === "__nova__") {
      const { data: nova, error: errP } = await (supabase as any).from("discovery_pastas")
        .insert({ nome: novaPasta.trim(), cor: null, ordem: pastas.length, created_by: user.id })
        .select("id, nome").single();
      if (errP) { setImporting(false); toast.error(errP.message); return; }
      destinoPastaId = nova.id;
      pastaNome = nova.nome;
    }

    const etiquetaFinal = etiqueta.trim() || pastaNome;
    const payload = sel.map(r => ({
      nome: r.nome.trim(),
      cidade: r.cidade,
      estado_id: r.estado_id,
      tipo_id: r.tipo_id,
      telefone: r.telefone,
      site: r.site,
      informacoes_adicionais: r.informacoes_adicionais,
      vendedor_id: user.id,
      created_by: user.id,
      pasta_id: destinoPastaId,
      status: "em_pesquisa" as const,
      origem: "planilha" as const,
      origem_etiqueta: etiquetaFinal,
    }));
    const { error } = await supabase.from("discovery").insert(payload);
    setImporting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${sel.length} ${sel.length === 1 ? "item importado" : "itens importados"}`);
    onImported();
    close();
  };

  const updateRow = (idx: number, patch: Partial<ParsedRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(v) : close()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar planilha com IA
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 overflow-auto">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Cole o conteúdo da planilha (qualquer formato — copiado do Excel, CSV, lista de texto).
                A IA vai identificar automaticamente nome, cidade, UF, tipo de unidade, telefone e site.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pasta de destino *</Label>
              <Select value={pastaId} onValueChange={setPastaId}>
                <SelectTrigger><SelectValue placeholder="Escolha uma pasta..." /></SelectTrigger>
                <SelectContent>
                  {pastas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  <SelectItem value="__nova__">➕ Nova pasta…</SelectItem>
                </SelectContent>
              </Select>
              {pastaId === "__nova__" && (
                <Input
                  value={novaPasta}
                  onChange={(e) => setNovaPasta(e.target.value)}
                  placeholder="Nome da nova pasta"
                  maxLength={60}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Toda importação precisa de uma pasta — todos os itens entram nela.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Etiqueta desta importação <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Input
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
                placeholder="Ex: Planilha Hospitais MG · Out/2026"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Tag de origem em cada item. Se vazia, usa o nome da pasta.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo bruto</Label>
              <Textarea
                rows={12}
                placeholder={`Ex:\nHospital Santa Mônica\tBelo Horizonte\tMG\tHospital\t(31) 3333-4444\nClínica São Lucas\tContagem\tMG\tClínica\nLab Imagem\tBetim\tMG\tLaboratório\t(31) 9999-0000\twww.labimagem.com.br`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {rawText.length} caracteres · {rawText.split("\n").filter(l => l.trim()).length} linhas
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A IA está analisando o conteúdo...</p>
          </div>
        )}

        {step === "review" && (
          <div className="overflow-auto flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1" />
                <span className="font-medium">{rows.length}</span> {rows.length === 1 ? "unidade identificada" : "unidades identificadas"} ·{" "}
                <span className="text-muted-foreground">
                  {rows.filter(r => r._selected).length} selecionadas
                </span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRows(prev => prev.map(r => ({ ...r, _selected: true })))}>
                  Selecionar todas
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRows(prev => prev.map(r => ({ ...r, _selected: false })))}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="rounded border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="w-16">UF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={!r._selected ? "opacity-40" : ""}>
                      <TableCell>
                        <Checkbox checked={r._selected} onCheckedChange={(v) => updateRow(i, { _selected: !!v })} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.nome} onChange={(e) => updateRow(i, { nome: e.target.value })} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input value={r.cidade ?? ""} onChange={(e) => updateRow(i, { cidade: e.target.value || null })} className="h-8" />
                      </TableCell>
                      <TableCell>
                        {r.estado_id
                          ? <Badge variant="outline">{r.estado_sigla}</Badge>
                          : r.estado_sigla
                            ? <Badge variant="destructive" className="text-xs">{r.estado_sigla}?</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.tipo_id
                          ? <Badge variant="outline">{r.tipo_nome}</Badge>
                          : r.tipo_nome
                            ? <Badge variant="destructive" className="text-xs">{r.tipo_nome}?</Badge>
                            : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.telefone ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <Badge variant="destructive" className="text-xs mr-1">?</Badge>
              indica que a IA sugeriu um valor que não corresponde a um cadastro existente — será importado sem o vínculo.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "input" && (
            <>
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={processar} disabled={rawText.trim().length < 5 || !pastaDeterminada}>
                <Sparkles className="mr-2 h-4 w-4" />
                Processar com IA
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("input")} disabled={importing}>
                Voltar
              </Button>
              <Button onClick={importar} disabled={importing || rows.filter(r => r._selected).length === 0}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Importar {rows.filter(r => r._selected).length} {rows.filter(r => r._selected).length === 1 ? "item" : "itens"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
