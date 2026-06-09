import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth, ROLE_LABELS } from "@/contexts/AuthContext";
import { usePermissions, Permission } from "@/hooks/usePermissions";
import {
  LayoutDashboard, Building2, UserRound, Kanban, CheckSquare,
  Settings, LogOut, Activity, Wrench, Search as SearchIcon,
  Handshake, ClipboardCheck, FileText, ShieldCheck, Smile,
  ArrowLeft, ArrowRight, MessageSquare, RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
  adminOnly?: boolean;
  badgeKey?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

// ── Sidebar principal ──────────────────────────────────────────────────────
const mainSections: NavSection[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { to: "/funil-vendas", label: "Funil de Vendas", icon: Kanban, permission: "view_funil_vendas" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { to: "/funil-vendas", label: "Funil de Vendas", icon: Kanban, permission: "view_funil_vendas" },
      { to: "/recorrencia", label: "Recorrência", icon: RefreshCw, permission: "view_recorrencia" },
      { to: "/discovery", label: "Discovery", icon: SearchIcon, permission: "view_discovery" },
      { to: "/unidades", label: "Unidades de Saúde", icon: Building2, permission: "view_unidades" },
      { to: "/medicos", label: "Médicos", icon: UserRound, permission: "view_medicos" },
      { to: "/stakeholders", label: "Parceiros", icon: Handshake, permission: "view_stakeholders" },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/vendas-advance", label: "Vendas Advance", icon: ClipboardCheck, permission: "view_vendas_advance", badgeKey: "advance_em_andamento" },
    ],
  },
];

const adminItems: NavItem[] = [
  { to: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

// ── Sidebar Pós-Venda ──────────────────────────────────────────────────────
const posVendaItems: NavItem[] = [
  { to: "/funil-manutencao", label: "Funil de Manutenção", icon: Wrench, permission: "view_funil_manut" },
  { to: "/pos-venda/chamados", label: "Chamados", icon: MessageSquare, permission: "view_posvenda" },
  { to: "/pos-venda/contratos", label: "Contratos", icon: FileText, permission: "view_posvenda" },
  { to: "/pos-venda/garantias", label: "Garantias", icon: ShieldCheck, permission: "view_posvenda" },
  { to: "/pos-venda/nps", label: "NPS", icon: Smile, permission: "view_posvenda" },
];

const POS_VENDA_PREFIXES = ["/funil-manutencao", "/deals-manutencao", "/pos-venda"];

function NavItemLink({ item, badges }: { item: NavItem; badges: Record<string, number> }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badgeKey && badges[item.badgeKey] > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {badges[item.badgeKey]}
        </span>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, roles, signOut } = useAuth();
  const { can, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [badges, setBadges] = useState<Record<string, number>>({});

  const isPosVenda = POS_VENDA_PREFIXES.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    async function loadBadges() {
      const { count } = await supabase
        .from("saidas_advance")
        .select("*", { count: "exact", head: true })
        .eq("status", "em_andamento");
      setBadges({ advance_em_andamento: count ?? 0 });
    }
    void loadBadges();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const primaryRole = roles[0];

  const isVisible = (item: NavItem) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return can(item.permission);
    return true;
  };

  // Itens visíveis para mobile bottom nav
  const mobileItems = isPosVenda
    ? posVendaItems.filter(isVisible).slice(0, 5)
    : mainSections.flatMap(s => s.items).filter(isVisible).slice(0, 5);

  return (
    <div className="flex h-screen w-full bg-background">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">

        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">VitaTech</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              {isPosVenda ? "Pós-Venda" : "CRM"}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">

          {isPosVenda ? (
            <>
              {/* Voltar ao CRM */}
              <button
                onClick={() => navigate("/")}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Voltar ao CRM</span>
              </button>
              <div className="my-2 border-t border-sidebar-border" />
              {posVendaItems.filter(isVisible).map(item => (
                <NavItemLink key={item.to} item={item} badges={badges} />
              ))}
            </>
          ) : (
            <>
              {/* Seções principais */}
              {mainSections.map((section, si) => (
                <div key={si}>
                  {section.label && (
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                        {section.label}
                      </span>
                    </div>
                  )}
                  {section.items.filter(isVisible).map(item => (
                    <NavItemLink key={item.to} item={item} badges={badges} />
                  ))}
                  {si < mainSections.length - 1 && (
                    <div className="my-2 border-t border-sidebar-border" />
                  )}
                </div>
              ))}

              {/* Entrada Pós-Venda */}
              {can("view_posvenda") && (
                <>
                  <div className="my-2 border-t border-sidebar-border" />
                  <button
                    onClick={() => navigate("/pos-venda/chamados")}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <Wrench className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Pós-Venda</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </button>
                </>
              )}

              {/* Admin */}
              {adminItems.filter(isVisible).length > 0 && (
                <>
                  <div className="my-2 border-t border-sidebar-border" />
                  {adminItems.filter(isVisible).map(item => (
                    <NavItemLink key={item.to} item={item} badges={badges} />
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs">
            <div className="truncate font-medium text-sidebar-foreground">{user?.email}</div>
            {primaryRole && (
              <div className="text-sidebar-foreground/60">{ROLE_LABELS[primaryRole]}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">VitaTech</span>
          </div>
          <div className="flex-1 flex justify-center md:justify-start">
            <GlobalSearch />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="md:hidden">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex border-t bg-card md:hidden">
          {mobileItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label.split(" ")[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
