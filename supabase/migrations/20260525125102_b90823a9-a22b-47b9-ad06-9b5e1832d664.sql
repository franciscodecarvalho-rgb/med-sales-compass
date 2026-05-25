CREATE OR REPLACE FUNCTION public.can_view_deal(_user_id uuid, _vendedor_id uuid, _estagio deal_stage)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin_or_gerente(_user_id)
    OR public.has_permission(_user_id, 'view_all_records')
    OR (public.has_role(_user_id, 'vendedor') AND _vendedor_id = _user_id)
    OR (public.has_role(_user_id, 'equipe_advance') AND _estagio IN ('fechamento', 'finalizado'))
    OR public.has_role(_user_id, 'pos_venda')
$$;