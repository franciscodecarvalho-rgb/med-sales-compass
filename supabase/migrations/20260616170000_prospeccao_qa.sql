-- ============================================================
-- Playbook simplificado: Q&A de Prospecção por deal.
-- Substitui o checklist multi-etapa (deal_playbook_progress).
-- ============================================================

-- Remove a tabela do playbook antigo (checklist) — estava vazia/não usada.
DROP TABLE IF EXISTS public.deal_playbook_progress;

-- Uma linha por deal; respostas em JSONB (pergunta_id -> texto).
CREATE TABLE IF NOT EXISTS public.deal_prospeccao (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  respostas   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_prospeccao_deal ON public.deal_prospeccao(deal_id);

ALTER TABLE public.deal_prospeccao ENABLE ROW LEVEL SECURITY;

-- Dono do deal (vendedor) ou admin/gerente.
DROP POLICY IF EXISTS "prospeccao_select" ON public.deal_prospeccao;
CREATE POLICY "prospeccao_select" ON public.deal_prospeccao FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_prospeccao.deal_id AND d.vendedor_id = auth.uid()));

DROP POLICY IF EXISTS "prospeccao_insert" ON public.deal_prospeccao;
CREATE POLICY "prospeccao_insert" ON public.deal_prospeccao FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_prospeccao.deal_id AND d.vendedor_id = auth.uid()));

DROP POLICY IF EXISTS "prospeccao_update" ON public.deal_prospeccao;
CREATE POLICY "prospeccao_update" ON public.deal_prospeccao FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_prospeccao.deal_id AND d.vendedor_id = auth.uid()));
