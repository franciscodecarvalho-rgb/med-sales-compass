-- Permissions matrix per role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read_all"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "role_permissions_admin_write"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to check whether the user has a given permission via any of their roles.
-- Admin always returns true.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND rp.permission = _permission
        AND rp.allowed = true
    );
$$;

-- Seed defaults (idempotent)
INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  -- Gerente: tudo
  ('gerente','view_discovery',true),
  ('gerente','view_funil_vendas',true),
  ('gerente','view_funil_manut',true),
  ('gerente','view_posvenda',true),
  ('gerente','view_equipamentos',true),
  ('gerente','view_faturamento',true),
  ('gerente','view_medicos',true),
  ('gerente','view_unidades',true),
  ('gerente','view_painel',true),
  ('gerente','view_stakeholders',true),
  ('gerente','view_all_records',true),
  ('gerente','edit_all_records',true),
  ('gerente','export_data',true),
  ('gerente','delete_records',true),
  -- Vendedor
  ('vendedor','view_discovery',true),
  ('vendedor','view_funil_vendas',true),
  ('vendedor','view_funil_manut',false),
  ('vendedor','view_posvenda',false),
  ('vendedor','view_equipamentos',false),
  ('vendedor','view_faturamento',false),
  ('vendedor','view_medicos',true),
  ('vendedor','view_unidades',true),
  ('vendedor','view_painel',false),
  ('vendedor','view_stakeholders',false),
  ('vendedor','view_all_records',true),
  ('vendedor','edit_all_records',false),
  ('vendedor','export_data',false),
  ('vendedor','delete_records',false),
  -- Pos-venda
  ('pos_venda','view_discovery',false),
  ('pos_venda','view_funil_vendas',false),
  ('pos_venda','view_funil_manut',true),
  ('pos_venda','view_posvenda',true),
  ('pos_venda','view_equipamentos',true),
  ('pos_venda','view_faturamento',false),
  ('pos_venda','view_medicos',true),
  ('pos_venda','view_unidades',true),
  ('pos_venda','view_painel',false),
  ('pos_venda','view_stakeholders',false),
  ('pos_venda','view_all_records',true),
  ('pos_venda','edit_all_records',false),
  ('pos_venda','export_data',true),
  ('pos_venda','delete_records',false),
  -- Assistente de vendas
  ('assistente_vendas','view_discovery',false),
  ('assistente_vendas','view_funil_vendas',true),
  ('assistente_vendas','view_funil_manut',false),
  ('assistente_vendas','view_posvenda',false),
  ('assistente_vendas','view_equipamentos',false),
  ('assistente_vendas','view_faturamento',true),
  ('assistente_vendas','view_medicos',true),
  ('assistente_vendas','view_unidades',true),
  ('assistente_vendas','view_painel',false),
  ('assistente_vendas','view_stakeholders',false),
  ('assistente_vendas','view_all_records',false),
  ('assistente_vendas','edit_all_records',false),
  ('assistente_vendas','export_data',true),
  ('assistente_vendas','delete_records',false)
ON CONFLICT (role, permission) DO NOTHING;

-- Update can_view_deal to honor view_all_records permission
CREATE OR REPLACE FUNCTION public.can_view_deal(_user_id uuid, _vendedor_id uuid, _estagio deal_stage)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_admin_or_gerente(_user_id)
    OR public.has_permission(_user_id, 'view_all_records')
    OR (public.has_role(_user_id, 'vendedor') AND _vendedor_id = _user_id)
    OR (public.has_role(_user_id, 'assistente_vendas') AND _estagio IN ('fechamento', 'finalizado'))
    OR public.has_role(_user_id, 'pos_venda')
$function$;

-- Update discovery SELECT to allow view_all_records
DROP POLICY IF EXISTS discovery_select ON public.discovery;
CREATE POLICY discovery_select ON public.discovery
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR public.has_permission(auth.uid(), 'view_all_records')
    OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
  );