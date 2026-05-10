
CREATE TABLE public.lab_pendentes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj text NOT NULL UNIQUE,
  razao_social text,
  nome_fantasia text,
  cidade text,
  uf text,
  endereco text,
  cnae_codigo text,
  cnae_descricao text,
  capital_social numeric,
  data_abertura date,
  porte text,
  email text,
  telefone text,
  site text,
  socios jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric,
  reviews integer,
  score numeric NOT NULL DEFAULT 0,
  pesquisado_por uuid,
  pesquisado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_pendentes_score ON public.lab_pendentes (score DESC);

ALTER TABLE public.lab_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_pendentes_select ON public.lab_pendentes
FOR SELECT TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR public.has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE POLICY lab_pendentes_insert ON public.lab_pendentes
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_gerente(auth.uid())
  OR public.has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE POLICY lab_pendentes_update ON public.lab_pendentes
FOR UPDATE TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR public.has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE POLICY lab_pendentes_delete ON public.lab_pendentes
FOR DELETE TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR public.has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE TRIGGER trg_lab_pendentes_updated
BEFORE UPDATE ON public.lab_pendentes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
