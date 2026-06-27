-- ============================================================
-- Segurança: tranca o bucket de anexos do Vendas Advance
-- (PDFs de nota fiscal, inspeção de saída, fotos, comprovantes).
--
-- Antes: bucket potencialmente PÚBLICO — qualquer pessoa com o link
-- abria o arquivo sem login (dados fiscais/comerciais do cliente expostos).
-- Agora: bucket PRIVADO. Só usuários logados acessam, via URL assinada
-- temporária gerada pelo app. Espelha o padrão já usado em 'posvenda-pdfs'.
-- ============================================================

-- 1) Garante o bucket como PRIVADO (cria se não existir; se existir, força public=false)
INSERT INTO storage.buckets (id, name, public)
VALUES ('advance-anexos', 'advance-anexos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2) Políticas de acesso (idempotente: remove versões antigas e recria)
DROP POLICY IF EXISTS "advance_anexos_read"   ON storage.objects;
DROP POLICY IF EXISTS "advance_anexos_insert" ON storage.objects;
DROP POLICY IF EXISTS "advance_anexos_update" ON storage.objects;
DROP POLICY IF EXISTS "advance_anexos_delete" ON storage.objects;

-- Leitura: qualquer usuário LOGADO (anônimo/sem login não acessa mais)
CREATE POLICY "advance_anexos_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'advance-anexos');

-- Upload/edição/remoção: só quem trabalha o checklist Advance (admin, gerente, equipe Advance)
CREATE POLICY "advance_anexos_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'advance-anexos' AND (
    public.is_admin_or_gerente(auth.uid()) OR public.has_role(auth.uid(), 'equipe_advance'::app_role)
  )
);

CREATE POLICY "advance_anexos_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'advance-anexos' AND (
    public.is_admin_or_gerente(auth.uid()) OR public.has_role(auth.uid(), 'equipe_advance'::app_role)
  )
);

CREATE POLICY "advance_anexos_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'advance-anexos' AND (
    public.is_admin_or_gerente(auth.uid()) OR public.has_role(auth.uid(), 'equipe_advance'::app_role)
  )
);
