import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRound } from "lucide-react";

/**
 * Exibe quem criou um registro (procedência imutável).
 * Resolve o nome do perfil a partir do userId.
 */
export default function CriadoPor({
  userId,
  prefixo = "Criado por",
  extra,
}: {
  userId?: string | null;
  prefixo?: string;
  extra?: React.ReactNode; // ex.: badge de origem
}) {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setNome(null); return; }
    void supabase.from("profiles").select("nome").eq("id", userId).maybeSingle()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [userId]);

  if (!userId && !extra) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {userId && (
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3.5 w-3.5" />
          {prefixo} <span className="font-medium text-foreground">{nome ?? "—"}</span>
        </span>
      )}
      {extra}
    </div>
  );
}
