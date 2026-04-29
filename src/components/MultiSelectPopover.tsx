import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, X } from "lucide-react";

type Item = { id: string; label: string; sub?: string };

interface Props {
  items: Item[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

export function MultiSelectPopover({ items, selected, onChange, placeholder = "Selecionar...", emptyText = "Nada encontrado" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return items;
    return items.filter((i) => i.label.toLowerCase().includes(s) || (i.sub ?? "").toLowerCase().includes(s));
  }, [items, q]);
  const selectedItems = items.filter((i) => selected.includes(i.id));

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate text-muted-foreground">
              {selected.length > 0 ? `${selected.length} selecionado(s)` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b">
            <Input autoFocus placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyText}</div>}
            {filtered.map((i) => {
              const checked = selected.includes(i.id);
              return (
                <button key={i.id} type="button" onClick={() => toggle(i.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent">
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{i.label}</div>
                    {i.sub && <div className="truncate text-xs text-muted-foreground">{i.sub}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((i) => (
            <Badge key={i.id} variant="secondary" className="gap-1 pr-1">
              {i.label}
              <button type="button" onClick={() => toggle(i.id)} className="ml-1 rounded-sm hover:bg-muted-foreground/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
