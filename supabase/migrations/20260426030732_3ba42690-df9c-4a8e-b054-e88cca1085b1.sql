
-- Fix: search_path em touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix: política permissiva em medicos
DROP POLICY IF EXISTS "medicos_write_authenticated" ON public.medicos;
CREATE POLICY "medicos_insert_non_postvenda" ON public.medicos
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'pos_venda'));
