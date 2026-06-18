import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flame, Trophy, Phone, CalendarCheck, RefreshCw, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Linha { vendedor_id: string; nome: string; contatos: number; agendamentos: number }
interface Campanha { titulo: string; meta_contatos_dia: number; meta_agendas_dia: number }

function corPct(pct: number): { bar: string; text: string } {
  if (pct >= 100) return { bar: "bg-success", text: "text-success" };
  if (pct >= 60) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-destructive", text: "text-destructive" };
}

export default function TodosNoAtaque() {
  const { roles } = useAuth();
  const isGestor = roles.includes("admin") || roles.includes("gerente");
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [campRes, rpcRes] = await Promise.all([
      supabase.from("metas_campanha").select("titulo, meta_contatos_dia, meta_agendas_dia").eq("ativo", true).maybeSingle(),
      supabase.rpc("painel_ataque_hoje"),
    ]);
    setCampanha(campRes.data ?? null);
    setLinhas((rpcRes.data ?? []) as Linha[]);
    setLoading(false);
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando campanha...</div>;
  if (!campanha) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma campanha de meta ativa. {isGestor ? "Defina uma abaixo." : "Peça ao gestor para configurar."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalContatos = linhas.reduce((s, l) => s + l.contatos, 0);
  const totalAgendas = linhas.reduce((s, l) => s + l.agendamentos, 0);
  const pctContatos = (totalContatos / campanha.meta_contatos_dia) * 100;
  const pctAgendas = (totalAgendas / campanha.meta_agendas_dia) * 100;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Flame className="h-7 w-7 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campanha.titulo}</h1>
          <p className="text-sm text-muted-foreground">Meta diária da empresa — todos juntos no ataque 🚀</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar
          </Button>
          {isGestor && <EditarCampanhaDialog campanha={campanha} onSaved={load} />}
        </div>
      </div>

      {/* Termômetros coletivos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetaHero
          icone={<Phone className="h-5 w-5" />}
          rotulo="Contatos hoje"
          realizado={totalContatos}
          meta={campanha.meta_contatos_dia}
          pct={pctContatos}
        />
        <MetaHero
          icone={<CalendarCheck className="h-5 w-5" />}
          rotulo="Agendas hoje"
          realizado={totalAgendas}
          meta={campanha.meta_agendas_dia}
          pct={pctAgendas}
        />
      </div>

      {/* Ranking de contribuição */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold">Quem está no ataque hoje</h2>
        </div>
        {linhas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Ninguém pontuou ainda hoje. Seja o primeiro a atacar! 💪
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {linhas.map((l, i) => (
              <Card key={l.vendedor_id} className={i === 0 ? "border-l-4 border-l-warning" : ""}>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.nome}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {l.contatos}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarCheck className="h-3.5 w-3.5" /> {l.agendamentos}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaHero({ icone, rotulo, realizado, meta, pct }: {
  icone: React.ReactNode; rotulo: string; realizado: number; meta: number; pct: number;
}) {
  const cor = corPct(pct);
  const barPct = Math.min(100, pct);
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icone} {rotulo}
          </div>
          <span className={cn("text-sm font-semibold", cor.text)}>{Math.round(pct)}%</span>
        </div>
        <div className="text-4xl font-bold">
          {realizado}
          <span className="text-lg font-normal text-muted-foreground"> / {meta}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full transition-all", cor.bar)} style={{ width: `${barPct}%` }} />
        </div>
        {realizado >= meta && <p className={cn("text-xs font-medium", cor.text)}>Meta batida! 🎉</p>}
      </CardContent>
    </Card>
  );
}

function EditarCampanhaDialog({ campanha, onSaved }: { campanha: Campanha; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(campanha.titulo);
  const [contatos, setContatos] = useState(String(campanha.meta_contatos_dia));
  const [agendas, setAgendas] = useState(String(campanha.meta_agendas_dia));
  const [saving, setSaving] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const vc = Number(contatos), va = Number(agendas);
    if (!vc || vc < 1 || !va || va < 1) { toast.error("Metas devem ser ao menos 1"); return; }
    setSaving(true);
    const { error } = await supabase.from("metas_campanha")
      .update({ titulo: titulo.trim() || "Todos no Ataque", meta_contatos_dia: vc, meta_agendas_dia: va })
      .eq("ativo", true);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha atualizada");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-1 h-3.5 w-3.5" /> Editar meta</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Meta da campanha</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Todos no Ataque" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contatos/dia *</Label>
              <Input type="number" min={1} required value={contatos} onChange={e => setContatos(e.target.value)} placeholder="40" />
            </div>
            <div className="space-y-2">
              <Label>Agendas/dia *</Label>
              <Input type="number" min={1} required value={agendas} onChange={e => setAgendas(e.target.value)} placeholder="4" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
