-- 1. Deals: medico_id opcional + unidade_id opcional + check
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS medico_id uuid;
ALTER TABLE public.deals ALTER COLUMN unidade_id DROP NOT NULL;
ALTER TABLE public.deals ADD CONSTRAINT deals_unidade_or_medico_required
  CHECK (unidade_id IS NOT NULL OR medico_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_deals_medico_id ON public.deals(medico_id);

-- 2. Stakeholders
CREATE TABLE public.stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text,
  organizacao text,
  tipo text,
  telefone text,
  email text,
  observacoes text,
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY stakeholders_select_admin_gerente ON public.stakeholders
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY stakeholders_insert_admin_gerente ON public.stakeholders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY stakeholders_update_admin_gerente ON public.stakeholders
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE TRIGGER trg_stakeholders_updated_at
  BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Tarefas: link a stakeholder
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS stakeholder_id uuid;
CREATE INDEX IF NOT EXISTS idx_tarefas_stakeholder_id ON public.tarefas(stakeholder_id);