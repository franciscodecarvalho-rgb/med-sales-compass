
CREATE TABLE public.lab_eliminados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text,
  motivo text,
  eliminado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  eliminado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_eliminados_cnpj ON public.lab_eliminados(cnpj);

ALTER TABLE public.lab_eliminados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_eliminados_read_all" ON public.lab_eliminados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lab_eliminados_insert" ON public.lab_eliminados
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_gerente(auth.uid())
    OR has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "lab_eliminados_update_admin" ON public.lab_eliminados
  FOR UPDATE TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

CREATE TABLE public.lab_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limite_mensal integer NOT NULL DEFAULT 1300,
  chamadas_mes_atual integer NOT NULL DEFAULT 0,
  mes_referencia text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_config_read_all" ON public.lab_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lab_config_admin_write" ON public.lab_config
  FOR ALL TO authenticated
  USING (is_admin_or_gerente(auth.uid()))
  WITH CHECK (is_admin_or_gerente(auth.uid()));

INSERT INTO public.lab_config (limite_mensal, chamadas_mes_atual, mes_referencia)
VALUES (1300, 0, to_char(now(), 'YYYY-MM'));

CREATE OR REPLACE FUNCTION public.lab_increment_chamadas(_n integer)
RETURNS public.lab_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.lab_config;
  v_mes text := to_char(now(), 'YYYY-MM');
BEGIN
  SELECT * INTO v_row FROM public.lab_config ORDER BY updated_at DESC LIMIT 1;
  IF v_row IS NULL THEN
    INSERT INTO public.lab_config (limite_mensal, chamadas_mes_atual, mes_referencia)
    VALUES (1300, 0, v_mes) RETURNING * INTO v_row;
  END IF;
  IF v_row.mes_referencia <> v_mes THEN
    UPDATE public.lab_config
       SET chamadas_mes_atual = 0, mes_referencia = v_mes, updated_at = now()
     WHERE id = v_row.id RETURNING * INTO v_row;
  END IF;
  UPDATE public.lab_config
     SET chamadas_mes_atual = chamadas_mes_atual + GREATEST(_n, 0),
         updated_at = now()
   WHERE id = v_row.id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
