import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritos, type FavoritoTipo } from "@/hooks/useFavoritos";

interface Props {
  tipo: FavoritoTipo;
  itemId: string;
  className?: string;
}

export function FavoritoStar({ tipo, itemId, className }: Props) {
  const { isFavorito, toggle } = useFavoritos();
  const fav = isFavorito(tipo, itemId);

  return (
    <button
      type="button"
      title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(tipo, itemId);
      }}
      className={cn(
        "shrink-0 rounded p-0.5 transition-colors hover:bg-muted",
        className
      )}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          fav
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      />
    </button>
  );
}
