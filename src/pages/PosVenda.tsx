import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ChamadosTab from "@/components/posvenda/ChamadosTab";
import ContratosTab from "@/components/posvenda/ContratosTab";
import GarantiasTab from "@/components/posvenda/GarantiasTab";
import NpsTab from "@/components/posvenda/NpsTab";

const TABS: Record<string, React.ElementType> = {
  chamados: ChamadosTab,
  contratos: ContratosTab,
  garantias: GarantiasTab,
  nps: NpsTab,
};

export default function PosVenda() {
  const { isAdminOrGerente, hasRole } = useAuth();
  const { tab } = useParams<{ tab?: string }>();

  if (!isAdminOrGerente && !hasRole("pos_venda")) return <Navigate to="/" replace />;
  if (!tab || !TABS[tab]) return <Navigate to="/pos-venda/chamados" replace />;

  const TabContent = TABS[tab];
  return <TabContent />;
}
