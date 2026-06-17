-- ============================================================
-- Funil de atividade: ligações (discagem) → agendamentos
-- - ligacoes: registro leve de cada ligação feita pelo vendedor
-- - metas_atividade.meta_ligacoes_dia: alvo diário de ligações
-- Contagem on-the-fly por created_at; sem job.
-- ============================================================

-- Alvo diário de ligações (nullable: metas antigas seguem só com agendamentos)
ALTER TABLE public.metas_atividade
  ADD COLUMN IF NOT EXISTS meta_ligacoes_dia integer
  CHECK (meta_ligacoes_dia IS NULL OR meta_ligacoes_dia > 0);

-- Registro de ligações (1 linha = 1 discagem)
CREATE TABLE public.ligacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medico_id    uuid REFERENCES public.medicos(id) ON DELETE SET NULL,
  unidade_id   uuid REFERENCES public.unidades_saude(id) ON DELETE SET NULL,
  deal_id      uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  observacao   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ligacoes_vendedor_data ON public.ligacoes(vendedor_id, created_at);

ALTER TABLE public.ligacoes ENABLE ROW LEVEL SECURITY;

-- Vendedor lê as próprias; admin/gerente lê todas
CREATE POLICY "ligacoes_select" ON public.ligacoes FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- Vendedor registra apenas as próprias ligações
CREATE POLICY "ligacoes_insert" ON public.ligacoes FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

-- Vendedor apaga as próprias; admin/gerente apaga qualquer
CREATE POLICY "ligacoes_delete" ON public.ligacoes FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
