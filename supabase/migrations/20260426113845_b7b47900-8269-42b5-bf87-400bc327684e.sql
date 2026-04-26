
-- =========================================
-- FASE 2: Tabelas de configuração / dados base
-- =========================================

-- Helper para timestamps (já existe)
-- public.touch_updated_at()

-- ---------- TIPOS DE UNIDADE ----------
CREATE TABLE public.tipos_unidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_unidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_unidade_read_all" ON public.tipos_unidade FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_unidade_admin_write" ON public.tipos_unidade FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_tipos_unidade_updated BEFORE UPDATE ON public.tipos_unidade FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- ESPECIALIDADES MÉDICAS ----------
CREATE TABLE public.especialidades_medicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "especialidades_read_all" ON public.especialidades_medicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "especialidades_admin_write" ON public.especialidades_medicas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_especialidades_updated BEFORE UPDATE ON public.especialidades_medicas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- PAPÉIS DE CONTATO ----------
CREATE TABLE public.papeis_contato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.papeis_contato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "papeis_read_all" ON public.papeis_contato FOR SELECT TO authenticated USING (true);
CREATE POLICY "papeis_admin_write" ON public.papeis_contato FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_papeis_updated BEFORE UPDATE ON public.papeis_contato FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- MARCAS DE EQUIPAMENTO ----------
CREATE TABLE public.marcas_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marcas_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marcas_read_all" ON public.marcas_equipamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "marcas_admin_write" ON public.marcas_equipamento FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_marcas_updated BEFORE UPDATE ON public.marcas_equipamento FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- TIPOS DE EQUIPAMENTO ----------
CREATE TABLE public.tipos_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_eq_read_all" ON public.tipos_equipamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_eq_admin_write" ON public.tipos_equipamento FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_tipos_eq_updated BEFORE UPDATE ON public.tipos_equipamento FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- MOTIVOS DE PERDA ----------
CREATE TABLE public.motivos_perda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivos_read_all" ON public.motivos_perda FOR SELECT TO authenticated USING (true);
CREATE POLICY "motivos_admin_write" ON public.motivos_perda FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_motivos_updated BEFORE UPDATE ON public.motivos_perda FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- ESTADOS ----------
CREATE TABLE public.estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estados_read_all" ON public.estados FOR SELECT TO authenticated USING (true);
CREATE POLICY "estados_admin_write" ON public.estados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_estados_updated BEFORE UPDATE ON public.estados FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- CONFIG CONTADOR (global) ----------
CREATE TABLE public.config_contador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limite_verde_dias integer NOT NULL DEFAULT 30,
  limite_amarelo_dias integer NOT NULL DEFAULT 60,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_config_contador_default ON public.config_contador (is_default) WHERE is_default = true;
ALTER TABLE public.config_contador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_contador_read_all" ON public.config_contador FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_contador_admin_write" ON public.config_contador FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_config_contador_updated BEFORE UPDATE ON public.config_contador FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- USER_LINHAS (atribuição de linhas por usuário) ----------
CREATE TABLE public.user_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  linha_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, linha_id)
);
ALTER TABLE public.user_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_linhas_self_or_admin_select" ON public.user_linhas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "user_linhas_admin_write" ON public.user_linhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- SEED DATA
-- =========================================

-- Tipos de unidade
INSERT INTO public.tipos_unidade (nome) VALUES
  ('Hospital'), ('Clínica'), ('UBS'), ('Laboratório'), ('Pronto Atendimento')
ON CONFLICT (nome) DO NOTHING;

-- Especialidades
INSERT INTO public.especialidades_medicas (nome) VALUES
  ('Gastroenterologia'), ('Radiologia'), ('Urologia'), ('Ginecologia'),
  ('Cirurgia Geral'), ('Cardiologia'), ('Pneumologia'), ('Otorrinolaringologia')
ON CONFLICT (nome) DO NOTHING;

-- Papéis de contato
INSERT INTO public.papeis_contato (nome) VALUES
  ('Tomador de Decisão'), ('Usuário'), ('Diretor Clínico'), ('Compras'),
  ('Engenharia Clínica'), ('Administrador'), ('Financeiro')
ON CONFLICT (nome) DO NOTHING;

-- Marcas
INSERT INTO public.marcas_equipamento (nome) VALUES
  ('Microtech'), ('R. Wolf'), ('Olympus'), ('Fujifilm'),
  ('GE Healthcare'), ('Philips'), ('Samsung'), ('Mindray')
ON CONFLICT (nome) DO NOTHING;

-- Tipos de equipamento
INSERT INTO public.tipos_equipamento (nome) VALUES
  ('Ultrassom'), ('Torre de Endoscopia'), ('Videoendoscópio'),
  ('Transdutor'), ('Colonoscópio'), ('Broncoscópio'), ('Lavadora de Endoscópios')
ON CONFLICT (nome) DO NOTHING;

-- Motivos de perda
INSERT INTO public.motivos_perda (nome) VALUES
  ('Perdeu para concorrente'), ('Sem budget'), ('Projeto cancelado'),
  ('Timing inadequado'), ('Preço'), ('Outro')
ON CONFLICT (nome) DO NOTHING;

-- Estados brasileiros
INSERT INTO public.estados (sigla, nome) VALUES
  ('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),('BA','Bahia'),
  ('CE','Ceará'),('DF','Distrito Federal'),('ES','Espírito Santo'),('GO','Goiás'),
  ('MA','Maranhão'),('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),('MG','Minas Gerais'),
  ('PA','Pará'),('PB','Paraíba'),('PR','Paraná'),('PE','Pernambuco'),('PI','Piauí'),
  ('RJ','Rio de Janeiro'),('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),
  ('RO','Rondônia'),('RR','Roraima'),('SC','Santa Catarina'),('SP','São Paulo'),
  ('SE','Sergipe'),('TO','Tocantins')
ON CONFLICT (sigla) DO NOTHING;

-- Config contador padrão (verde até 30, amarelo até 60, vermelho acima)
INSERT INTO public.config_contador (limite_verde_dias, limite_amarelo_dias, is_default)
SELECT 30, 60, true
WHERE NOT EXISTS (SELECT 1 FROM public.config_contador WHERE is_default = true);

-- Linhas demo (se não houver nenhuma)
INSERT INTO public.linhas_produto (nome, descricao, cor, limite_verde_dias, limite_amarelo_dias)
SELECT * FROM (VALUES
  ('Microtech', 'Linha Microtech (ultrassom)', '#0ea5e9', 30, 60),
  ('R. Wolf', 'Linha R. Wolf (endoscopia rígida)', '#10b981', 30, 60),
  ('UltraVision', 'Linha UltraVision', '#8b5cf6', 30, 60)
) AS v(nome, descricao, cor, limite_verde_dias, limite_amarelo_dias)
WHERE NOT EXISTS (SELECT 1 FROM public.linhas_produto WHERE archived_at IS NULL);
