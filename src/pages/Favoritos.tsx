import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Building2, UserRound, Kanban, Wrench, Search as SearchIcon, Handshake, RefreshCw } from "lucide-react";
import { FavoritoStar } from "@/components/FavoritoStar";
import type { FavoritoTipo } from "@/hooks/useFavoritos";
import { CONSUMIVEL_STATUS_LABELS, CONSUMIVEL_STATUS_BADGE } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavRow { tipo: FavoritoTipo; item_id: string }

interface Grupo {
  tipo: FavoritoTipo;
  titulo: string;
  icon: React.ElementType;
  itens: Array<{ id: string; nome: string; subtitulo?: string; badge?: string; badgeClass?: string; link: string }>;
}

export default function Favoritos() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) void load(); }, [user]);

  async function load() {
    setLoading(true);
    try {
    const { data: favs } = await supabase
      .from("favoritos")
      .select("tipo, item_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const rows = (favs ?? []) as FavRow[];
    const ids = (tipo: FavoritoTipo) => rows.filter(f => f.tipo === tipo).map(f => f.item_id);

    const [unidades, medicos, deals, dealsManut, discoveries, stakeholders, recorrencias] = await Promise.all([
      ids("unidade").length
        ? supabase.from("unidades_saude").select("id, nome, cidade, estados(sigla)").in("id", ids("unidade"))
        : Promise.resolve({ data: [] }),
      ids("medico").length
        ? supabase.from("medicos").select("id, nome, especialidades_medicas(nome)").in("id", ids("medico"))
        : Promise.resolve({ data: [] }),
      ids("deal").length
        ? supabase.from("deals").select("id, titulo, estagio, unidades_saude(nome)").in("id", ids("deal"))
        : Promise.resolve({ data: [] }),
      ids("deal_manutencao").length
        ? supabase.from("deals_manutencao").select("id, titulo, estagio, unidades_saude(nome)").in("id", ids("deal_manutencao"))
        : Promise.resolve({ data: [] }),
      ids("discovery").length
        ? supabase.from("discovery").select("id, nome, status").in("id", ids("discovery"))
        : Promise.resolve({ data: [] }),
      ids("stakeholder").length
        ? supabase.from("stakeholders").select("id, nome, cargo").in("id", ids("stakeholder"))
        : Promise.resolve({ data: [] }),
      ids("recorrencia").length
        ? supabase.from("consumiveis_recorrencia").select("id, status, unidades_saude(nome), linhas_produto(nome)").in("id", ids("recorrencia"))
        : Promise.resolve({ data: [] }),
    ]);

    const gs: Grupo[] = ([
      {
        tipo: "unidade", titulo: "Unidades de Saúde", icon: Building2,
        itens: ((unidades.data ?? []) as any[]).map(u => ({
          id: u.id, nome: u.nome,
          subtitulo: [u.cidade, u.estados?.sigla].filter(Boolean).join(" - "),
          link: `/unidades/${u.id}`,
        })),
      },
      {
        tipo: "medico", titulo: "Médicos", icon: UserRound,
        itens: ((medicos.data ?? []) as any[]).map(m => ({
          id: m.id, nome: m.nome,
          subtitulo: m.especialidades_medicas?.nome,
          link: `/medicos/${m.id}`,
        })),
      },
      {
        tipo: "deal", titulo: "Deals de Venda", icon: Kanban,
        itens: ((deals.data ?? []) as any[]).map(d => ({
          id: d.id, nome: d.titulo,
          subtitulo: d.unidades_saude?.nome,
          badge: d.estagio,
          link: `/deals/${d.id}`,
        })),
      },
      {
        tipo: "deal_manutencao", titulo: "Deals de Manutenção", icon: Wrench,
        itens: ((dealsManut.data ?? []) as any[]).map(d => ({
          id: d.id, nome: d.titulo,
          subtitulo: d.unidades_saude?.nome,
          badge: d.estagio,
          link: `/deals-manutencao/${d.id}`,
        })),
      },
      {
        tipo: "discovery", titulo: "Discovery", icon: SearchIcon,
        itens: ((discoveries.data ?? []) as any[]).map(d => ({
          id: d.id, nome: d.nome,
          badge: d.status,
          link: `/discovery/${d.id}`,
        })),
      },
      {
        tipo: "stakeholder", titulo: "Parceiros", icon: Handshake,
        itens: ((stakeholders.data ?? []) as any[]).map(s => ({
          id: s.id, nome: s.nome,
          subtitulo: s.cargo,
          link: `/stakeholders/${s.id}`,
        })),
      },
      {
        tipo: "recorrencia", titulo: "Recorrência", icon: RefreshCw,
        itens: ((recorrencias.data ?? []) as any[]).map(r => ({
          id: r.id,
          nome: r.unidades_saude?.nome ?? "—",
          subtitulo: r.linhas_produto?.nome,
          badge: CONSUMIVEL_STATUS_LABELS[r.status as keyof typeof CONSUMIVEL_STATUS_LABELS],
          badgeClass: CONSUMIVEL_STATUS_BADGE[r.status as keyof typeof CONSUMIVEL_STATUS_BADGE],
          link: `/recorrencia`,
        })),
      },
    ] as Grupo[]).filter(g => g.itens.length > 0);

    setGrupos(gs);
    } catch (err) {
      console.error("Erro ao carregar favoritos:", err);
      toast.error("Erro ao carregar favoritos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const total = grupos.reduce((s, g) => s + g.itens.length, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" /> Favoritos
        </h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "item marcado" : "itens marcados"} — visíveis só para você.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum favorito ainda. Clique na estrela <Star className="inline h-4 w-4 text-muted-foreground/50" /> em qualquer
            unidade, médico, deal ou recorrência para marcá-lo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grupos.map(g => (
            <Card key={g.tipo}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <g.icon className="h-4 w-4 text-primary" /> {g.titulo}
                  <Badge variant="secondary" className="ml-auto">{g.itens.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {g.itens.map(item => (
                  <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <FavoritoStar tipo={g.tipo} itemId={item.id} />
                    <Link to={item.link} className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate hover:underline">{item.nome}</div>
                      {item.subtitulo && (
                        <div className="text-xs text-muted-foreground truncate">{item.subtitulo}</div>
                      )}
                    </Link>
                    {item.badge && (
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", item.badgeClass)}>
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
