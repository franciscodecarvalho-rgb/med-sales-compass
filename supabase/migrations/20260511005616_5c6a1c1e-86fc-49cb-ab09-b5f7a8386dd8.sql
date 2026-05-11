CREATE TABLE public.discovery_pastas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_pastas_read_all ON public.discovery_pastas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY discovery_pastas_admin_write ON public.discovery_pastas
  FOR ALL TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()))
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE TRIGGER trg_discovery_pastas_updated
  BEFORE UPDATE ON public.discovery_pastas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.discovery ADD COLUMN pasta_id uuid;
CREATE INDEX idx_discovery_pasta_id ON public.discovery(pasta_id);