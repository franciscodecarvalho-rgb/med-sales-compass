import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardVendedor } from "@/components/dashboards/DashboardVendedor";
import { DashboardGerente } from "@/components/dashboards/DashboardGerente";
import { DashboardTecnico } from "@/components/dashboards/DashboardTecnico";
import { DashboardAssistente } from "@/components/dashboards/DashboardAssistente";
import PainelGerencial from "./PainelGerencial";

function MeuDashboard() {
  const { roles } = useAuth();
  if (roles.includes("admin") || roles.includes("gerente")) return <DashboardGerente />;
  if (roles.includes("equipe_advance")) return <DashboardAssistente />;
  if (roles.includes("pos_venda")) return <DashboardTecnico />;
  return <DashboardVendedor />;
}

export default function Dashboard() {
  const { roles, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  const showPainel = roles.includes("admin") || roles.includes("gerente");

  if (!showPainel) return <MeuDashboard />;

  return (
    <Tabs defaultValue="meu" className="h-full">
      <div className="px-6 pt-6">
        <TabsList>
          <TabsTrigger value="meu">Meu Dashboard</TabsTrigger>
          <TabsTrigger value="painel">Painel Gerencial</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="meu" className="mt-0">
        <MeuDashboard />
      </TabsContent>
      <TabsContent value="painel" className="mt-0">
        <PainelGerencial />
      </TabsContent>
    </Tabs>
  );
}
