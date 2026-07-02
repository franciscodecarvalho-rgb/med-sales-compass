import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Páginas carregadas sob demanda (code-splitting) — cada rota vira um chunk próprio,
// mantendo recharts/xlsx/dnd-kit fora do bundle inicial.
const AuthPage = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NpsPublico = lazy(() => import("./pages/NpsPublico"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Unidades = lazy(() => import("./pages/Unidades"));
const UnidadeDetail = lazy(() => import("./pages/UnidadeDetail"));
const Discovery = lazy(() => import("./pages/Discovery"));
const DiscoveryDetail = lazy(() => import("./pages/DiscoveryDetail"));
const DiscoveryLab = lazy(() => import("./pages/DiscoveryLab"));
const Medicos = lazy(() => import("./pages/Medicos"));
const MedicoDetail = lazy(() => import("./pages/MedicoDetail"));
const FunilVendas = lazy(() => import("./pages/FunilVendas"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const FunilManutencao = lazy(() => import("./pages/FunilManutencao"));
const DealManutencaoDetail = lazy(() => import("./pages/DealManutencaoDetail"));
const VendasAdvance = lazy(() => import("./pages/VendasAdvance"));
const VendasAdvanceDetalhe = lazy(() => import("./pages/VendasAdvanceDetalhe"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const PosVenda = lazy(() => import("./pages/PosVenda"));
const Stakeholders = lazy(() => import("./pages/Stakeholders"));
const StakeholderDetail = lazy(() => import("./pages/StakeholderDetail"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Recorrencia = lazy(() => import("./pages/Recorrencia"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Pesquisa NPS pública — o cliente responde sem login */}
            <Route path="/nps/:token" element={<NpsPublico />} />
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
              <Route path="/vendas-advance" element={
                <ProtectedRoute requirePermission="view_vendas_advance"><VendasAdvance /></ProtectedRoute>
              } />
              <Route path="/vendas-advance/:id" element={
                <ProtectedRoute requirePermission="view_vendas_advance"><VendasAdvanceDetalhe /></ProtectedRoute>
              } />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/pos-venda/:tab?" element={
                <ProtectedRoute requirePermission="view_posvenda"><PosVenda /></ProtectedRoute>
              } />
              <Route path="/stakeholders" element={
                <ProtectedRoute requirePermission="view_stakeholders"><Stakeholders /></ProtectedRoute>
              } />
              <Route path="/stakeholders/:id" element={
                <ProtectedRoute requirePermission="view_stakeholders"><StakeholderDetail /></ProtectedRoute>
              } />
              <Route path="/recorrencia" element={
                <ProtectedRoute requirePermission="view_recorrencia"><Recorrencia /></ProtectedRoute>
              } />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/configuracoes" element={
                <ProtectedRoute requireRoles={["admin"]}><Configuracoes /></ProtectedRoute>
              } />

            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
