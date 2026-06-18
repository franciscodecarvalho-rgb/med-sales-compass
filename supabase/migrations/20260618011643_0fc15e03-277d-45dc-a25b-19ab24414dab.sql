ALTER TABLE public.metas_atividade
  ADD COLUMN IF NOT EXISTS meta_ligacoes_dia integer;

CREATE TABLE IF NOT EXISTS public.ligacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ligacoes TO authenticated;
GRANT ALL ON public.ligacoes TO service_role;

ALTER TABLE public.ligacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedor vê próprias ligações ou admin/gerente"
  ON public.ligacoes FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Vendedor insere própria ligação"
  ON public.ligacoes FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Vendedor deleta própria ligação ou admin/gerente"
  ON public.ligacoes FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ligacoes_vendedor_created ON public.ligacoes(vendedor_id, created_at DESC);