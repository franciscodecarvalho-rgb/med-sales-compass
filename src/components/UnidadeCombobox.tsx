import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Unidade { id: string; nome: string; cidade?: string | null; estado?: string | null; cnpj?: string | null }

const normalizeSearch = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

interface Props {
  unidades: Unidade[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

/** Combobox com busca real para selecionar unidade de saúde. */
export default function UnidadeCombobox({ unidades, value, onChange, placeholder = "Selecione a unidade" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => unidades.find((u) => u.id === value), [unidades, value]);
  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return unidades;
    return unidades.filter((u) =>
      [u.nome, u.cidade, u.estado, u.cnpj].some((field) => normalizeSearch(field).includes(q))
    );
  }, [unidades, query]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          {selected ? selected.nome : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar unidade..."
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {unidades.length === 0 ? "Nenhuma unidade cadastrada" : "Nenhuma unidade encontrada"}
            </div>
          ) : filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u.id); setOpen(false); setQuery(""); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent",
                u.id === value && "bg-accent/60"
              )}
            >
              <Check className={cn("h-4 w-4", u.id === value ? "opacity-100" : "opacity-0")} />
              <span className="min-w-0">
                <span className="block truncate">{u.nome}</span>
                {[u.cidade, u.estado].filter(Boolean).length > 0 && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {[u.cidade, u.estado].filter(Boolean).join(" - ")}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
