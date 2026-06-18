
ALTER TYPE public.discovery_status ADD VALUE IF NOT EXISTS 'nao_interessado';
ALTER TYPE public.unidade_status ADD VALUE IF NOT EXISTS 'nao_interessado';

ALTER TABLE public.saidas_advance
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_saude(id),
  ADD COLUMN IF NOT EXISTS linha_produto_id uuid REFERENCES public.linhas_produto(id),
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

ALTER TABLE public.saidas_advance ALTER COLUMN deal_id DROP NOT NULL;
