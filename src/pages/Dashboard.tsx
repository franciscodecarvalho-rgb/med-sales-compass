import { useAuth } from "@/contexts/AuthContext";
import { DashboardVendedor } from "@/components/dashboards/DashboardVendedor";
import { DashboardGerente } from "@/components/dashboards/DashboardGerente";
import { DashboardTecnico } from "@/components/dashboards/DashboardTecnico";
import { DashboardAssistente } from "@/components/dashboards/DashboardAssistente";

export default function Dashboard() {
  const { roles, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  // Prioridade: admin/gerente > assistente > técnico > vendedor (default)
  if (roles.includes("admin") || roles.includes("gerente")) return <DashboardGerente />;
  if (roles.includes("assistente_vendas")) return <DashboardAssistente />;
  if (roles.includes("pos_venda")) return <DashboardTecnico />;
  return <DashboardVendedor />;
}
