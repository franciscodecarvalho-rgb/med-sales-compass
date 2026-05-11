ALTER TABLE public.anotacoes DROP CONSTRAINT anotacoes_check;
ALTER TABLE public.anotacoes ADD CONSTRAINT anotacoes_check CHECK (
  deal_id IS NOT NULL
  OR medico_id IS NOT NULL
  OR unidade_id IS NOT NULL
  OR discovery_id IS NOT NULL
);