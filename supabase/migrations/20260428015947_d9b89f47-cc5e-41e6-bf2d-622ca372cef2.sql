-- Tabela deals_manutencao (mesmo modelo de deals de vendas)
CREATE TABLE public.deals_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  linha_id uuid NOT NULL,
  unidade_id uuid NOT NULL,
  vendedor_id uuid NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  estagio public.deal_stage NOT NULL DEFAULT 'prospeccao',
  resultado public.deal_resultado NOT NULL DEFAULT 'em_andamento',
  motivo_perda text,
  motivo_perda_id uuid,
  data_entrada_estagio timestamptz NOT NULL DEFAULT now(),
  data_previsao_fechamento date,
  data_fechamento timestamptz,
  garantia_origem_id uuid,
  observacoes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deals_manutencao ENABLE ROW LEVEL SECURITY;

-- RLS espelhada do funil de vendas (sem assistente_vendas, que só atua em vendas)
CREATE POLICY deals_manut_select_scoped ON public.deals_manutencao
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR (public.has_role(auth.uid(), 'vendedor'::app_role) AND vendedor_id = auth.uid())
    OR public.has_role(auth.uid(), 'pos_venda'::app_role)
  );

CREATE POLICY deals_manut_insert ON public.deals_manutencao
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_gerente(auth.uid())
    OR (public.has_role(auth.uid(), 'vendedor'::app_role) AND vendedor_id = auth.uid())
    OR public.has_role(auth.uid(), 'pos_venda'::app_role)
  );

CREATE POLICY deals_manut_update ON public.deals_manutencao
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR (public.has_role(auth.uid(), 'vendedor'::app_role) AND vendedor_id = auth.uid())
    OR public.has_role(auth.uid(), 'pos_venda'::app_role)
  );

-- Trigger para atualizar updated_at e data_entrada_estagio em mudança de estágio
CREATE OR REPLACE FUNCTION public.handle_deal_manut_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF (TG_OP = 'UPDATE') AND (OLD.estagio IS DISTINCT FROM NEW.estagio OR OLD.resultado IS DISTINCT FROM NEW.resultado) THEN
    NEW.data_entrada_estagio = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deal_manut_stage_change
BEFORE UPDATE ON public.deals_manutencao
FOR EACH ROW EXECUTE FUNCTION public.handle_deal_manut_stage_change();

CREATE INDEX idx_deals_manut_unidade ON public.deals_manutencao(unidade_id);
CREATE INDEX idx_deals_manut_vendedor ON public.deals_manutencao(vendedor_id);
CREATE INDEX idx_deals_manut_linha ON public.deals_manutencao(linha_id);
CREATE INDEX idx_deals_manut_garantia ON public.deals_manutencao(garantia_origem_id);

-- Tabela faturamento
CREATE TABLE public.faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  numero_nf text NOT NULL,
  data_faturamento date NOT NULL,
  valor_faturado numeric NOT NULL DEFAULT 0,
  registrado_por uuid,
  observacoes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faturamento ENABLE ROW LEVEL SECURITY;

-- Assistente de vendas e admin/gerente podem ler; vendedor pode ler os faturamentos do próprio deal
CREATE POLICY faturamento_select ON public.faturamento
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR public.has_role(auth.uid(), 'assistente_vendas'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = faturamento.deal_id
        AND public.has_role(auth.uid(), 'vendedor'::app_role)
        AND d.vendedor_id = auth.uid()
    )
  );

-- Apenas admin/gerente e assistente_vendas podem inserir/editar faturamento
CREATE POLICY faturamento_insert ON public.faturamento
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_gerente(auth.uid())
    OR public.has_role(auth.uid(), 'assistente_vendas'::app_role)
  );

CREATE POLICY faturamento_update ON public.faturamento
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gerente(auth.uid())
    OR public.has_role(auth.uid(), 'assistente_vendas'::app_role)
  );

CREATE TRIGGER trg_faturamento_touch
BEFORE UPDATE ON public.faturamento
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_faturamento_deal ON public.faturamento(deal_id);
CREATE INDEX idx_faturamento_data ON public.faturamento(data_faturamento);