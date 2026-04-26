
-- 1) deal_equipamentos: tornar equipamento_id nullable e adicionar descricao livre + data_previsao no deal
ALTER TABLE public.deal_equipamentos
  ALTER COLUMN equipamento_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS descricao text;

-- 2) deals: FK estruturada para motivo_perda + data prevista de fechamento
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS motivo_perda_id uuid REFERENCES public.motivos_perda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_previsao_fechamento date;

-- 3) Índice para acelerar listagem de deals por unidade (aba Deals da Unidade)
CREATE INDEX IF NOT EXISTS idx_deals_unidade ON public.deals(unidade_id);
CREATE INDEX IF NOT EXISTS idx_deals_linha ON public.deals(linha_id);
CREATE INDEX IF NOT EXISTS idx_deal_equipamentos_deal ON public.deal_equipamentos(deal_id);
