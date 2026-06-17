-- ============================================================
-- Playbook de Vendas: progresso de checklist por deal
-- Conteúdo dos playbooks vive em src/config/playbooks.ts (não no banco).
-- ============================================================

CREATE TABLE public.deal_playbook_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  playbook    text NOT NULL,   -- chave do playbook (ex: 'ultrassom', 'endoscopia', 'microtech', 'generico')
  etapa       text NOT NULL,   -- 'prospeccao' | 'qualificacao' | 'demonstracao' | 'negociacao' | 'decisao'
  item_id     text NOT NULL,   -- id do item no arquivo de config (ex: 'ult_pros_01')
  checked     boolean NOT NULL DEFAULT false,
  checked_by  uuid REFERENCES public.profiles(id),
  checked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, playbook, etapa, item_id)
);

CREATE INDEX idx_playbook_deal       ON public.deal_playbook_progress(deal_id);
CREATE INDEX idx_playbook_deal_etapa ON public.deal_playbook_progress(deal_id, etapa);

ALTER TABLE public.deal_playbook_progress ENABLE ROW LEVEL SECURITY;

-- Vê/edita quem é dono do deal (vendedor) ou admin/gerente.
-- Técnico e Equipe Advance não acessam (não passam no teste do deal próprio nem no is_admin_or_gerente).
CREATE POLICY "playbook_select" ON public.deal_playbook_progress FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_playbook_progress.deal_id
        AND d.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "playbook_insert" ON public.deal_playbook_progress FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_gerente(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_playbook_progress.deal_id
        AND d.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "playbook_update" ON public.deal_playbook_progress FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_playbook_progress.deal_id
        AND d.vendedor_id = auth.uid()
    )
  );
