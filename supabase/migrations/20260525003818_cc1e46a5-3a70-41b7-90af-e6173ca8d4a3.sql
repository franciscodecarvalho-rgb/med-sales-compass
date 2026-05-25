
-- 1) Storage: posvenda-pdfs SELECT policy with role check
DROP POLICY IF EXISTS "posvenda_pdfs_read" ON storage.objects;
CREATE POLICY "posvenda_pdfs_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'posvenda-pdfs'
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR public.has_role(auth.uid(), 'pos_venda'::public.app_role)
  )
);

-- 2) saidas_advance INSERT scope (vendedor só pode inserir para deals próprios)
DROP POLICY IF EXISTS "saidas_advance_insert" ON public.saidas_advance;
CREATE POLICY "saidas_advance_insert" ON public.saidas_advance
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'equipe_advance'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'vendedor'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = saidas_advance.deal_id
        AND d.vendedor_id = auth.uid()
    )
  )
);

-- 3) analises_credito INSERT scope (vendedor só para deals próprios)
DROP POLICY IF EXISTS "analises_credito_insert" ON public.analises_credito;
CREATE POLICY "analises_credito_insert" ON public.analises_credito
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_gerente(auth.uid())
  OR (
    public.has_role(auth.uid(), 'vendedor'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = analises_credito.deal_id
        AND d.vendedor_id = auth.uid()
    )
  )
);

-- 4) Revogar EXECUTE de funções que não devem ser chamadas via API REST/RPC pelo usuário final.
-- Funções de trigger e helpers internos.
REVOKE EXECUTE ON FUNCTION public.handle_deal_stage_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_deal_manut_stage_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_anotacao_proximo_contato() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_nps_nota() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.marcar_tarefas_atrasadas() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.lab_increment_chamadas(integer) FROM anon, authenticated, public;
