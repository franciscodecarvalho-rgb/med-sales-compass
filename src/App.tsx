import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/Auth";
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
import Configuracoes from "./pages/Configuracoes";
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
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/discovery" element={
                <ProtectedRoute requireRoles={["admin", "gerente", "vendedor"]}><Discovery /></ProtectedRoute>
              } />
              <Route path="/discovery/lab" element={
                <ProtectedRoute requireRoles={["admin", "gerente", "vendedor"]}><DiscoveryLab /></ProtectedRoute>
              } />
              <Route path="/discovery/:id" element={
                <ProtectedRoute requireRoles={["admin", "gerente", "vendedor"]}><DiscoveryDetail /></ProtectedRoute>
              } />
              <Route path="/unidades" element={<Unidades />} />
              <Route path="/unidades/:id" element={<UnidadeDetail />} />
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/medicos/:id" element={<MedicoDetail />} />
              <Route path="/equipamentos" element={
                <ProtectedRoute requireRoles={["admin", "gerente"]}><Equipamentos /></ProtectedRoute>
              } />
              <Route path="/funil-vendas" element={<FunilVendas />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/funil-manutencao" element={<FunilManutencao />} />
              <Route path="/deals-manutencao/:id" element={<DealManutencaoDetail />} />
              <Route path="/faturamento" element={
                <ProtectedRoute requireRoles={["admin", "gerente", "assistente_vendas"]}><Faturamento /></ProtectedRoute>
              } />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/pos-venda" element={
                <ProtectedRoute requireRoles={["admin", "gerente", "pos_venda"]}><PosVenda /></ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute requireRoles={["admin"]}><Usuarios /></ProtectedRoute>
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
