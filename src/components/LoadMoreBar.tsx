import { Button } from "@/components/ui/button";

/**
 * Barra de paginação incremental: mostra quantos registros estão carregados
 * do total e um botão "Carregar mais" enquanto houver mais no servidor.
 */
export const PAGE_SIZE = 100;

interface Props {
  loaded: number;
  total: number;
  loading?: boolean;
  onLoadMore: () => void;
}

export function LoadMoreBar({ loaded, total, loading = false, onLoadMore }: Props) {
  if (total <= loaded) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-3 text-sm text-muted-foreground">
      <span>Mostrando {loaded} de {total}</span>
      <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
        {loading ? "Carregando..." : "Carregar mais"}
      </Button>
    </div>
  );
}
