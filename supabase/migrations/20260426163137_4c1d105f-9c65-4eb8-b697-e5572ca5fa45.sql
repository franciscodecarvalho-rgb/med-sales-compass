-- ===== ENUMS =====
CREATE TYPE public.chamado_prioridade AS ENUM ('critica', 'alta', 'media', 'baixa');
CREATE TYPE public.chamado_status AS ENUM ('aberto', 'em_atendimento', 'resolvido', 'fechado');
CREATE TYPE public.instalacao_tipo AS ENUM ('instalacao', 'aplicacao');
CREATE TYPE public.instalacao_status AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE public.contrato_status AS ENUM ('ativo', 'vencido', 'a_vencer');
CREATE TYPE public.garantia_status AS ENUM ('ativa', 'vencida', 'a_vencer');

-- ===== CHAMADOS =====
CREATE TABLE public.chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL,
  descricao_equipamento TEXT NOT NULL,
  descricao_problema TEXT NOT NULL,
  prioridade public.chamado_prioridade NOT NULL DEFAULT 'media',
  status public.chamado_status NOT NULL DEFAULT 'aberto',
  tecnico_id UUID,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resolucao TIMESTAMPTZ,
  observacoes TEXT,
  created_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_unidade ON public.chamados(unidade_id);
CREATE INDEX idx_chamados_status ON public.chamados(status);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY chamados_read_all ON public.chamados FOR SELECT TO authenticated USING (true);
CREATE POLICY chamados_insert ON public.chamados FOR INSERT TO authenticated WITH CHECK (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE POLICY chamados_update ON public.chamados FOR UPDATE TO authenticated USING (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE TRIGGER chamados_touch BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== INSTALACOES =====
CREATE TABLE public.instalacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID,
  unidade_id UUID NOT NULL,
  tecnico_id UUID,
  tipo public.instalacao_tipo NOT NULL DEFAULT 'instalacao',
  status public.instalacao_status NOT NULL DEFAULT 'pendente',
  data_prevista DATE,
  data_conclusao DATE,
  pdf_url TEXT,
  observacoes TEXT,
  created_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inst_unidade ON public.instalacoes(unidade_id);
CREATE INDEX idx_inst_deal ON public.instalacoes(deal_id);
ALTER TABLE public.instalacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY inst_read_all ON public.instalacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY inst_insert ON public.instalacoes FOR INSERT TO authenticated WITH CHECK (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE POLICY inst_update ON public.instalacoes FOR UPDATE TO authenticated USING (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE TRIGGER inst_touch BEFORE UPDATE ON public.instalacoes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== CONTRATOS MANUTENCAO =====
CREATE TABLE public.contratos_manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL,
  linha_id UUID,
  tipo_contrato TEXT NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  cobertura TEXT,
  status public.contrato_status NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contratos_unidade ON public.contratos_manutencao(unidade_id);
ALTER TABLE public.contratos_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY contratos_read_all ON public.contratos_manutencao FOR SELECT TO authenticated USING (true);
CREATE POLICY contratos_insert ON public.contratos_manutencao FOR INSERT TO authenticated WITH CHECK (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE POLICY contratos_update ON public.contratos_manutencao FOR UPDATE TO authenticated USING (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE TRIGGER contratos_touch BEFORE UPDATE ON public.contratos_manutencao FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== GARANTIAS =====
CREATE TABLE public.garantias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL,
  descricao_equipamento TEXT NOT NULL,
  linha_id UUID,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status public.garantia_status NOT NULL DEFAULT 'ativa',
  deal_origem_id UUID,
  observacoes TEXT,
  created_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_garantias_unidade ON public.garantias(unidade_id);
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;
CREATE POLICY garantias_read_all ON public.garantias FOR SELECT TO authenticated USING (true);
CREATE POLICY garantias_insert ON public.garantias FOR INSERT TO authenticated WITH CHECK (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE POLICY garantias_update ON public.garantias FOR UPDATE TO authenticated USING (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE TRIGGER garantias_touch BEFORE UPDATE ON public.garantias FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== NPS =====
CREATE TABLE public.nps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL,
  nota INTEGER NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  comentarios TEXT,
  created_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nps_unidade ON public.nps(unidade_id);
-- Validation trigger (avoid CHECK on nota for flexibility)
CREATE OR REPLACE FUNCTION public.validate_nps_nota()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nota < 0 OR NEW.nota > 10 THEN
    RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER nps_validate BEFORE INSERT OR UPDATE ON public.nps FOR EACH ROW EXECUTE FUNCTION public.validate_nps_nota();
ALTER TABLE public.nps ENABLE ROW LEVEL SECURITY;
CREATE POLICY nps_read_all ON public.nps FOR SELECT TO authenticated USING (true);
CREATE POLICY nps_insert ON public.nps FOR INSERT TO authenticated WITH CHECK (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE POLICY nps_update ON public.nps FOR UPDATE TO authenticated USING (
  is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
);
CREATE TRIGGER nps_touch BEFORE UPDATE ON public.nps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== STORAGE BUCKET (PDFs de instalação) =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('posvenda-pdfs', 'posvenda-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "posvenda_pdfs_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'posvenda-pdfs');

CREATE POLICY "posvenda_pdfs_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'posvenda-pdfs' AND (
    is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
  )
);

CREATE POLICY "posvenda_pdfs_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'posvenda-pdfs' AND (
    is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
  )
);

CREATE POLICY "posvenda_pdfs_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'posvenda-pdfs' AND (
    is_admin_or_gerente(auth.uid()) OR has_role(auth.uid(), 'pos_venda'::app_role)
  )
);