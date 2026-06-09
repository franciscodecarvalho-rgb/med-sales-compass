import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";

export type Permission =
  | "view_discovery"
  | "view_funil_vendas"
  | "view_funil_manut"
  | "view_posvenda"
  | "view_equipamentos"
  | "view_faturamento"
  | "view_vendas_advance"
  | "view_medicos"
  | "view_unidades"
  | "view_painel"
  | "view_stakeholders"
  | "view_recorrencia"
  | "view_all_records"
  | "edit_all_records"
  | "export_data"
  | "delete_records";

type Matrix = Record<string, Record<string, boolean>>; // role -> perm -> allowed

export function usePermissions() {
  const { roles, loading: authLoading } = useAuth();
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("role_permissions").select("role, permission, allowed");
    const m: Matrix = {};
    (data ?? []).forEach((r: any) => {
      m[r.role] ??= {};
      m[r.role][r.permission] = !!r.allowed;
    });
    setMatrix(m);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isAdmin = roles.includes("admin");

  const can = useCallback(
    (perm: Permission): boolean => {
      if (isAdmin) return true;
      return roles.some((r) => matrix[r]?.[perm] === true);
    },
    [isAdmin, roles, matrix]
  );

  return { can, matrix, loading: loading || authLoading, reload: load, isAdmin };
}

// Direct (sync) check for a given role + matrix — used by Permissões page.
export function roleHas(matrix: Matrix, role: AppRole, perm: Permission) {
  if (role === "admin") return true;
  return matrix[role]?.[perm] === true;
}
