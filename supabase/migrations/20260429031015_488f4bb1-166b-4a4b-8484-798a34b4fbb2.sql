
-- ============= NOVOS ENUMS =============
CREATE TYPE public.discovery_status AS ENUM ('em_pesquisa', 'oficializado', 'descartado');
CREATE TYPE public.unidade_status AS ENUM ('lead', 'cliente', 'inativo');

-- ============= TABELA DISCOVERY =============
CREATE TABLE public.discovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  endereco text,
  cidade text,
  estado_id uuid REFERENCES public.estados(id),
  porte text,
  tipo_id uuid REFERENCES public.tipos_unidade(id),
  telefone text,
  email text,
  site text,
  informacoes_adicionais text,
  status public.discovery_status NOT NULL DEFAULT 'em_pesquisa',
  vendedor_id uuid NOT NULL,
  unidade_gerada_id uuid REFERENCES public.unidades_saude(id),
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_vendedor ON public.discovery(vendedor_id);
CREATE INDEX idx_discovery_status ON public.discovery(status);

ALTER TABLE public.discovery ENABLE ROW LEVEL SECURITY;

-- Vendedor vê os próprios; admin/gerente vê tudo
CREATE POLICY discovery_select ON public.discovery FOR SELECT TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
);

CREATE POLICY discovery_insert ON public.discovery FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_gerente(auth.uid())
  OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
);

CREATE POLICY discovery_update ON public.discovery FOR UPDATE TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
);

CREATE TRIGGER discovery_touch_updated BEFORE UPDATE ON public.discovery
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= UNIDADES_SAUDE: trocar ciclo -> status =============
-- Mapear registros existentes: discovery -> migrar para tabela discovery (criar registros)
-- Mas como é "reset agressivo", vamos converter discovery em lead e seguir.
ALTER TABLE public.unidades_saude ADD COLUMN status public.unidade_status NOT NULL DEFAULT 'lead';

UPDATE public.unidades_saude SET status =
  CASE ciclo::text
    WHEN 'discovery' THEN 'lead'::public.unidade_status
    WHEN 'lead' THEN 'lead'::public.unidade_status
    WHEN 'cliente' THEN 'cliente'::public.unidade_status
    ELSE 'lead'::public.unidade_status
  END;

ALTER TABLE public.unidades_saude DROP COLUMN ciclo;
DROP TYPE public.unidade_ciclo;

ALTER TABLE public.unidades_saude ADD COLUMN discovery_origem_id uuid REFERENCES public.discovery(id);

-- ============= NOVAS COLUNAS DE LIGAÇÃO COM DISCOVERY =============
ALTER TABLE public.contatos ADD COLUMN discovery_id uuid REFERENCES public.discovery(id);
ALTER TABLE public.parque_instalado ADD COLUMN discovery_id uuid REFERENCES public.discovery(id);
ALTER TABLE public.anotacoes ADD COLUMN discovery_id uuid REFERENCES public.discovery(id);

-- Tornar unidade_id nullable onde precisa coexistir com discovery_id
ALTER TABLE public.contatos ALTER COLUMN unidade_id DROP NOT NULL;
ALTER TABLE public.parque_instalado ALTER COLUMN unidade_id DROP NOT NULL;

-- Constraint: contato/parque pertence a uma unidade OU discovery (não ambos, não nenhum)
ALTER TABLE public.contatos ADD CONSTRAINT contatos_uma_origem
  CHECK ((unidade_id IS NOT NULL)::int + (discovery_id IS NOT NULL)::int = 1);
ALTER TABLE public.parque_instalado ADD CONSTRAINT parque_uma_origem
  CHECK ((unidade_id IS NOT NULL)::int + (discovery_id IS NOT NULL)::int = 1);

-- ============= MEDICO_DISCOVERY =============
CREATE TABLE public.medico_discovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id),
  discovery_id uuid NOT NULL REFERENCES public.discovery(id) ON DELETE CASCADE,
  papel_id uuid REFERENCES public.papeis_contato(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(medico_id, discovery_id)
);

ALTER TABLE public.medico_discovery ENABLE ROW LEVEL SECURITY;

CREATE POLICY medico_discovery_select ON public.medico_discovery FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.discovery d WHERE d.id = medico_discovery.discovery_id
    AND (public.is_admin_or_gerente(auth.uid())
         OR (public.has_role(auth.uid(), 'vendedor') AND d.vendedor_id = auth.uid())))
);

CREATE POLICY medico_discovery_write ON public.medico_discovery FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.discovery d WHERE d.id = medico_discovery.discovery_id
    AND (public.is_admin_or_gerente(auth.uid())
         OR (public.has_role(auth.uid(), 'vendedor') AND d.vendedor_id = auth.uid())))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.discovery d WHERE d.id = medico_discovery.discovery_id
    AND (public.is_admin_or_gerente(auth.uid())
         OR (public.has_role(auth.uid(), 'vendedor') AND d.vendedor_id = auth.uid())))
);
