
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor', 'pos_venda', 'assistente_vendas');
CREATE TYPE public.unidade_tipo AS ENUM ('hospital', 'clinica', 'ubs', 'laboratorio', 'outro');
CREATE TYPE public.unidade_ciclo AS ENUM ('discovery', 'lead', 'cliente');
CREATE TYPE public.deal_stage AS ENUM ('prospeccao', 'qualificacao', 'demonstracao', 'negociacao', 'decisao', 'fechamento', 'finalizado');
CREATE TYPE public.deal_resultado AS ENUM ('em_andamento', 'ganho', 'perdido');
CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'media', 'alta');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar papel sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função utilitária: pega o "maior" papel para hierarquia (apenas conveniência)
CREATE OR REPLACE FUNCTION public.is_admin_or_gerente(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gerente')
  )
$$;

-- Trigger: cria profile + papel padrão (vendedor) ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email
  );
  -- Papel padrão: vendedor (admin altera depois)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger genérico de updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS profiles: cada usuário vê o próprio; admin/gerente vê todos
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS user_roles: somente admin gerencia; usuário lê os próprios
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- LINHAS DE PRODUTO
-- =========================
CREATE TABLE public.linhas_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#0ea5e9',
  -- Limites de tempo no estágio (em dias) para colorir o contador
  limite_verde_dias INTEGER NOT NULL DEFAULT 7,
  limite_amarelo_dias INTEGER NOT NULL DEFAULT 14,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.linhas_produto ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_linhas_touch BEFORE UPDATE ON public.linhas_produto
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "linhas_read_all" ON public.linhas_produto
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "linhas_admin_write" ON public.linhas_produto
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- EQUIPAMENTOS
-- =========================
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id UUID NOT NULL REFERENCES public.linhas_produto(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  modelo TEXT,
  descricao TEXT,
  valor_referencia NUMERIC(14,2),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_equipamentos_touch BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_equipamentos_linha ON public.equipamentos(linha_id);

CREATE POLICY "equipamentos_read_all" ON public.equipamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipamentos_admin_gerente_write" ON public.equipamentos
  FOR ALL TO authenticated USING (public.is_admin_or_gerente(auth.uid()))
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

-- =========================
-- MÉDICOS
-- =========================
CREATE TABLE public.medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  crm TEXT,
  especialidade TEXT,
  email TEXT,
  telefone TEXT,
  observacoes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_medicos_touch BEFORE UPDATE ON public.medicos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "medicos_read_all" ON public.medicos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicos_write_authenticated" ON public.medicos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "medicos_update_non_postvenda" ON public.medicos
  FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(), 'pos_venda'));

-- =========================
-- UNIDADES DE SAÚDE
-- =========================
CREATE TABLE public.unidades_saude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.unidade_tipo NOT NULL DEFAULT 'hospital',
  ciclo public.unidade_ciclo NOT NULL DEFAULT 'discovery',
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  medico_principal_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  observacoes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unidades_saude ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_unidades_touch BEFORE UPDATE ON public.unidades_saude
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_unidades_estado ON public.unidades_saude(estado);
CREATE INDEX idx_unidades_ciclo ON public.unidades_saude(ciclo);

CREATE POLICY "unidades_read_all" ON public.unidades_saude
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "unidades_write_non_postvenda" ON public.unidades_saude
  FOR INSERT TO authenticated WITH CHECK (NOT public.has_role(auth.uid(), 'pos_venda'));
CREATE POLICY "unidades_update_non_postvenda" ON public.unidades_saude
  FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(), 'pos_venda'));

-- =========================
-- MEDICO_UNIDADES (vínculo N:N)
-- =========================
CREATE TABLE public.medico_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades_saude(id) ON DELETE CASCADE,
  papel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medico_id, unidade_id)
);
ALTER TABLE public.medico_unidades ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_medico_unidades_med ON public.medico_unidades(medico_id);
CREATE INDEX idx_medico_unidades_uni ON public.medico_unidades(unidade_id);

CREATE POLICY "medico_unidades_read_all" ON public.medico_unidades
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "medico_unidades_write" ON public.medico_unidades
  FOR ALL TO authenticated USING (NOT public.has_role(auth.uid(), 'pos_venda'))
  WITH CHECK (NOT public.has_role(auth.uid(), 'pos_venda'));

-- =========================
-- CONTATOS (não-médicos)
-- =========================
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades_saude(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  setor TEXT,
  email TEXT,
  telefone TEXT,
  observacoes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_contatos_touch BEFORE UPDATE ON public.contatos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_contatos_unidade ON public.contatos(unidade_id);

CREATE POLICY "contatos_read_all" ON public.contatos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "contatos_write" ON public.contatos
  FOR ALL TO authenticated USING (NOT public.has_role(auth.uid(), 'pos_venda'))
  WITH CHECK (NOT public.has_role(auth.uid(), 'pos_venda'));

-- =========================
-- PARQUE INSTALADO
-- =========================
CREATE TABLE public.parque_instalado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades_saude(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE RESTRICT,
  numero_serie TEXT,
  data_instalacao DATE,
  valor NUMERIC(14,2),
  garantia_ate DATE,
  observacoes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parque_instalado ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_parque_touch BEFORE UPDATE ON public.parque_instalado
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_parque_unidade ON public.parque_instalado(unidade_id);
CREATE INDEX idx_parque_equip ON public.parque_instalado(equipamento_id);

CREATE POLICY "parque_read_all" ON public.parque_instalado
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "parque_write" ON public.parque_instalado
  FOR ALL TO authenticated USING (NOT public.has_role(auth.uid(), 'assistente_vendas'))
  WITH CHECK (NOT public.has_role(auth.uid(), 'assistente_vendas'));

-- =========================
-- DEALS (Funil de Vendas)
-- =========================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES public.unidades_saude(id) ON DELETE RESTRICT,
  linha_id UUID NOT NULL REFERENCES public.linhas_produto(id) ON DELETE RESTRICT,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  estagio public.deal_stage NOT NULL DEFAULT 'prospeccao',
  resultado public.deal_resultado NOT NULL DEFAULT 'em_andamento',
  motivo_perda TEXT,
  data_entrada_estagio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  observacoes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deals_vendedor ON public.deals(vendedor_id);
CREATE INDEX idx_deals_linha ON public.deals(linha_id);
CREATE INDEX idx_deals_unidade ON public.deals(unidade_id);
CREATE INDEX idx_deals_estagio ON public.deals(estagio);

-- Trigger: registra histórico ao mudar de estágio + atualiza data_entrada_estagio
CREATE TABLE public.deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  estagio_anterior public.deal_stage,
  estagio_novo public.deal_stage NOT NULL,
  resultado_anterior public.deal_resultado,
  resultado_novo public.deal_resultado NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deal_history_deal ON public.deal_stage_history(deal_id);

CREATE OR REPLACE FUNCTION public.handle_deal_stage_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF (TG_OP = 'UPDATE') AND (OLD.estagio IS DISTINCT FROM NEW.estagio OR OLD.resultado IS DISTINCT FROM NEW.resultado) THEN
    NEW.data_entrada_estagio = now();
    INSERT INTO public.deal_stage_history (deal_id, estagio_anterior, estagio_novo, resultado_anterior, resultado_novo, changed_by)
    VALUES (NEW.id, OLD.estagio, NEW.estagio, OLD.resultado, NEW.resultado, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deal_stage_change
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_stage_change();

-- Função helper: vendedor pode ver este deal?
CREATE OR REPLACE FUNCTION public.can_view_deal(_user_id UUID, _vendedor_id UUID, _estagio public.deal_stage)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_or_gerente(_user_id)
    OR (public.has_role(_user_id, 'vendedor') AND _vendedor_id = _user_id)
    OR (public.has_role(_user_id, 'assistente_vendas') AND _estagio IN ('fechamento', 'finalizado'))
    OR public.has_role(_user_id, 'pos_venda')
$$;

-- RLS deals
CREATE POLICY "deals_select_scoped" ON public.deals
  FOR SELECT TO authenticated USING (public.can_view_deal(auth.uid(), vendedor_id, estagio));
CREATE POLICY "deals_insert_sales" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_or_gerente(auth.uid())
    OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
  );
CREATE POLICY "deals_update_sales" ON public.deals
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_gerente(auth.uid())
    OR (public.has_role(auth.uid(), 'vendedor') AND vendedor_id = auth.uid())
    OR (public.has_role(auth.uid(), 'assistente_vendas') AND estagio IN ('fechamento', 'finalizado'))
  );

CREATE POLICY "deal_history_select" ON public.deal_stage_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.can_view_deal(auth.uid(), d.vendedor_id, d.estagio))
  );

-- =========================
-- DEAL EQUIPAMENTOS
-- =========================
CREATE TABLE public.deal_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deal_eq_deal ON public.deal_equipamentos(deal_id);

CREATE POLICY "deal_eq_select" ON public.deal_equipamentos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.can_view_deal(auth.uid(), d.vendedor_id, d.estagio))
  );
CREATE POLICY "deal_eq_write" ON public.deal_equipamentos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
      public.is_admin_or_gerente(auth.uid())
      OR (public.has_role(auth.uid(), 'vendedor') AND d.vendedor_id = auth.uid())
    ))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
      public.is_admin_or_gerente(auth.uid())
      OR (public.has_role(auth.uid(), 'vendedor') AND d.vendedor_id = auth.uid())
    ))
  );

-- =========================
-- ANOTAÇÕES
-- =========================
CREATE TABLE public.anotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  texto TEXT NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades_saude(id) ON DELETE CASCADE,
  proximo_contato TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (deal_id IS NOT NULL OR medico_id IS NOT NULL OR unidade_id IS NOT NULL)
);
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_anotacoes_touch BEFORE UPDATE ON public.anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_anotacoes_deal ON public.anotacoes(deal_id);
CREATE INDEX idx_anotacoes_medico ON public.anotacoes(medico_id);
CREATE INDEX idx_anotacoes_unidade ON public.anotacoes(unidade_id);

CREATE POLICY "anotacoes_read_all" ON public.anotacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "anotacoes_insert_own" ON public.anotacoes
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());
CREATE POLICY "anotacoes_update_own_or_admin" ON public.anotacoes
  FOR UPDATE TO authenticated USING (autor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- =========================
-- TAREFAS
-- =========================
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  criador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'media',
  data_vencimento TIMESTAMPTZ,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades_saude(id) ON DELETE CASCADE,
  anotacao_id UUID REFERENCES public.anotacoes(id) ON DELETE SET NULL,
  concluida_em TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tarefas_touch BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_tarefas_responsavel ON public.tarefas(responsavel_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_tarefas_vencimento ON public.tarefas(data_vencimento);

CREATE POLICY "tarefas_select_scoped" ON public.tarefas
  FOR SELECT TO authenticated USING (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR criador_id = auth.uid()
  );
CREATE POLICY "tarefas_insert" ON public.tarefas
  FOR INSERT TO authenticated WITH CHECK (criador_id = auth.uid());
CREATE POLICY "tarefas_update" ON public.tarefas
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR criador_id = auth.uid()
  );

-- Trigger: ao criar/atualizar anotação com proximo_contato, gera tarefa de relacionamento
CREATE OR REPLACE FUNCTION public.handle_anotacao_proximo_contato()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo TEXT;
BEGIN
  IF NEW.proximo_contato IS NOT NULL THEN
    v_titulo := 'Próximo contato (anotação)';
    INSERT INTO public.tarefas (titulo, descricao, responsavel_id, criador_id, data_vencimento, deal_id, medico_id, unidade_id, anotacao_id, prioridade)
    VALUES (
      v_titulo,
      LEFT(NEW.texto, 280),
      NEW.autor_id,
      NEW.autor_id,
      NEW.proximo_contato,
      NEW.deal_id,
      NEW.medico_id,
      NEW.unidade_id,
      NEW.id,
      CASE WHEN NEW.deal_id IS NOT NULL THEN 'alta'::public.tarefa_prioridade ELSE 'media'::public.tarefa_prioridade END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_anotacao_proximo_contato
  AFTER INSERT ON public.anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_anotacao_proximo_contato();

-- =========================
-- SEED: linhas de produto exemplo (admin pode editar)
-- =========================
INSERT INTO public.linhas_produto (nome, descricao, cor) VALUES
  ('Microtech', 'Linha de equipamentos de ultrassom', '#0ea5e9'),
  ('R. Wolf', 'Linha de endoscopia', '#10b981'),
  ('Outros', 'Demais linhas', '#8b5cf6');
