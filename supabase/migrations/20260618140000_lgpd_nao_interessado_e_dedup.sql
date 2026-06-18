-- ============================================================
-- LGPD + integridade de cadastro
-- 1) Status "nao_interessado" (reativável) em leads e clientes
-- 2) Bloqueio de cadastro duplicado por CNPJ e telefone
--    (normalizado, cross-table, SECURITY DEFINER p/ valer entre
--     registros de vendedores diferentes apesar do RLS)
-- ============================================================

-- 1) Novo status terminal/reversível
ALTER TYPE public.discovery_status ADD VALUE IF NOT EXISTS 'nao_interessado';
ALTER TYPE public.unidade_status   ADD VALUE IF NOT EXISTS 'nao_interessado';

-- 2) Função única de dedupe (serve discovery e unidades_saude — ambas têm
--    nome, cnpj, telefone, id, archived_at). Compara só dígitos; ignora
--    vazios, o próprio registro e cadastros arquivados.
CREATE OR REPLACE FUNCTION public.impedir_cadastro_duplicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cnpj text := nullif(regexp_replace(coalesce(NEW.cnpj, ''), '\D', '', 'g'), '');
  v_fone text := nullif(regexp_replace(coalesce(NEW.telefone, ''), '\D', '', 'g'), '');
  v_nome text;
BEGIN
  IF v_cnpj IS NOT NULL THEN
    SELECT nome INTO v_nome FROM public.unidades_saude
      WHERE id <> NEW.id AND archived_at IS NULL
        AND nullif(regexp_replace(coalesce(cnpj, ''), '\D', '', 'g'), '') = v_cnpj
      LIMIT 1;
    IF v_nome IS NULL THEN
      SELECT nome INTO v_nome FROM public.discovery
        WHERE id <> NEW.id AND archived_at IS NULL
          AND nullif(regexp_replace(coalesce(cnpj, ''), '\D', '', 'g'), '') = v_cnpj
        LIMIT 1;
    END IF;
    IF v_nome IS NOT NULL THEN
      RAISE EXCEPTION 'CNPJ já cadastrado em "%". Cadastro duplicado bloqueado.', v_nome
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF v_fone IS NOT NULL THEN
    SELECT nome INTO v_nome FROM public.unidades_saude
      WHERE id <> NEW.id AND archived_at IS NULL
        AND nullif(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), '') = v_fone
      LIMIT 1;
    IF v_nome IS NULL THEN
      SELECT nome INTO v_nome FROM public.discovery
        WHERE id <> NEW.id AND archived_at IS NULL
          AND nullif(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), '') = v_fone
        LIMIT 1;
    END IF;
    IF v_nome IS NOT NULL THEN
      RAISE EXCEPTION 'Telefone já cadastrado em "%". Cadastro duplicado bloqueado.', v_nome
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unidade_impedir_dup ON public.unidades_saude;
CREATE TRIGGER trg_unidade_impedir_dup
  BEFORE INSERT OR UPDATE OF cnpj, telefone ON public.unidades_saude
  FOR EACH ROW EXECUTE FUNCTION public.impedir_cadastro_duplicado();

DROP TRIGGER IF EXISTS trg_discovery_impedir_dup ON public.discovery;
CREATE TRIGGER trg_discovery_impedir_dup
  BEFORE INSERT OR UPDATE OF cnpj, telefone ON public.discovery
  FOR EACH ROW EXECUTE FUNCTION public.impedir_cadastro_duplicado();
