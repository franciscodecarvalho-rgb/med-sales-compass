import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FavoritoTipo =
  | "unidade" | "medico" | "deal" | "deal_manutencao"
  | "discovery" | "stakeholder" | "recorrencia";

// Cache simples em módulo para evitar refetch a cada estrela montada
let cache: Set<string> | null = null;
let cacheUserId: string | null = null;
const listeners = new Set<() => void>();

function key(tipo: FavoritoTipo, itemId: string) {
  return `${tipo}:${itemId}`;
}

function notify() {
  listeners.forEach(fn => fn());
}

async function loadCache(userId: string) {
  const { data } = await supabase
    .from("favoritos")
    .select("tipo, item_id")
    .eq("user_id", userId);
  cache = new Set((data ?? []).map((f: any) => key(f.tipo, f.item_id)));
  cacheUserId = userId;
  notify();
}

export function useFavoritos() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick(t => t + 1);
    listeners.add(rerender);
    if (user && cacheUserId !== user.id) void loadCache(user.id);
    return () => { listeners.delete(rerender); };
  }, [user]);

  const isFavorito = useCallback((tipo: FavoritoTipo, itemId: string) => {
    return cache?.has(key(tipo, itemId)) ?? false;
  }, []);

  const toggle = useCallback(async (tipo: FavoritoTipo, itemId: string) => {
    if (!user || !cache) return;
    const k = key(tipo, itemId);
    if (cache.has(k)) {
      cache.delete(k);
      notify();
      const { error } = await supabase.from("favoritos")
        .delete().eq("user_id", user.id).eq("tipo", tipo).eq("item_id", itemId);
      if (error) { cache.add(k); notify(); toast.error(error.message); }
    } else {
      cache.add(k);
      notify();
      const { error } = await supabase.from("favoritos")
        .insert({ user_id: user.id, tipo, item_id: itemId });
      if (error) { cache.delete(k); notify(); toast.error(error.message); }
    }
  }, [user]);

  return { isFavorito, toggle };
}
