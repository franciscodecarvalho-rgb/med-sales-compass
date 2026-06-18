-- ============================================================
-- Procedência imutável (registro histórico que não pode ser apagado):
-- - discovery: origem / origem_etiqueta / created_by (quem abriu o lead)
-- - unidades_saude: created_by (quem criou) / discovery_origem_id (procedência)
-- Bloqueio no nível do banco (trigger), independente de RLS/papel.
-- Permite NULL -> valor (backfill) mas nunca alterar um valor já gravado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.discovery_proteger_origem()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origem IS DISTINCT FROM OLD.origem THEN
    RAISE EXCEPTION 'A origem do lead é imutável (registro histórico).';
  END IF;
  IF NEW.origem_etiqueta IS DISTINCT FROM OLD.origem_etiqueta THEN
    RAISE EXCEPTION 'A etiqueta de origem do lead é imutável (registro histórico).';
  END IF;
  IF OLD.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'O autor de abertura do lead é imutável (registro histórico).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovery_proteger_origem ON public.discovery;
CREATE TRIGGER trg_discovery_proteger_origem
  BEFORE UPDATE ON public.discovery
  FOR EACH ROW EXECUTE FUNCTION public.discovery_proteger_origem();

CREATE OR REPLACE FUNCTION public.unidade_proteger_origem()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'O autor de criação da unidade é imutável (registro histórico).';
  END IF;
  IF OLD.discovery_origem_id IS NOT NULL AND NEW.discovery_origem_id IS DISTINCT FROM OLD.discovery_origem_id THEN
    RAISE EXCEPTION 'A procedência da unidade é imutável (registro histórico).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unidade_proteger_origem ON public.unidades_saude;
CREATE TRIGGER trg_unidade_proteger_origem
  BEFORE UPDATE ON public.unidades_saude
  FOR EACH ROW EXECUTE FUNCTION public.unidade_proteger_origem();
