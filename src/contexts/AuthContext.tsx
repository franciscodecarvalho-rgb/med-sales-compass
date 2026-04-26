import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gerente" | "vendedor" | "pos_venda" | "assistente_vendas";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdminOrGerente: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Listener PRIMEIRO
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer DB call para evitar deadlock
        setTimeout(() => {
          fetchRoles(newSession.user.id);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // 2) DEPOIS recupera sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchRoles(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const fetchRoles = async (userId: string) => {
    // Verifica se o usuário está ativo; caso contrário, faz signOut imediatamente.
    const { data: profile } = await supabase
      .from("profiles")
      .select("ativo")
      .eq("id", userId)
      .maybeSingle();
    if (profile && profile.ativo === false) {
      await supabase.auth.signOut();
      setRoles([]);
      setUser(null);
      setSession(null);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdminOrGerente = roles.includes("admin") || roles.includes("gerente");

  return (
    <AuthContext.Provider
      value={{ user, session, roles, loading, signOut, hasRole, isAdminOrGerente }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  pos_venda: "Pós-Venda",
  assistente_vendas: "Assistente de Vendas",
};
