-- =============================================================
-- FASE 7.B — VENDAS ADVANCE
-- =============================================================

-- 1. Renomear enum value assistente_vendas → equipe_advance
ALTER TYPE public.app_role RENAME VALUE 'assistente_vendas' TO 'equipe_advance';

-- 2. Novos enums
CREATE TYPE public.forma_pagamento_tipo AS ENUM (
  'a_vista_cartao', 'financiado_interno', 'financiamento_externo'
);

CREATE TYPE public.status_analise_credito AS ENUM (
  'aprovado', 'reprovado', 'pendente', 'limite_insuficiente', 'erro_api'
);

CREATE TYPE public.tipo_saida_advance AS ENUM (
  'venda', 'demonstracao', 'comodato', 'locacao', 'troca'
);

CREATE TYPE public.status_saida_advance AS ENUM (
  'em_andamento', 'finalizado'
);

CREATE TYPE public.bloco_advance AS ENUM (
  'cadastro', 'margem_financeiro', 'faturamento', 'logistica'
);

-- 3. Novos campos na tabela deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS forma_pagamento public.forma_pagamento_tipo,
  ADD COLUMN IF NOT EXISTS enviado_para_advance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_envio_advance timestamptz,
  ADD COLUMN IF NOT EXISTS analise_credito_id uuid,
  ADD COLUMN IF NOT EXISTS instituicao_financeira_externa text;

-- 4. Tabela analises_credito
CREATE TABLE public.analises_credito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_analise text NOT NULL,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  consultado_por uuid NOT NULL REFERENCES auth.users(id),
  consultado_em timestamptz NOT NULL DEFAULT now(),
  status public.status_analise_credito NOT NULL,
  limite_aprovado numeric,
  parcelas_maximas int,
  prazo_maximo_dias int,
  validade_analise date,
  observacoes text,
  cliente_consultado text,
  payload_completo jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analises_credito ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_analises_credito_deal_id ON public.analises_credito(deal_id);
CREATE INDEX idx_analises_credito_consultado_por ON public.analises_credito(consultado_por);

-- 5. FK de deals para analises_credito (adicionada após criar a tabela)
ALTER TABLE public.deals
  ADD CONSTRAINT deals_analise_credito_fkey
  FOREIGN KEY (analise_credito_id) REFERENCES public.analises_credito(id) ON DELETE SET NULL;

-- 6. Tabela saidas_advance
CREATE TABLE public.saidas_advance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  tipo_saida public.tipo_saida_advance,
  id_olist text,
  proposta_olist text,
  pedido_olist text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  status public.status_saida_advance NOT NULL DEFAULT 'em_andamento',
  finalizado_em timestamptz,
  finalizado_por uuid REFERENCES auth.users(id),
  observacoes_gerais text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saidas_advance ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saidas_advance_deal_id ON public.saidas_advance(deal_id);
CREATE INDEX idx_saidas_advance_status ON public.saidas_advance(status);

-- 7. Tabela saidas_advance_itens
CREATE TABLE public.saidas_advance_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid NOT NULL REFERENCES public.saidas_advance(id) ON DELETE CASCADE,
  bloco public.bloco_advance NOT NULL,
  chave_item text NOT NULL,
  ordem int NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  observacao text,
  concluido_por uuid REFERENCES auth.users(id),
  concluido_em timestamptz,
  dados_extras jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saidas_advance_itens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saidas_advance_itens_saida_id ON public.saidas_advance_itens(saida_id);
CREATE TRIGGER trg_saidas_advance_itens_updated_at
  BEFORE UPDATE ON public.saidas_advance_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8. Tabela saidas_advance_anexos
CREATE TABLE public.saidas_advance_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid NOT NULL REFERENCES public.saidas_advance(id) ON DELETE CASCADE,
  item_chave text,
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  tamanho_bytes int NOT NULL DEFAULT 0,
  tipo_mime text NOT NULL DEFAULT 'application/pdf',
  anexado_por uuid NOT NULL REFERENCES auth.users(id),
  anexado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saidas_advance_anexos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saidas_advance_anexos_saida_id ON public.saidas_advance_anexos(saida_id);

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- analises_credito: admin/gerente/equipe_advance leem tudo; vendedores só veem do próprio deal
CREATE POLICY analises_credito_select ON public.analises_credito
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    consultado_por = auth.uid()
  );

CREATE POLICY analises_credito_insert ON public.analises_credito
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    public.has_role(auth.uid(), 'vendedor')
  );

-- saidas_advance: todos (exceto vendedor) podem SELECT; só admin/equipe_advance podem INSERT/UPDATE
CREATE POLICY saidas_advance_select ON public.saidas_advance
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    public.has_role(auth.uid(), 'pos_venda')
  );

CREATE POLICY saidas_advance_insert ON public.saidas_advance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    public.has_role(auth.uid(), 'vendedor')
  );

CREATE POLICY saidas_advance_update ON public.saidas_advance
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance')
  );

-- saidas_advance_itens: mesmas regras de saidas_advance
CREATE POLICY saidas_advance_itens_select ON public.saidas_advance_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saidas_advance sa
      WHERE sa.id = saida_id AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'gerente') OR
        public.has_role(auth.uid(), 'equipe_advance') OR
        public.has_role(auth.uid(), 'pos_venda')
      )
    )
  );

CREATE POLICY saidas_advance_itens_insert ON public.saidas_advance_itens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    public.has_role(auth.uid(), 'vendedor')
  );

CREATE POLICY saidas_advance_itens_update ON public.saidas_advance_itens
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance')
  );

-- saidas_advance_anexos: equipe_advance e admin inserem; todos que veem saidas veem anexos
CREATE POLICY saidas_advance_anexos_select ON public.saidas_advance_anexos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saidas_advance sa
      WHERE sa.id = saida_id AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'gerente') OR
        public.has_role(auth.uid(), 'equipe_advance') OR
        public.has_role(auth.uid(), 'pos_venda')
      )
    )
  );

CREATE POLICY saidas_advance_anexos_insert ON public.saidas_advance_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance')
  );

-- =============================================================
-- PERMISSÃO view_vendas_advance na tabela role_permissions
-- =============================================================
INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('admin',         'view_vendas_advance', true),
  ('gerente',       'view_vendas_advance', true),
  ('equipe_advance','view_vendas_advance', true),
  ('pos_venda',     'view_vendas_advance', true)
ON CONFLICT (role, permission) DO UPDATE SET allowed = EXCLUDED.allowed;

-- =============================================================
-- MIGRAÇÃO DADOS: faturamento → saidas_advance
-- Deals já faturados: criar saida finalizada com item nota_fiscal marcado
-- =============================================================
DO $$
DECLARE
  rec RECORD;
  nova_saida_id uuid;
BEGIN
  FOR rec IN
    SELECT
      d.id          AS deal_id,
      d.vendedor_id AS criado_por,
      d.data_fechamento AS criado_em,
      f.numero_nf,
      f.data_faturamento,
      f.valor_faturado,
      f.registrado_por
    FROM public.faturamento f
    JOIN public.deals d ON d.id = f.deal_id
    WHERE f.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.saidas_advance sa WHERE sa.deal_id = d.id
      )
  LOOP
    -- Cria a saida finalizada
    INSERT INTO public.saidas_advance (
      deal_id, tipo_saida, criado_em, criado_por, status,
      finalizado_em, finalizado_por
    ) VALUES (
      rec.deal_id,
      'venda',
      COALESCE(rec.criado_em, now()),
      COALESCE(rec.criado_por, (SELECT id FROM auth.users LIMIT 1)),
      'finalizado',
      COALESCE(rec.data_faturamento::timestamptz, now()),
      rec.registrado_por
    )
    RETURNING id INTO nova_saida_id;

    -- Marca deals como enviado
    UPDATE public.deals SET
      enviado_para_advance = true,
      data_envio_advance = COALESCE(rec.criado_em, now())
    WHERE id = rec.deal_id;

    -- Cria os 11 itens; marca nota_fiscal como concluído
    INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido, dados_extras) VALUES
      (nova_saida_id, 'cadastro',          'cadastro_completo_cliente', 1, false, NULL),
      (nova_saida_id, 'cadastro',          'checagem_regulatoria',      2, false, NULL),
      (nova_saida_id, 'margem_financeiro', 'validacao_margem',          3, false, NULL),
      (nova_saida_id, 'margem_financeiro', 'financiamento',             4, false, NULL),
      (nova_saida_id, 'margem_financeiro', 'validacao_pagamento',       5, false, NULL),
      (nova_saida_id, 'faturamento',       'validacao_estoque_lotes',   6, false, NULL),
      (nova_saida_id, 'faturamento',       'inspecao_saida',            7, false, NULL),
      (nova_saida_id, 'faturamento',       'upload_fotos',              8, false, NULL),
      (nova_saida_id, 'faturamento',       'nota_fiscal',               9, true,
        jsonb_build_object(
          'numero_nf', rec.numero_nf,
          'data', rec.data_faturamento,
          'valor', rec.valor_faturado
        )
      ),
      (nova_saida_id, 'logistica',         'transportadora',            10, false, NULL),
      (nova_saida_id, 'logistica',         'abrir_contas_pagar',        11, false, NULL);
  END LOOP;
END;
$$;

-- =============================================================
-- SEED: análises de crédito e saídas de exemplo
-- Só insere se não existir nenhum dado ainda
-- =============================================================
DO $$
DECLARE
  deal1 uuid; deal2 uuid; deal3 uuid; deal4 uuid; deal5 uuid;
  deal6 uuid; deal7 uuid; deal8 uuid;
  analise1 uuid; analise2 uuid; analise3 uuid; analise4 uuid; analise5 uuid;
  saida_id uuid;
  admin_user uuid;
  linha_id uuid;
  unidade_id uuid;
BEGIN
  -- Só executa se não houver saidas_advance ainda
  IF EXISTS (SELECT 1 FROM public.saidas_advance LIMIT 1) THEN RETURN; END IF;

  SELECT id INTO admin_user FROM public.profiles WHERE id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  ) LIMIT 1;
  IF admin_user IS NULL THEN RETURN; END IF;

  SELECT id INTO linha_id FROM public.linhas_produto LIMIT 1;
  IF linha_id IS NULL THEN RETURN; END IF;

  SELECT id INTO unidade_id FROM public.unidades_saude LIMIT 1;
  IF unidade_id IS NULL THEN RETURN; END IF;

  -- Criar 8 deals de exemplo para as saídas
  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Hospital Regional - Echo Portátil',    unidade_id, linha_id, admin_user, 85000,  'finalizado', 'ganho', now() - interval '5 days',  true, now() - interval '5 days',  'a_vista_cartao')
  RETURNING id INTO deal1;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Clínica Saúde Plus - 2 Monitores',     unidade_id, linha_id, admin_user, 42000,  'finalizado', 'ganho', now() - interval '12 days', true, now() - interval '12 days', 'financiado_interno')
  RETURNING id INTO deal2;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('UBS Central - Desfibrilador',           unidade_id, linha_id, admin_user, 28500,  'finalizado', 'ganho', now() - interval '3 days',  true, now() - interval '3 days',  'financiamento_externo')
  RETURNING id INTO deal3;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Lab Diagnósticos - Centrifuga',          unidade_id, linha_id, admin_user, 15000,  'finalizado', 'ganho', now() - interval '20 days', true, now() - interval '20 days', 'a_vista_cartao')
  RETURNING id INTO deal4;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Hospital Geral - Cama Hospitalar',       unidade_id, linha_id, admin_user, 120000, 'finalizado', 'ganho', now() - interval '18 days', true, now() - interval '18 days', 'financiado_interno')
  RETURNING id INTO deal5;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Clínica Vita - Demo Ultrassom',          unidade_id, linha_id, admin_user, 0,      'finalizado', 'ganho', now() - interval '17 days', true, now() - interval '17 days', 'a_vista_cartao')
  RETURNING id INTO deal6;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('UPA Norte - Comodato Ventilador',        unidade_id, linha_id, admin_user, 0,      'finalizado', 'ganho', now() - interval '16 days', true, now() - interval '16 days', 'a_vista_cartao')
  RETURNING id INTO deal7;

  INSERT INTO public.deals (titulo, unidade_id, linha_id, vendedor_id, valor_total, estagio, resultado, data_fechamento, enviado_para_advance, data_envio_advance, forma_pagamento)
  VALUES ('Hospital São Lucas - Locação ECG',       unidade_id, linha_id, admin_user, 36000,  'finalizado', 'ganho', now() - interval '15 days', true, now() - interval '15 days', 'financiamento_externo')
  RETURNING id INTO deal8;

  -- 5 análises de crédito (vinculadas aos deals 2 e 5 que são financiado_interno)
  INSERT INTO public.analises_credito (numero_analise, deal_id, consultado_por, status, limite_aprovado, parcelas_maximas, prazo_maximo_dias, validade_analise, observacoes, cliente_consultado, payload_completo)
  VALUES ('AC-2024-001', deal2, admin_user, 'aprovado', 50000, 36, 1080, now()::date + 90, 'Análise aprovada.', 'CLÍNICA SAÚDE PLUS', '{}')
  RETURNING id INTO analise1;

  INSERT INTO public.analises_credito (numero_analise, deal_id, consultado_por, status, limite_aprovado, parcelas_maximas, prazo_maximo_dias, validade_analise, observacoes, cliente_consultado, payload_completo)
  VALUES ('AC-2024-002', deal5, admin_user, 'aprovado', 150000, 48, 1440, now()::date + 60, 'Análise aprovada com limite ampliado.', 'HOSPITAL GERAL', '{}')
  RETURNING id INTO analise2;

  INSERT INTO public.analises_credito (numero_analise, deal_id, consultado_por, status, limite_aprovado, parcelas_maximas, prazo_maximo_dias, validade_analise, observacoes, cliente_consultado, payload_completo)
  VALUES ('AC-2024-003', deal1, admin_user, 'aprovado', 100000, 24, 720, now()::date + 45, 'Aprovado conforme histórico.', 'HOSPITAL REGIONAL', '{}')
  RETURNING id INTO analise3;

  INSERT INTO public.analises_credito (numero_analise, deal_id, consultado_por, status, NULL, NULL, NULL, NULL, 'Restrição no SERASA.', 'CLIENTE REPROVADO', '{}')
  VALUES ('AC-2024-004', deal3, admin_user, 'reprovado', NULL, NULL, NULL, NULL, 'Restrição no SERASA.', 'CLIENTE REPROVADO', '{}')
  RETURNING id INTO analise4;

  INSERT INTO public.analises_credito (numero_analise, deal_id, consultado_por, status, NULL, NULL, NULL, NULL, 'Aguardando documentação.', 'CLIENTE PENDENTE', '{}')
  VALUES ('AC-2024-005', deal4, admin_user, 'pendente', NULL, NULL, NULL, NULL, 'Aguardando documentação.', 'CLIENTE PENDENTE', '{}')
  RETURNING id INTO analise5;

  -- Saída 1: deal1 — em andamento, só Cadastro preenchido (aguardando >15 dias)
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, id_olist, criado_em, criado_por, status)
  VALUES (deal1, 'venda', 'OL-10001', now() - interval '20 days', admin_user, 'em_andamento')
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, false),
    (saida_id, 'margem_financeiro', 'financiamento',             4, false),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, false),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, false),
    (saida_id, 'faturamento',       'inspecao_saida',            7, false),
    (saida_id, 'faturamento',       'upload_fotos',              8, false),
    (saida_id, 'faturamento',       'nota_fiscal',               9, false),
    (saida_id, 'logistica',         'transportadora',            10, false),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, false);

  -- Saída 2: deal2 — em andamento, no bloco Faturamento
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, id_olist, proposta_olist, criado_em, criado_por, status)
  VALUES (deal2, 'venda', 'OL-10002', 'PROP-2024-002', now() - interval '12 days', admin_user, 'em_andamento')
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido, dados_extras) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true,  NULL),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true,  NULL),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, true,  NULL),
    (saida_id, 'margem_financeiro', 'financiamento',             4, true,  jsonb_build_object('forma_pagamento','financiado_interno','analise_credito_id',analise1)),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, true,  NULL),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, false, NULL),
    (saida_id, 'faturamento',       'inspecao_saida',            7, false, NULL),
    (saida_id, 'faturamento',       'upload_fotos',              8, false, NULL),
    (saida_id, 'faturamento',       'nota_fiscal',               9, false, NULL),
    (saida_id, 'logistica',         'transportadora',            10, false, NULL),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, false, NULL);

  -- Saída 3: deal3 — em andamento, quase finalizada (aguardando >15 dias)
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, id_olist, proposta_olist, pedido_olist, criado_em, criado_por, status)
  VALUES (deal3, 'venda', 'OL-10003', 'PROP-2024-003', 'PED-2024-003', now() - interval '16 days', admin_user, 'em_andamento')
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido, dados_extras) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true,  NULL),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true,  NULL),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, true,  NULL),
    (saida_id, 'margem_financeiro', 'financiamento',             4, true,  jsonb_build_object('forma_pagamento','financiamento_externo')),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, true,  NULL),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, true,  NULL),
    (saida_id, 'faturamento',       'inspecao_saida',            7, true,  NULL),
    (saida_id, 'faturamento',       'upload_fotos',              8, true,  NULL),
    (saida_id, 'faturamento',       'nota_fiscal',               9, true,  jsonb_build_object('numero_nf','NF-001234','data',now()::date,'valor',28500)),
    (saida_id, 'logistica',         'transportadora',            10, false, NULL),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, false, NULL);

  -- Saída 4: deal4 — finalizada
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, id_olist, proposta_olist, pedido_olist, criado_em, criado_por, status, finalizado_em, finalizado_por)
  VALUES (deal4, 'venda', 'OL-10004', 'PROP-2024-004', 'PED-2024-004', now() - interval '20 days', admin_user, 'finalizado', now() - interval '5 days', admin_user)
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, true),
    (saida_id, 'margem_financeiro', 'financiamento',             4, true),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, true),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, true),
    (saida_id, 'faturamento',       'inspecao_saida',            7, true),
    (saida_id, 'faturamento',       'upload_fotos',              8, true),
    (saida_id, 'faturamento',       'nota_fiscal',               9, true),
    (saida_id, 'logistica',         'transportadora',            10, true),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, true);

  -- Saída 5: deal5 — finalizada
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, id_olist, proposta_olist, pedido_olist, criado_em, criado_por, status, finalizado_em, finalizado_por)
  VALUES (deal5, 'venda', 'OL-10005', 'PROP-2024-005', 'PED-2024-005', now() - interval '18 days', admin_user, 'finalizado', now() - interval '3 days', admin_user)
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido, dados_extras) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true,  NULL),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true,  NULL),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, true,  NULL),
    (saida_id, 'margem_financeiro', 'financiamento',             4, true,  jsonb_build_object('forma_pagamento','financiado_interno','analise_credito_id',analise2)),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, true,  NULL),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, true,  NULL),
    (saida_id, 'faturamento',       'inspecao_saida',            7, true,  NULL),
    (saida_id, 'faturamento',       'upload_fotos',              8, true,  NULL),
    (saida_id, 'faturamento',       'nota_fiscal',               9, true,  NULL),
    (saida_id, 'logistica',         'transportadora',            10, true,  NULL),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, true,  NULL);

  -- Saída 6: deal6 — finalizada
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, criado_em, criado_por, status, finalizado_em, finalizado_por)
  VALUES (deal6, 'demonstracao', now() - interval '17 days', admin_user, 'finalizado', now() - interval '10 days', admin_user)
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, true),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, true),
    (saida_id, 'margem_financeiro', 'financiamento',             4, true),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, true),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, true),
    (saida_id, 'faturamento',       'inspecao_saida',            7, true),
    (saida_id, 'faturamento',       'upload_fotos',              8, true),
    (saida_id, 'faturamento',       'nota_fiscal',               9, false),
    (saida_id, 'logistica',         'transportadora',            10, true),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, true);

  -- Saída 7: deal7 — em andamento, aguardando >15 dias
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, criado_em, criado_por, status)
  VALUES (deal7, 'comodato', now() - interval '16 days', admin_user, 'em_andamento')
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, false),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, false),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, false),
    (saida_id, 'margem_financeiro', 'financiamento',             4, false),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, false),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, false),
    (saida_id, 'faturamento',       'inspecao_saida',            7, false),
    (saida_id, 'faturamento',       'upload_fotos',              8, false),
    (saida_id, 'faturamento',       'nota_fiscal',               9, false),
    (saida_id, 'logistica',         'transportadora',            10, false),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, false);

  -- Saída 8: deal8 — em andamento
  INSERT INTO public.saidas_advance (deal_id, tipo_saida, criado_em, criado_por, status)
  VALUES (deal8, 'locacao', now() - interval '3 days', admin_user, 'em_andamento')
  RETURNING id INTO saida_id;
  INSERT INTO public.saidas_advance_itens (saida_id, bloco, chave_item, ordem, concluido, dados_extras) VALUES
    (saida_id, 'cadastro',          'cadastro_completo_cliente', 1, true,  NULL),
    (saida_id, 'cadastro',          'checagem_regulatoria',      2, false, NULL),
    (saida_id, 'margem_financeiro', 'validacao_margem',          3, false, NULL),
    (saida_id, 'margem_financeiro', 'financiamento',             4, false, jsonb_build_object('forma_pagamento','financiamento_externo','instituicao','Banco Bradesco')),
    (saida_id, 'margem_financeiro', 'validacao_pagamento',       5, false, NULL),
    (saida_id, 'faturamento',       'validacao_estoque_lotes',   6, false, NULL),
    (saida_id, 'faturamento',       'inspecao_saida',            7, false, NULL),
    (saida_id, 'faturamento',       'upload_fotos',              8, false, NULL),
    (saida_id, 'faturamento',       'nota_fiscal',               9, false, NULL),
    (saida_id, 'logistica',         'transportadora',            10, false, NULL),
    (saida_id, 'logistica',         'abrir_contas_pagar',        11, false, NULL);

END;
$$;
