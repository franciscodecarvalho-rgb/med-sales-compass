import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Archive, ArchiveRestore, Settings as SettingsIcon, Layers, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterMode = "ativos" | "inativos" | "todos";

interface SimpleRow {
  id: string;
  nome: string;
  archived_at: string | null;
}

interface LinhaRow extends SimpleRow {
  descricao: string | null;
  cor: string;
  limite_verde_dias: number;
  limite_amarelo_dias: number;
}

interface EstadoRow extends SimpleRow {
  sigla: string;
}

const SIMPLE_TABLES = [
  { key: "tipos_unidade", label: "Tipos de Unidade", description: "Hospital, Clínica, UBS…" },
  { key: "especialidades_medicas", label: "Especialidades Médicas", description: "Áreas médicas dos contatos" },
  { key: "papeis_contato", label: "Papéis de Contato", description: "Decisor, Compras, Diretor…" },
  { key: "marcas_equipamento", label: "Marcas", description: "Fabricantes dos equipamentos" },
  { key: "tipos_equipamento", label: "Tipos de Equipamento", description: "Ultrassom, Endoscópio…" },
  { key: "motivos_perda", label: "Motivos de Perda", description: "Razões para deals perdidos" },
] as const;

type SimpleKey = (typeof SIMPLE_TABLES)[number]["key"];

export default function Configuracoes() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as listas e parâmetros do sistema. Itens nunca são apagados — apenas desativados.
        </p>
      </div>

      <Tabs defaultValue="linhas" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="linhas">Linhas de Produto</TabsTrigger>
          <TabsTrigger value="contador">Contador</TabsTrigger>
          {SIMPLE_TABLES.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
          <TabsTrigger value="estados">Estados</TabsTrigger>
        </TabsList>

        <TabsContent value="linhas"><LinhasSection /></TabsContent>
        <TabsContent value="contador"><ContadorSection /></TabsContent>
        {SIMPLE_TABLES.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            <SimpleSection table={t.key} title={t.label} description={t.description} />
          </TabsContent>
        ))}
        <TabsContent value="estados"><EstadosSection /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- FilterBar ----------------
function FilterBar({ value, onChange, count }: { value: FilterMode; onChange: (v: FilterMode) => void; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <Select value={value} onValueChange={(v) => onChange(v as FilterMode)}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ativos">Apenas ativos</SelectItem>
          <SelectItem value="inativos">Apenas inativos</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">{count} {count === 1 ? "item" : "itens"}</span>
    </div>
  );
}

// ---------------- LINHAS ----------------
function LinhasSection() {
  const [items, setItems] = useState<LinhaRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("ativos");
  const [open, setOpen] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data, error } = await supabase
      .from("linhas_produto")
      .select("id, nome, descricao, cor, limite_verde_dias, limite_amarelo_dias, archived_at")
      .order("nome");
    if (error) { toast.error(error.message); return; }
    setItems((data ?? []) as LinhaRow[]);
  }

  async function update(id: string, patch: Partial<LinhaRow>) {
    const { error } = await supabase.from("linhas_produto").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Atualizado");
    void load();
  }

  async function toggleArchive(row: LinhaRow) {
    await update(row.id, { archived_at: row.archived_at ? null : new Date().toISOString() });
  }

  const filtered = items.filter((i) => {
    if (filter === "ativos") return !i.archived_at;
    if (filter === "inativos") return !!i.archived_at;
    return true;
  });

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Linhas de Produto
            </CardTitle>
            <CardDescription>
              Cada linha terá funil de vendas e funil de manutenção próprios. As cores aparecem no Kanban.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova linha</Button>
            </DialogTrigger>
            <NovaLinhaForm onSaved={() => { setOpen(false); void load(); }} />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar value={filter} onChange={setFilter} count={filtered.length} />
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha.</p>}
        {filtered.map((l) => (
          <div
            key={l.id}
            className={cn(
              "grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto_auto_auto_auto]",
              l.archived_at && "bg-muted/40 opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: l.cor }} />
              <div className="flex-1 min-w-0">
                <Input
                  defaultValue={l.nome}
                  className={cn(l.archived_at && "line-through")}
                  onBlur={(e) => e.target.value !== l.nome && update(l.id, { nome: e.target.value })}
                />
                {l.archived_at && <Badge variant="secondary" className="mt-1 text-[10px]">inativa</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Cor</Label>
              <Input type="color" defaultValue={l.cor} className="h-8 w-16 p-1"
                onBlur={(e) => e.target.value !== l.cor && update(l.id, { cor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">🟢 dias</Label>
              <Input type="number" min={1} defaultValue={l.limite_verde_dias} className="w-20"
                onBlur={(e) => Number(e.target.value) !== l.limite_verde_dias && update(l.id, { limite_verde_dias: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">🟡 dias</Label>
              <Input type="number" min={1} defaultValue={l.limite_amarelo_dias} className="w-20"
                onBlur={(e) => Number(e.target.value) !== l.limite_amarelo_dias && update(l.id, { limite_amarelo_dias: Number(e.target.value) })} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => toggleArchive(l)}>
              {l.archived_at ? <><ArchiveRestore className="mr-1 h-4 w-4" />Reativar</> : <><Archive className="mr-1 h-4 w-4" />Desativar</>}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NovaLinhaForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ nome: "", descricao: "", cor: "#0ea5e9", limite_verde_dias: 30, limite_amarelo_dias: 60 });
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
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-full p-1" />
          </div>
          <div className="space-y-2">
            <Label>🟢 dias</Label>
            <Input type="number" min={1} value={form.limite_verde_dias} onChange={(e) => setForm({ ...form, limite_verde_dias: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>🟡 dias</Label>
            <Input type="number" min={1} value={form.limite_amarelo_dias} onChange={(e) => setForm({ ...form, limite_amarelo_dias: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------------- CONTADOR ----------------
function ContadorSection() {
  const [config, setConfig] = useState<{ id: string; limite_verde_dias: number; limite_amarelo_dias: number } | null>(null);
  const [verde, setVerde] = useState(30);
  const [amarelo, setAmarelo] = useState(60);

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data } = await supabase.from("config_contador").select("*").eq("is_default", true).maybeSingle();
    if (data) {
      setConfig(data);
      setVerde(data.limite_verde_dias);
      setAmarelo(data.limite_amarelo_dias);
    }
  }

  async function save() {
    if (verde >= amarelo) { toast.error("Verde deve ser menor que amarelo"); return; }
    if (!config) {
      const { error } = await supabase.from("config_contador").insert({ limite_verde_dias: verde, limite_amarelo_dias: amarelo, is_default: true });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("config_contador").update({ limite_verde_dias: verde, limite_amarelo_dias: amarelo }).eq("id", config.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Contador atualizado");
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /> Contador de Tempo (global)</CardTitle>
        <CardDescription>
          Aplicado quando uma linha não define seus próprios limites. Define quando os cards do Kanban ficam verdes, amarelos ou vermelhos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> Verde até</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} value={verde} onChange={(e) => setVerde(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">dias</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-yellow-500" /> Amarelo até</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} value={amarelo} onChange={(e) => setAmarelo(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">dias</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> Vermelho</Label>
            <div className="flex items-center gap-2 h-10">
              <span className="text-sm text-muted-foreground">Acima de {amarelo} dias</span>
            </div>
          </div>
        </div>
        <Button onClick={save}>Salvar</Button>
      </CardContent>
    </Card>
  );
}

// ---------------- SIMPLE SECTION (lista nome única) ----------------
function SimpleSection({ table, title, description }: { table: SimpleKey; title: string; description: string }) {
  const [items, setItems] = useState<SimpleRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("ativos");
  const [novo, setNovo] = useState("");
  const [editing, setEditing] = useState<SimpleRow | null>(null);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [table]);

  async function load() {
    const { data, error } = await supabase.from(table).select("id, nome, archived_at").order("nome");
    if (error) { toast.error(error.message); return; }
    setItems((data ?? []) as SimpleRow[]);
  }

  async function add() {
    const nome = novo.trim();
    if (!nome) return;
    const { error } = await supabase.from(table).insert({ nome });
    if (error) { toast.error(error.message); return; }
    setNovo("");
    toast.success("Adicionado");
    void load();
  }

  async function rename(id: string, nome: string) {
    const { error } = await supabase.from(table).update({ nome }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Renomeado");
    setEditing(null);
    void load();
  }

  async function toggleArchive(row: SimpleRow) {
    const { error } = await supabase.from(table).update({ archived_at: row.archived_at ? null : new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(row.archived_at ? "Reativado" : "Desativado");
    void load();
  }

  const filtered = items.filter((i) => {
    if (filter === "ativos") return !i.archived_at;
    if (filter === "inativos") return !!i.archived_at;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Adicionar ${title.toLowerCase().replace(/s$/, "")}…`}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
        </div>
        <FilterBar value={filter} onChange={setFilter} count={filtered.length} />
        <div className="divide-y rounded-md border">
          {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum item.</p>}
          {filtered.map((row) => (
            <div key={row.id} className={cn("flex items-center gap-2 p-2", row.archived_at && "bg-muted/40")}>
              {editing?.id === row.id ? (
                <Input
                  autoFocus
                  defaultValue={row.nome}
                  onBlur={(e) => rename(row.id, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rename(row.id, (e.target as HTMLInputElement).value)}
                />
              ) : (
                <span className={cn("flex-1 text-sm", row.archived_at && "line-through text-muted-foreground")}>
                  {row.nome}
                </span>
              )}
              {row.archived_at && <Badge variant="secondary" className="text-[10px]">inativo</Badge>}
              <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleArchive(row)}>
                {row.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- ESTADOS ----------------
function EstadosSection() {
  const [items, setItems] = useState<EstadoRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("ativos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sigla: "", nome: "" });

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data, error } = await supabase.from("estados").select("id, sigla, nome, archived_at").order("nome");
    if (error) { toast.error(error.message); return; }
    setItems((data ?? []) as EstadoRow[]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const sigla = form.sigla.trim().toUpperCase();
    const nome = form.nome.trim();
    if (sigla.length !== 2 || !nome) { toast.error("Preencha sigla (2 letras) e nome"); return; }
    const { error } = await supabase.from("estados").insert({ sigla, nome });
    if (error) { toast.error(error.message); return; }
    toast.success("Estado adicionado");
    setForm({ sigla: "", nome: "" });
    setOpen(false);
    void load();
  }

  async function toggleArchive(row: EstadoRow) {
    const { error } = await supabase.from("estados").update({ archived_at: row.archived_at ? null : new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  const filtered = items.filter((i) => {
    if (filter === "ativos") return !i.archived_at;
    if (filter === "inativos") return !!i.archived_at;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Estados</CardTitle>
            <CardDescription>Estados brasileiros usados nos cadastros de unidades.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo estado</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-3">
                <div className="space-y-2">
                  <Label>Sigla *</Label>
                  <Input maxLength={2} value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar value={filter} onChange={setFilter} count={filtered.length} />
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className={cn("flex items-center justify-between rounded-md border p-2", e.archived_at && "bg-muted/40 opacity-60")}>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{e.sigla}</Badge>
                <span className={cn("text-sm", e.archived_at && "line-through")}>{e.nome}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleArchive(e)}>
                {e.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
