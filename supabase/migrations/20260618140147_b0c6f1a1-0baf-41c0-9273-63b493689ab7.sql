
-- Add identification code to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS codigo text UNIQUE;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS seq_num integer;

CREATE SEQUENCE IF NOT EXISTS public.chamados_seq_global;

CREATE OR REPLACE FUNCTION public.gerar_codigo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
  v_dt timestamptz;
  v_dia text;
  v_mes text;
  v_ano text;
  v_meses text[] := ARRAY['JA','FE','MR','AB','MI','JN','JL','AG','SE','OU','NO','DE'];
BEGIN
  IF NEW.codigo IS NOT NULL AND NEW.codigo <> '' THEN
    RETURN NEW;
  END IF;
  v_n := nextval('public.chamados_seq_global');
  v_dt := COALESCE(NEW.data_abertura, now());
  v_dia := lpad(EXTRACT(DAY FROM v_dt)::text, 2, '0');
  v_mes := v_meses[EXTRACT(MONTH FROM v_dt)::int];
  v_ano := lpad((EXTRACT(YEAR FROM v_dt)::int % 100)::text, 2, '0');
  NEW.seq_num := v_n;
  NEW.codigo := lpad((v_n % 100)::text, 2, '0') || v_dia || v_mes || v_ano;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_codigo_chamado ON public.chamados;
CREATE TRIGGER trg_gerar_codigo_chamado
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_codigo_chamado();

-- Backfill existing rows in order of data_abertura
DO $$
DECLARE
  r RECORD;
  v_n integer;
  v_dia text; v_mes text; v_ano text;
  v_meses text[] := ARRAY['JA','FE','MR','AB','MI','JN','JL','AG','SE','OU','NO','DE'];
BEGIN
  FOR r IN SELECT id, data_abertura, created_at FROM public.chamados WHERE codigo IS NULL ORDER BY COALESCE(data_abertura, created_at) ASC LOOP
    v_n := nextval('public.chamados_seq_global');
    v_dia := lpad(EXTRACT(DAY FROM COALESCE(r.data_abertura, r.created_at))::text, 2, '0');
    v_mes := v_meses[EXTRACT(MONTH FROM COALESCE(r.data_abertura, r.created_at))::int];
    v_ano := lpad((EXTRACT(YEAR FROM COALESCE(r.data_abertura, r.created_at))::int % 100)::text, 2, '0');
    UPDATE public.chamados
       SET seq_num = v_n,
           codigo = lpad((v_n % 100)::text, 2, '0') || v_dia || v_mes || v_ano
     WHERE id = r.id;
  END LOOP;
END $$;
