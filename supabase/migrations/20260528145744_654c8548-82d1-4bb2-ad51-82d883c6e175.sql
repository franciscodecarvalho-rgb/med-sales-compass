DROP POLICY IF EXISTS tarefas_select_scoped ON public.tarefas;
CREATE POLICY tarefas_select_scoped ON public.tarefas FOR SELECT TO authenticated
USING (
  is_admin_or_gerente(auth.uid())
  OR has_permission(auth.uid(), 'view_all_records')
  OR responsavel_id = auth.uid()
  OR criador_id = auth.uid()
);