import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Building2, UserRound, Kanban, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  label: string;
  hint?: string;
  to: string;
  group: "Unidades" | "Médicos" | "Vendas" | "Manutenção";
};

const GROUP_ICON = {
  "Unidades": Building2,
  "Médicos": UserRound,
  "Vendas": Kanban,
  "Manutenção": Wrench,
} as const;

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(() => void search(q.trim()), 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function search(term: string) {
    const like = `%${term}%`;
    const [un, md, dv, dm] = await Promise.all([
      supabase.from("unidades_saude")
        .select("id, nome, cnpj, cidade, estado")
        .or(`nome.ilike.${like},cnpj.ilike.${like},cidade.ilike.${like}`)
        .is("archived_at", null).limit(5),
      supabase.from("medicos")
        .select("id, nome, crm, especialidade")
        .or(`nome.ilike.${like},crm.ilike.${like}`)
        .is("archived_at", null).limit(5),
      supabase.from("deals")
        .select("id, titulo, unidades_saude(nome)")
        .ilike("titulo", like)
        .is("archived_at", null).limit(5),
      supabase.from("deals_manutencao")
        .select("id, titulo, unidades_saude(nome)")
        .ilike("titulo", like)
        .is("archived_at", null).limit(5),
    ]);

    const list: Result[] = [
      ...(un.data ?? []).map((u: any) => ({
        id: u.id, label: u.nome,
        hint: [u.cidade, u.estado].filter(Boolean).join(" · ") || u.cnpj || undefined,
        to: `/unidades/${u.id}`, group: "Unidades" as const,
      })),
      ...(md.data ?? []).map((m: any) => ({
        id: m.id, label: `Dr. ${m.nome}`,
        hint: [m.crm, m.especialidade].filter(Boolean).join(" · ") || undefined,
        to: `/medicos/${m.id}`, group: "Médicos" as const,
      })),
      ...(dv.data ?? []).map((d: any) => ({
        id: d.id, label: d.titulo,
        hint: d.unidades_saude?.nome,
        to: `/deals/${d.id}`, group: "Vendas" as const,
      })),
      ...(dm.data ?? []).map((d: any) => ({
        id: d.id, label: d.titulo,
        hint: d.unidades_saude?.nome,
        to: `/deals-manutencao/${d.id}`, group: "Manutenção" as const,
      })),
    ];
    setResults(list);
    setLoading(false);
  }

  function handleSelect(r: Result) {
    setOpen(false);
    setQ("");
    navigate(r.to);
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar unidades, médicos, deals..."
          className="pl-9 h-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover shadow-lg max-h-[70vh] overflow-y-auto">
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">Nenhum resultado para "{q}"</div>
          )}
          {Object.entries(grouped).map(([group, items]) => {
            const Icon = GROUP_ICON[group as keyof typeof GROUP_ICON];
            return (
              <div key={group} className="border-b last:border-b-0">
                <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {group}
                </div>
                {items.map((r) => (
                  <button
                    key={`${r.group}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2",
                    )}
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      {r.hint && <div className="text-[11px] text-muted-foreground truncate">{r.hint}</div>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
