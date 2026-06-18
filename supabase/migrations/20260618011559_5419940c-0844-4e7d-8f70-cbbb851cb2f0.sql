CREATE TYPE public.discovery_origem AS ENUM ('manual','lab','planilha');

ALTER TABLE public.discovery
  ADD COLUMN origem public.discovery_origem NOT NULL DEFAULT 'manual',
  ADD COLUMN origem_etiqueta text;

CREATE INDEX idx_discovery_origem ON public.discovery(origem);
CREATE INDEX idx_discovery_origem_etiqueta ON public.discovery(origem_etiqueta) WHERE origem_etiqueta IS NOT NULL;