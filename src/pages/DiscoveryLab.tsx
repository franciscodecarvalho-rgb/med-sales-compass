import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, FlaskConical, Search, Star, ExternalLink, Loader2, X, Check,
  Eye, Stethoscope, Send, MapPin, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Cnae = { id: string; descricao: string };
type Uf = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

type Socio = { nome: string; qualificacao?: string; entrada?: string; medico?: boolean };

type Resultado = {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  cidade?: string;
  uf?: string;
  cnae_descricao?: string;
  cnae_codigo?: string;
  capital_social?: number;
  data_abertura?: string;
  porte?: string;
  email?: string;
  socios?: Socio[];
  rating?: number | null;
  reviews?: number | null;
  site?: string | null;
  telefone?: string | null;
  telefone_receita?: string | null;
  endereco?: string;
  eliminado?: { por?: string; em?: string; motivo?: string } | null;
  status_busca: "pendente" | "ok" | "erro";
};

const PAGE_SIZE = 50;

// ============ SCORE ============
function scoreBreakdown(r: Resultado) {
  // Google
  let google = 0;
  if (r.rating != null && r.rating > 0) {
    const reviews = r.reviews ?? 0;
    google = r.rating * 2 + (reviews > 0 ? Math.log10(reviews) * 3 : 0);
  }
  // Tempo
  let tempo = 0;
  let anos = 0;
  if (r.data_abertura) {
    anos = (Date.now() - new Date(r.data_abertura).getTime()) / (365.25 * 86400000);
    tempo = anos > 10 ? 10 : anos >= 5 ? 7 : anos >= 2 ? 4 : 1;
  }
  // Capital
  let capital = 0;
  if (r.capital_social != null) {
    const c = r.capital_social;
    capital = c > 1_000_000 ? 10 : c >= 500_000 ? 7 : c >= 100_000 ? 4 : 1;
  }
  // Médico
  const medicos = r.socios?.filter((s) => s.medico).length ?? 0;
  const medico = medicos > 0 ? 15 : 0;
  // Porte
  const p = (r.porte ?? "").toLowerCase();
  const porte = /demais|grande/.test(p) ? 8 : /epp/.test(p) ? 5 : /\bme\b/.test(p) ? 2 : 0;

  const total = google + tempo + capital + medico + porte;
  return { google, tempo, capital, medico, porte, total, anos };
}

function scoreColor(total: number) {
  if (total >= 30) return "border-emerald-400 bg-emerald-100 text-emerald-700";
  if (total >= 15) return "border-yellow-400 bg-yellow-100 text-yellow-800";
  return "border-muted bg-muted text-muted-foreground";
}

export default function DiscoveryLab() {
  const { user, roles } = useAuth();
  const nav = useNavigate();
  const isAdminGerente = roles.includes("admin") || roles.includes("gerente");
  const podeUsar = isAdminGerente || roles.includes("vendedor");

  const [usage, setUsage] = useState<{ limite_mensal: number; chamadas_mes_atual: number } | null>(null);
  const [cnaeList, setCnaeList] = useState<Cnae[]>([]);
  const [ufs, setUfs] = useState<Uf[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  const [cnaeSel, setCnaeSel] = useState<Cnae[]>([]);
  const [cnaeOpen, setCnaeOpen] = useState(false);
  const [cnaeQuery, setCnaeQuery] = useState("");
  const [uf, setUf] = useState<string>("");
  const [municipio, setMunicipio] = useState<string>("");
  const [situacao, setSituacao] = useState<string>("ATIVA");

  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [stageProg, setStageProg] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Resultado[]>([]);
  const [page, setPage] = useState(1);

  // seleção e modais
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Resultado | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<Resultado | Resultado[] | null>(null);
  const [enviarOpen, setEnviarOpen] = useState(false);

  useEffect(() => { void loadInitial(); /* eslint-disable-next-line */ }, []);

  async function loadInitial() {
    const [u, ufRes, cnaeRes] = await Promise.all([
      callFn({ action: "usage" }),
      fetch("https://servicosdados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome").then((r) => r.json()),
      fetch("https://servicosdados.ibge.gov.br/api/v2/cnae/subclasses").then((r) => r.json()),
    ]);
    if (u?.usage) setUsage(u.usage);
    setUfs(ufRes ?? []);
    setCnaeList((cnaeRes ?? []).map((c: any) => ({ id: String(c.id), descricao: c.descricao })));
  }

  useEffect(() => {
    if (!uf) { setMunicipios([]); setMunicipio(""); return; }
    fetch(`https://servicosdados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json()).then((d) => setMunicipios(d ?? []));
    setMunicipio("");
  }, [uf]);

  async function callFn(body: any) {
    const { data, error } = await supabase.functions.invoke("lab-search", { body });
    if (error) {
      const ctx = (error as any).context;
      try {
        const txt = await ctx?.text?.();
        if (txt) return JSON.parse(txt);
      } catch {}
      throw error;
    }
    return data;
  }

  const cnaeFiltered = useMemo(() => {
    const q = cnaeQuery.toLowerCase().trim();
    if (!q) return cnaeList.slice(0, 50);
    return cnaeList
      .filter((c) => c.id.includes(q) || c.descricao.toLowerCase().includes(q))
      .slice(0, 100);
  }, [cnaeQuery, cnaeList]);

  const usagePct = usage ? Math.round((usage.chamadas_mes_atual / usage.limite_mensal) * 100) : 0;
  const usageColor = usagePct >= 95 ? "bg-destructive" : usagePct >= 80 ? "bg-yellow-500" : "bg-emerald-500";
  const usageRest = usage ? usage.limite_mensal - usage.chamadas_mes_atual : 0;
  const limitReached = usage ? usage.chamadas_mes_atual >= usage.limite_mensal : false;

  function isMedico(s: { nome?: string; qualificacao?: string }) {
    const txt = `${s.nome ?? ""} ${s.qualificacao ?? ""}`.toLowerCase();
    return /m[ée]dic|crm|cir(u|ú)rgi|cl[íi]nica m[ée]dica/.test(txt);
  }

  async function pesquisar() {
    if (!cnaeSel.length || !uf || !municipio) {
      toast.error("Preencha CNAE, UF e Cidade"); return;
    }
    if (limitReached) return;

    const estimado = 200;
    if (usage && usageRest < estimado) {
      const ok = confirm(
        `Esta busca pode consumir ~${estimado} chamadas. Você tem ${usageRest} restantes este mês. Continuar?`
      );
      if (!ok) return;
    }

    setResults([]); setPage(1); setSelected(new Set());
    setStage(1); setStageProg({ done: 0, total: 1 });
    let lista: any[] = [];
    try {
      const r = await callFn({
        action: "search",
        cnae: cnaeSel.map((c) => c.id),
        uf, municipio, situacao,
      });
      if (r?.error) throw new Error(r.error);
      lista = r.results ?? [];
    } catch (e: any) {
      toast.error(`Falha na busca: ${e.message ?? e}`);
      setStage(0); return;
    }

    const cnpjsNorm = lista.map((x) => String(x.cnpj ?? x.cnpj_basico ?? "").replace(/\D/g, "")).filter(Boolean);
    const { data: elim } = await supabase
      .from("lab_eliminados")
      .select("cnpj, motivo, eliminado_em, eliminado_por")
      .in("cnpj", cnpjsNorm);
    const elimMap = new Map<string, any>();
    (elim ?? []).forEach((e: any) => elimMap.set(e.cnpj, e));

    const base: Resultado[] = lista.map((it: any) => {
      const cnpj = String(it.cnpj ?? it.cnpj_basico ?? "").replace(/\D/g, "");
      const e = elimMap.get(cnpj);
      return {
        cnpj,
        razao_social: it.razao_social,
        nome_fantasia: it.nome_fantasia,
        cidade: it.municipio,
        uf: it.uf,
        cnae_descricao: it.atividade_principal,
        status_busca: "pendente",
        eliminado: e ? { motivo: e.motivo, em: e.eliminado_em } : null,
      };
    });
    setResults(base);

    setStage(2);
    const enriquecer = base.map((b, i) => ({ b, i })).filter(({ b }) => !b.eliminado);
    setStageProg({ done: 0, total: enriquecer.length });

    for (let k = 0; k < enriquecer.length; k++) {
      const { b, i } = enriquecer[k];
      try {
        const r = await callFn({ action: "enrich", cnpj: b.cnpj });
        if (r?.error === "limit_reached") {
          toast.error("Limite mensal atingido durante o enriquecimento.");
          if (r.usage) setUsage(r.usage);
          setStage(0); return;
        }
        if (r?.usage) setUsage(r.usage);
        const d = r?.data ?? {};
        const company = d.company ?? {};
        const members: Socio[] = (company.members ?? []).map((m: any) => ({
          nome: m?.person?.name ?? m?.name,
          qualificacao: m?.role?.text ?? m?.qualification,
          entrada: m?.since,
        }));
        const tel = d.phones?.[0] ? `${d.phones[0].area}${d.phones[0].number}` : null;
        const enriched: Partial<Resultado> = {
          razao_social: company.name ?? b.razao_social,
          nome_fantasia: d.alias ?? b.nome_fantasia,
          cidade: d.address?.city ?? b.cidade,
          uf: d.address?.state ?? b.uf,
          endereco: [d.address?.street, d.address?.number, d.address?.district, d.address?.city, d.address?.state]
            .filter(Boolean).join(", "),
          capital_social: company.equity,
          data_abertura: d.founded,
          porte: company.size?.text,
          cnae_descricao: d.mainActivity?.text ?? b.cnae_descricao,
          cnae_codigo: d.mainActivity?.id ? String(d.mainActivity.id) : undefined,
          email: d.emails?.[0]?.address,
          telefone: tel, telefone_receita: tel,
          socios: members.map((m) => ({ ...m, medico: isMedico(m) })),
          status_busca: "ok",
        };
        setResults((prev) => prev.map((x, idx) => idx === i ? { ...x, ...enriched } : x));
      } catch {
        setResults((prev) => prev.map((x, idx) => idx === i ? { ...x, status_busca: "erro" } : x));
      }
      setStageProg({ done: k + 1, total: enriquecer.length });
      await new Promise((res) => setTimeout(res, 220));
    }

    setStage(3);
    setStageProg({ done: 0, total: enriquecer.length });
    for (let k = 0; k < enriquecer.length; k++) {
      const { i } = enriquecer[k];
      let nome = ""; let cidade = "";
      setResults((prev) => {
        nome = prev[i]?.nome_fantasia || prev[i]?.razao_social || "";
        cidade = prev[i]?.cidade || "";
        return prev;
      });
      const q = `${nome} ${cidade}`.trim();
      if (!q) { setStageProg({ done: k + 1, total: enriquecer.length }); continue; }
      try {
        const r = await callFn({ action: "places", query: q });
        if (r?.error === "limit_reached") {
          toast.error("Limite mensal atingido durante avaliação Google.");
          if (r.usage) setUsage(r.usage);
          setStage(0); return;
        }
        if (r?.usage) setUsage(r.usage);
        const p = r?.place;
        if (p) {
          setResults((prev) => prev.map((x, idx) => idx === i ? {
            ...x,
            rating: p.rating ?? null,
            reviews: p.user_ratings_total ?? null,
            site: p.website ?? null,
            telefone: p.formatted_phone_number ?? x.telefone,
          } : x));
        }
      } catch {}
      setStageProg({ done: k + 1, total: enriquecer.length });
      await new Promise((res) => setTimeout(res, 220));
    }

    setStage(0);
    toast.success(`Busca concluída — ${base.length} empresas`);
  }

  // ordenação por score (maior primeiro), eliminados ao final
  const ordered = useMemo(() => {
    const withScore = results.map((r) => ({ r, s: scoreBreakdown(r).total }));
    withScore.sort((a, b) => {
      const aE = a.r.eliminado ? 1 : 0; const bE = b.r.eliminado ? 1 : 0;
      if (aE !== bE) return aE - bE;
      return b.s - a.s;
    });
    return withScore;
  }, [results]);

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const pageRows = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectableOnPage = pageRows.filter(({ r }) => !r.eliminado).map(({ r }) => r.cnpj);
  const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((c) => selected.has(c));
  function togglePageAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) selectableOnPage.forEach((c) => next.delete(c));
      else selectableOnPage.forEach((c) => next.add(c));
      return next;
    });
  }
  function toggleOne(cnpj: string) {
    setSelected((prev) => {
      const next = new Set(prev); next.has(cnpj) ? next.delete(cnpj) : next.add(cnpj); return next;
    });
  }

  const selectedNonElim = useMemo(
    () => results.filter((r) => selected.has(r.cnpj) && !r.eliminado),
    [results, selected]
  );

  // ========== Eliminação ==========
  async function confirmarEliminar(targets: Resultado[], motivo: string) {
    if (!user) return;
    const rows = targets.map((t) => ({
      cnpj: t.cnpj,
      razao_social: t.razao_social ?? t.nome_fantasia ?? null,
      motivo: motivo.trim() || null,
      eliminado_por: user.id,
    }));
    const { error } = await supabase
      .from("lab_eliminados")
      .upsert(rows, { onConflict: "cnpj" });
    if (error) { toast.error(error.message); return; }
    const cnpjs = new Set(targets.map((t) => t.cnpj));
    setResults((prev) => prev.map((r) =>
      cnpjs.has(r.cnpj)
        ? { ...r, eliminado: { motivo: motivo.trim() || undefined, em: new Date().toISOString() } }
        : r,
    ));
    setSelected((prev) => {
      const next = new Set(prev); cnpjs.forEach((c) => next.delete(c)); return next;
    });
    toast.success(`${targets.length} empresa(s) eliminada(s)`);
    setEliminarTarget(null);
  }

  // ========== Enviar para Discovery ==========
  async function confirmarEnviar() {
    if (!user) return;
    if (selectedNonElim.length === 0) return;
    const { data: estados } = await supabase.from("estados").select("id, sigla");
    const ufMap = new Map((estados ?? []).map((e: any) => [e.sigla, e.id]));

    let okCount = 0;
    for (const r of selectedNonElim) {
      const sb = scoreBreakdown(r);
      const idadeAnos = sb.anos ? Math.floor(sb.anos) : null;
      const dataAbertura = r.data_abertura
        ? new Date(r.data_abertura).toLocaleDateString("pt-BR") : null;
      const ratingTxt = r.rating != null
        ? `${r.rating.toFixed(1)} estrelas (${r.reviews ?? 0} reviews)` : "—";
      const sociosLista = (r.socios ?? []).map((s) => {
        const since = s.entrada ? ` — desde ${new Date(s.entrada).toLocaleDateString("pt-BR")}` : "";
        const med = s.medico ? " ⚕️" : "";
        return `- ${s.nome}${s.qualificacao ? ` (${s.qualificacao})` : ""}${since}${med}`;
      }).join("\n");
      const possiveisMedicos = (r.socios ?? []).filter((s) => s.medico);
      const notaMedicos = possiveisMedicos.map((s) => `⚕️ Sócio ${s.nome} identificado como possível médico`).join("\n");

      const info =
        `=== DADOS DO LAB ===\n` +
        `Capital Social: ${r.capital_social != null ? r.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}\n` +
        `Porte: ${r.porte ?? "—"}\n` +
        `Tempo de Atividade: ${idadeAnos != null ? `${idadeAnos} anos` : "—"}${dataAbertura ? ` (desde ${dataAbertura})` : ""}\n` +
        `CNAE: ${r.cnae_codigo ?? ""} ${r.cnae_codigo ? "- " : ""}${r.cnae_descricao ?? "—"}\n` +
        `Avaliação Google: ${ratingTxt}\n` +
        `Score LAB: ${sb.total.toFixed(1)} pontos\n\n` +
        `=== SÓCIOS ===\n${sociosLista || "—"}` +
        (notaMedicos ? `\n\n${notaMedicos}` : "");

      const { data: disc, error } = await supabase.from("discovery").insert({
        nome: r.nome_fantasia || r.razao_social || "Sem nome",
        cnpj: r.cnpj,
        endereco: r.endereco ?? null,
        cidade: r.cidade ?? null,
        estado_id: r.uf ? ufMap.get(r.uf) ?? null : null,
        telefone: r.telefone ?? r.telefone_receita ?? null,
        email: r.email ?? null,
        site: r.site ?? null,
        informacoes_adicionais: info,
        vendedor_id: user.id,
        created_by: user.id,
        status: "em_pesquisa",
      }).select("id").single();

      if (error) {
        console.error(error);
        toast.error(`Falha em ${r.cnpj}: ${error.message}`);
        continue;
      }
      okCount++;

      // possíveis médicos
      for (const s of possiveisMedicos) {
        const { data: medExist } = await supabase
          .from("medicos").select("id").ilike("nome", s.nome).maybeSingle();
        let medId = medExist?.id;
        if (!medId) {
          const { data: novo } = await supabase.from("medicos").insert({
            nome: s.nome, created_by: user.id,
            observacoes: `Identificado via LAB como possível sócio médico${s.qualificacao ? ` (${s.qualificacao})` : ""}`,
          }).select("id").single();
          medId = novo?.id;
        }
        if (medId && disc?.id) {
          await supabase.from("medico_discovery").insert({ medico_id: medId, discovery_id: disc.id });
        }
      }
    }

    toast.success(`${okCount} empresa(s) enviada(s) para o Discovery!`);
    setEnviarOpen(false);
    nav("/discovery");
  }

  if (!podeUsar) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Você não tem permissão para acessar o LAB.</p>
        <Button variant="outline" onClick={() => nav("/discovery")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Discovery
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-background to-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button variant="secondary" size="sm" onClick={() => nav("/discovery")} className="shrink-0">
              <ArrowLeft className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Voltar ao Discovery</span>
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <FlaskConical className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight sm:text-xl">LAB — Laboratório de Prospecção</h1>
                <p className="hidden text-xs text-orange-100 sm:block">Busca inteligente · CNAE · cidade · enriquecimento</p>
              </div>
            </div>
          </div>
          <div className="w-full rounded-lg bg-white/10 p-2 backdrop-blur sm:w-auto sm:min-w-[260px] sm:p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>Uso mensal de chamadas</span>
              <span className="font-semibold">
                {usage?.chamadas_mes_atual ?? 0} / {usage?.limite_mensal ?? 1300}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
              <div className={cn("h-full transition-all", usageColor)} style={{ width: `${Math.min(100, usagePct)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
        {/* Filtros */}
        <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-12">
            <div className="sm:col-span-2 md:col-span-5">
              <Label>CNAE *</Label>
              <Popover open={cnaeOpen} onOpenChange={setCnaeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {cnaeSel.length ? `${cnaeSel.length} CNAE(s) selecionado(s)` : "Selecionar CNAE..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(480px,calc(100vw-1.5rem))] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar por código ou descrição..." value={cnaeQuery} onValueChange={setCnaeQuery} />
                    <CommandList>
                      <CommandEmpty>Nenhum CNAE encontrado</CommandEmpty>
                      <CommandGroup>
                        {cnaeFiltered.map((c) => {
                          const sel = cnaeSel.some((x) => x.id === c.id);
                          return (
                            <CommandItem key={c.id} onSelect={() => {
                              setCnaeSel((prev) => sel ? prev.filter((x) => x.id !== c.id) : [...prev, c]);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                              <span className="font-mono text-xs mr-2">{c.id}</span>
                              <span className="truncate">{c.descricao}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {cnaeSel.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {cnaeSel.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1">
                      <span className="font-mono">{c.id}</span>
                      <button onClick={() => setCnaeSel((prev) => prev.filter((x) => x.id !== c.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>UF *</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {ufs.map((u) => <SelectItem key={u.id} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Cidade *</Label>
              <Select value={municipio} onValueChange={setMunicipio} disabled={!uf}>
                <SelectTrigger><SelectValue placeholder={uf ? "Cidade" : "Escolha a UF"} /></SelectTrigger>
                <SelectContent>
                  {municipios.map((m) => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 md:col-span-2">
              <Label>Situação</Label>
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="BAIXADA">Baixada</SelectItem>
                  <SelectItem value="INAPTA">Inapta</SelectItem>
                  <SelectItem value="SUSPENSA">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-stretch sm:justify-end">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:from-orange-600 hover:to-orange-700 sm:w-auto"
              disabled={limitReached || stage !== 0}
              onClick={pesquisar}
              title={limitReached ? "Limite de 1.300 chamadas mensais atingido" : ""}
            >
              {stage === 0 ? <Search className="mr-2 h-5 w-5" /> : <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Pesquisar
            </Button>
          </div>
        </div>

        {/* Progresso */}
        {stage !== 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">
                {stage === 1 && "Etapa 1/3 — Buscando empresas..."}
                {stage === 2 && `Etapa 2/3 — Enriquecendo dados (${stageProg.done}/${stageProg.total})`}
                {stage === 3 && `Etapa 3/3 — Buscando avaliações (${stageProg.done}/${stageProg.total})`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((s) => (
                <Progress
                  key={s}
                  value={s < stage ? 100 : s === stage ? (stageProg.total ? (stageProg.done / stageProg.total) * 100 : 30) : 0}
                  className="h-2"
                />
              ))}
            </div>
          </div>
        )}

        {/* Barra de ações em lote */}
        {selectedNonElim.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-orange-300 bg-orange-50 p-3 shadow-sm animate-in slide-in-from-top-2">
            <span className="text-sm font-medium">
              {selectedNonElim.length} empresa(s) selecionada(s)
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Limpar seleção
              </Button>
              <Button
                variant="destructive" size="sm"
                onClick={() => setEliminarTarget(selectedNonElim)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar Selecionados
              </Button>
            </div>
          </div>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox checked={allPageSelected} onCheckedChange={togglePageAll} />
                    </TableHead>
                    <TableHead className="w-24">Ranking</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Porte</TableHead>
                    <TableHead>Sócios</TableHead>
                    <TableHead>Google</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Tel.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(({ r, s }, idx) => {
                    const elim = !!r.eliminado;
                    const idade = r.data_abertura
                      ? `${Math.floor((Date.now() - new Date(r.data_abertura).getTime()) / (365.25 * 86400000))} anos`
                      : "—";
                    const medicos = r.socios?.filter((x) => x.medico).length ?? 0;
                    const ranking = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <TableRow
                        key={r.cnpj + idx}
                        className={cn(
                          elim ? "bg-red-50 hover:bg-red-100/70" : (idx % 2 ? "bg-muted/30" : ""),
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            disabled={elim}
                            checked={selected.has(r.cnpj)}
                            onCheckedChange={() => toggleOne(r.cnpj)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{ranking}</span>
                            <Badge variant="outline" className={cn("font-mono text-xs", scoreColor(s))}>
                              {s.toFixed(0)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="font-medium truncate">{r.nome_fantasia || r.razao_social || "—"}</div>
                          {r.razao_social && r.nome_fantasia && (
                            <div className="text-xs text-muted-foreground truncate">{r.razao_social}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.cnpj}</TableCell>
                        <TableCell className="text-xs">{[r.cidade, r.uf].filter(Boolean).join(" / ")}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{r.cnae_descricao ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.capital_social != null
                            ? r.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{idade}</TableCell>
                        <TableCell className="text-xs">{r.porte ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.socios?.length ?? 0}
                          {medicos > 0 && (
                            <Badge variant="outline" className="ml-1 border-purple-300 bg-purple-50 text-purple-700">
                              <Stethoscope className="mr-0.5 h-3 w-3" /> {medicos}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.rating != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {r.rating.toFixed(1)}
                              <span className="text-muted-foreground">({r.reviews ?? 0})</span>
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.site ? (
                            <a href={r.site} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-primary hover:underline">
                              site <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.telefone ?? "—"}</TableCell>
                        <TableCell>
                          {elim ? (
                            <Badge variant="outline" className="border-red-400 bg-red-100 text-red-700" title={r.eliminado?.motivo ?? ""}>
                              JÁ ELIMINADO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">Novo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetail(r)} title="Ver detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!elim && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setEliminarTarget(r)} title="Eliminar">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-3 text-sm">
                <span className="text-muted-foreground">
                  Página {page} de {totalPages} · {ordered.length} resultados
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {results.length === 0 && stage === 0 && (
          <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-10 text-center text-sm text-muted-foreground">
            Configure os filtros acima e clique em <strong>Pesquisar</strong> para iniciar.
          </div>
        )}
      </div>

      {/* Sticky bottom — Enviar para Discovery */}
      {selectedNonElim.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-4 shadow-2xl backdrop-blur animate-in slide-in-from-bottom">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-semibold">{selectedNonElim.length}</span> empresa(s) prontas para enviar ao Discovery
            </div>
            <Button
              size="lg"
              onClick={() => setEnviarOpen(true)}
              className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
            >
              <Send className="mr-2 h-5 w-5" />
              Enviar {selectedNonElim.length} empresa(s) para Discovery →
            </Button>
          </div>
        </div>
      )}

      {/* Modais */}
      <DetalhesModal r={detail} onClose={() => setDetail(null)} />
      <EliminarModal
        target={eliminarTarget}
        onClose={() => setEliminarTarget(null)}
        onConfirm={confirmarEliminar}
      />
      <EnviarDialog
        open={enviarOpen}
        count={selectedNonElim.length}
        onClose={() => setEnviarOpen(false)}
        onConfirm={confirmarEnviar}
      />
    </div>
  );
}

// ============ Modais ============
function DetalhesModal({ r, onClose }: { r: Resultado | null; onClose: () => void }) {
  if (!r) return null;
  const sb = scoreBreakdown(r);
  const cnpjFmt = r.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const items = [
    { label: "Google", v: sb.google },
    { label: "Tempo", v: sb.tempo },
    { label: "Capital", v: sb.capital },
    { label: "Médico", v: sb.medico },
    { label: "Porte", v: sb.porte },
  ];
  const max = Math.max(15, ...items.map((i) => i.v));
  return (
    <Dialog open={!!r} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {r.nome_fantasia || r.razao_social}
            <Badge variant="outline" className={cn("font-mono", scoreColor(sb.total))}>
              Score {sb.total.toFixed(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>{r.razao_social} · {cnpjFmt}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">📍 Endereço & Contato</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3" /> {r.endereco ?? "—"}</div>
              <div>📞 {r.telefone ?? "—"}</div>
              {r.telefone_receita && r.telefone !== r.telefone_receita && (
                <div className="text-muted-foreground">Receita: {r.telefone_receita}</div>
              )}
              <div>✉️ {r.email ?? "—"}</div>
              {r.site && <div>🌐 <a className="text-primary hover:underline" href={r.site} target="_blank" rel="noreferrer">{r.site}</a></div>}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">💰 Financeiro</h4>
            <div className="space-y-1 text-xs">
              <div>Capital social: <strong>{r.capital_social != null ? r.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong></div>
              <div>Porte: <strong>{r.porte ?? "—"}</strong></div>
              <div>Tempo de atividade: <strong>{sb.anos ? `${Math.floor(sb.anos)} anos` : "—"}</strong></div>
              {r.data_abertura && <div className="text-muted-foreground">Aberta em {new Date(r.data_abertura).toLocaleDateString("pt-BR")}</div>}
            </div>
          </div>

          <div className="rounded-lg border p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold">🏷️ Atividade</h4>
            <div className="text-xs">
              <span className="font-mono mr-2">{r.cnae_codigo ?? ""}</span>
              {r.cnae_descricao ?? "—"}
            </div>
          </div>

          <div className="rounded-lg border p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold">⭐ Google</h4>
            {r.rating != null ? (
              <div className="text-xs flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <strong>{r.rating.toFixed(1)}</strong>
                <span className="text-muted-foreground">({r.reviews ?? 0} avaliações)</span>
                <a
                  className="ml-auto text-primary hover:underline"
                  target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((r.nome_fantasia || r.razao_social || "") + " " + (r.cidade ?? ""))}`}
                >
                  abrir no Google Maps →
                </a>
              </div>
            ) : <p className="text-xs text-muted-foreground">Sem avaliação encontrada</p>}
          </div>

          <div className="rounded-lg border p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold">👥 Sócios ({r.socios?.length ?? 0})</h4>
            {r.socios?.length ? (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Qualificação</TableHead><TableHead>Entrada</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {r.socios.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs flex items-center gap-1">
                        {s.medico && <Stethoscope className="h-3 w-3 text-purple-600" />}
                        {s.nome}
                      </TableCell>
                      <TableCell className="text-xs">{s.qualificacao ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {s.entrada ? new Date(s.entrada).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-xs text-muted-foreground">Sem informações de sócios</p>}
          </div>

          <div className="rounded-lg border p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold">📊 Breakdown do Score: {sb.total.toFixed(1)}</h4>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.label} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <div className="col-span-2">{i.label}</div>
                  <div className="col-span-9 h-3 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                      style={{ width: `${(i.v / max) * 100}%` }}
                    />
                  </div>
                  <div className="col-span-1 text-right font-mono">{i.v.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EliminarModal({
  target, onClose, onConfirm,
}: {
  target: Resultado | Resultado[] | null;
  onClose: () => void;
  onConfirm: (targets: Resultado[], motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (target) setMotivo(""); }, [target]);
  if (!target) return null;
  const arr = Array.isArray(target) ? target : [target];
  const titulo = arr.length === 1
    ? `Eliminar "${arr[0].nome_fantasia || arr[0].razao_social}"?`
    : `Eliminar ${arr.length} empresas?`;
  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {arr.length === 1 ? "Esta empresa" : "Estas empresas"} não aparecerão mais em buscas futuras para nenhum vendedor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: já é cliente, fora do perfil, etc."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(arr, motivo); setBusy(false); }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar eliminação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnviarDialog({
  open, count, onClose, onConfirm,
}: {
  open: boolean; count: number; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar {count} empresa(s) para Discovery</DialogTitle>
          <DialogDescription>
            Cada empresa virará um item de Discovery atribuído a você, com todos os dados do LAB no campo de informações.
            Sócios identificados como possíveis médicos serão criados no cadastro de médicos e vinculados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" /> Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
