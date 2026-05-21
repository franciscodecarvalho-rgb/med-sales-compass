import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Unidades from "./pages/Unidades";
import UnidadeDetail from "./pages/UnidadeDetail";
import Discovery from "./pages/Discovery";
import DiscoveryDetail from "./pages/DiscoveryDetail";
import DiscoveryLab from "./pages/DiscoveryLab";
import Medicos from "./pages/Medicos";
import MedicoDetail from "./pages/MedicoDetail";
import Equipamentos from "./pages/Equipamentos";
import FunilVendas from "./pages/FunilVendas";
import DealDetail from "./pages/DealDetail";
import FunilManutencao from "./pages/FunilManutencao";
import DealManutencaoDetail from "./pages/DealManutencaoDetail";
import Faturamento from "./pages/Faturamento";
import Tarefas from "./pages/Tarefas";
import PosVenda from "./pages/PosVenda";
import Usuarios from "./pages/Usuarios";
import PainelGerencial from "./pages/PainelGerencial";
import Stakeholders from "./pages/Stakeholders";
import StakeholderDetail from "./pages/StakeholderDetail";
import Configuracoes from "./pages/Configuracoes";
import Lite from "./pages/Lite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/discovery" element={
                <ProtectedRoute requirePermission="view_discovery"><Discovery /></ProtectedRoute>
              } />
              <Route path="/discovery/lab" element={
                <ProtectedRoute requirePermission="view_discovery"><DiscoveryLab /></ProtectedRoute>
              } />
              <Route path="/discovery/:id" element={
                <ProtectedRoute requirePermission="view_discovery"><DiscoveryDetail /></ProtectedRoute>
              } />
              <Route path="/unidades" element={
                <ProtectedRoute requirePermission="view_unidades"><Unidades /></ProtectedRoute>
              } />
              <Route path="/unidades/:id" element={
                <ProtectedRoute requirePermission="view_unidades"><UnidadeDetail /></ProtectedRoute>
              } />
              <Route path="/medicos" element={
                <ProtectedRoute requirePermission="view_medicos"><Medicos /></ProtectedRoute>
              } />
              <Route path="/medicos/:id" element={
                <ProtectedRoute requirePermission="view_medicos"><MedicoDetail /></ProtectedRoute>
              } />
              <Route path="/equipamentos" element={
                <ProtectedRoute requirePermission="view_equipamentos"><Equipamentos /></ProtectedRoute>
              } />
              <Route path="/funil-vendas" element={
                <ProtectedRoute requirePermission="view_funil_vendas"><FunilVendas /></ProtectedRoute>
              } />
              <Route path="/deals/:id" element={
                <ProtectedRoute requirePermission="view_funil_vendas"><DealDetail /></ProtectedRoute>
              } />
              <Route path="/funil-manutencao" element={
                <ProtectedRoute requirePermission="view_funil_manut"><FunilManutencao /></ProtectedRoute>
              } />
              <Route path="/deals-manutencao/:id" element={
                <ProtectedRoute requirePermission="view_funil_manut"><DealManutencaoDetail /></ProtectedRoute>
              } />
              <Route path="/faturamento" element={
                <ProtectedRoute requirePermission="view_faturamento"><Faturamento /></ProtectedRoute>
              } />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/lite" element={<Lite />} />
              <Route path="/pos-venda" element={
                <ProtectedRoute requirePermission="view_posvenda"><PosVenda /></ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute requireRoles={["admin"]}><Usuarios /></ProtectedRoute>
              } />
              <Route path="/painel-gerencial" element={
                <ProtectedRoute requirePermission="view_painel"><PainelGerencial /></ProtectedRoute>
              } />
              <Route path="/stakeholders" element={
                <ProtectedRoute requirePermission="view_stakeholders"><Stakeholders /></ProtectedRoute>
              } />
              <Route path="/stakeholders/:id" element={
                <ProtectedRoute requirePermission="view_stakeholders"><StakeholderDetail /></ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute requireRoles={["admin"]}><Configuracoes /></ProtectedRoute>
              } />

            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
