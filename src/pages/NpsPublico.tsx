/**
 * Página PÚBLICA da pesquisa NPS — /nps/:token (sem login).
 *
 * O cliente recebe o link gerado na área NPS de uma Saída Advance.
 * Todo o acesso ao banco passa pelas funções SECURITY DEFINER
 * nps_pesquisa_publica / nps_responder_publico (a tabela continua
 * fechada para o papel anon).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Star, AlertTriangle } from "lucide-react";

const ASPECTOS = [
  { chave: "atendimento_comercial", label: "Atendimento comercial" },
  { chave: "prazo_entrega",         label: "Prazo de entrega" },
  { chave: "instalacao_treinamento", label: "Instalação / treinamento" },
];

export default function NpsPublico() {
  const { token } = useParams<{ token: string }>();

  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState<{ cliente: string | null; respondido: boolean } | null>(null);

  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [estrelas, setEstrelas] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (supabase as any)
      .rpc("nps_pesquisa_publica", { p_token: token })
      .then(({ data, error }: any) => {
        if (error || !data) setPesquisa(null);
        else setPesquisa(data);
        setCarregando(false);
      });
  }, [token]);

  async function enviar() {
    if (nota == null || !token) return;
    setEnviando(true);
    setErro(null);
    const { error } = await (supabase as any).rpc("nps_responder_publico", {
      p_token: token,
      p_nota: nota,
      p_comentario: comentario.trim() || null,
      p_avaliacoes: Object.keys(estrelas).length ? estrelas : null,
    });
    setEnviando(false);
    if (error) { setErro(error.message); return; }
    setEnviado(true);
  }

  // ── Estados de tela ──
  if (carregando) {
    return (
      <Shell>
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </Shell>
    );
  }

  if (!pesquisa) {
    return (
      <Shell>
        <div className="text-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold">Pesquisa não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            Este link não é válido. Confira com quem enviou a pesquisa.
          </p>
        </div>
      </Shell>
    );
  }

  if (pesquisa.respondido || enviado) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold">Obrigado pela sua avaliação!</h1>
          <p className="text-sm text-muted-foreground">
            Sua resposta foi registrada. A equipe Vitatech agradece.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-primary">VitaTech</div>
          <h1 className="text-lg font-semibold">Pesquisa de satisfação</h1>
          {pesquisa.cliente && (
            <p className="text-sm text-muted-foreground">{pesquisa.cliente}</p>
          )}
        </div>

        {/* Nota NPS 0-10 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">
            De 0 a 10, quanto você recomendaria a Vitatech a um colega?
          </p>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNota(i)}
                className={`aspect-square rounded-md border text-sm font-bold transition-colors ${
                  nota === i
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            <span>Não recomendaria</span>
            <span>Com certeza</span>
          </div>
        </div>

        {/* Comentário */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">O que motivou sua nota? <span className="text-muted-foreground font-normal">(opcional)</span></p>
          <Textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte pra gente..."
          />
        </div>

        {/* Avaliações rápidas 1-5 */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Avalie rapidamente <span className="text-muted-foreground font-normal">(opcional)</span></p>
          {ASPECTOS.map((a) => (
            <div key={a.chave} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{a.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEstrelas((p) => ({ ...p, [a.chave]: n }))}
                    title={`${n} de 5`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        (estrelas[a.chave] ?? 0) >= n
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {erro && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {erro}
          </div>
        )}

        <Button className="w-full" size="lg" onClick={enviar} disabled={nota == null || enviando}>
          {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enviar avaliação
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}
