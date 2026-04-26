import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABELS, AppRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  UserRound,
  Kanban,
  CheckSquare,
  Settings,
  Users,
  LogOut,
  Activity,
  Package,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: AppRole[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/unidades", label: "Unidades de Saúde", icon: Building2 },
  { to: "/medicos", label: "Médicos", icon: UserRound },
  { to: "/funil-vendas", label: "Funil de Vendas", icon: Kanban },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/pos-venda", label: "Pós-Venda", icon: Wrench, roles: ["admin", "gerente", "pos_venda"] },
  { to: "/equipamentos", label: "Equipamentos", icon: Package, roles: ["admin", "gerente"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
  { to: "/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
];

export default function AppLayout() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => roles.includes(r))
  );

  const primaryRole = roles[0];

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">VitaTech</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">CRM</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
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
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

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

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">VitaTech CRM</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex border-t bg-card md:hidden">
          {visibleItems.slice(0, 5).map((item) => (
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
