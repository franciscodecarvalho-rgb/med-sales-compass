import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Wrench, Hammer, FileText, ShieldCheck, Smile } from "lucide-react";
import ChamadosTab from "@/components/posvenda/ChamadosTab";
import InstalacoesTab from "@/components/posvenda/InstalacoesTab";
import ContratosTab from "@/components/posvenda/ContratosTab";
import GarantiasTab from "@/components/posvenda/GarantiasTab";
import NpsTab from "@/components/posvenda/NpsTab";

export default function PosVenda() {
  const { isAdminOrGerente, hasRole } = useAuth();
  // Permissão: Admin/Gerente/Pós-Venda. Outros redirecionados.
  if (!isAdminOrGerente && !hasRole("pos_venda")) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pós-Venda</h1>
        <p className="text-muted-foreground">Chamados, instalações, contratos, garantias e satisfação dos clientes.</p>
      </div>

      <Tabs defaultValue="chamados" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="chamados" className="gap-2"><Wrench className="h-4 w-4" />Chamados</TabsTrigger>
          <TabsTrigger value="instalacoes" className="gap-2"><Hammer className="h-4 w-4" />Instalações</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2"><FileText className="h-4 w-4" />Contratos</TabsTrigger>
          <TabsTrigger value="garantias" className="gap-2"><ShieldCheck className="h-4 w-4" />Garantias</TabsTrigger>
          <TabsTrigger value="nps" className="gap-2"><Smile className="h-4 w-4" />NPS</TabsTrigger>
        </TabsList>
        <TabsContent value="chamados"><ChamadosTab /></TabsContent>
        <TabsContent value="instalacoes"><InstalacoesTab /></TabsContent>
        <TabsContent value="contratos"><ContratosTab /></TabsContent>
        <TabsContent value="garantias"><GarantiasTab /></TabsContent>
        <TabsContent value="nps"><NpsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
