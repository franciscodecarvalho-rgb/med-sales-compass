import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search } from "lucide-react";
import RadarTab from "@/components/recorrencia/RadarTab";
import ProspeccaoTab from "@/components/recorrencia/ProspeccaoTab";

export default function Recorrencia() {
  const { can, loading } = usePermissions();

  if (!loading && !can("view_recorrencia")) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recorrência</h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento de recompra de consumíveis e prospecção de novos clientes.
        </p>
      </div>

      <Tabs defaultValue="radar">
        <TabsList>
          <TabsTrigger value="radar" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Radar
          </TabsTrigger>
          <TabsTrigger value="prospeccao" className="gap-2">
            <Search className="h-4 w-4" /> Prospecção
          </TabsTrigger>
        </TabsList>
        <TabsContent value="radar" className="mt-4">
          <RadarTab />
        </TabsContent>
        <TabsContent value="prospeccao" className="mt-4">
          <ProspeccaoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
