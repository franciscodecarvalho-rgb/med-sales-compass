-- ============================================================
-- FASE 3 — Migração de schema: FKs de config, parque, extras
-- ============================================================

-- 1) UNIDADES_SAUDE: novos campos
ALTER TABLE public.unidades_saude
  ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES public.tipos_unidade(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estado_id uuid REFERENCES public.estados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Vincula medico_principal_id como FK explícita (já existe a coluna)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unidades_saude_medico_principal_id_fkey'
      AND table_name = 'unidades_saude'
  ) THEN
    ALTER TABLE public.unidades_saude
      ADD CONSTRAINT unidades_saude_medico_principal_id_fkey
      FOREIGN KEY (medico_principal_id) REFERENCES public.medicos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_unidades_tipo_id ON public.unidades_saude(tipo_id);
CREATE INDEX IF NOT EXISTS idx_unidades_estado_id ON public.unidades_saude(estado_id);
CREATE INDEX IF NOT EXISTS idx_unidades_medico_principal ON public.unidades_saude(medico_principal_id);

-- 2) MEDICOS: especialidade_id + created_by
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS especialidade_id uuid REFERENCES public.especialidades_medicas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_medicos_especialidade_id ON public.medicos(especialidade_id);

-- 3) MEDICO_UNIDADES: papel_id (FK para papeis_contato)
ALTER TABLE public.medico_unidades
  ADD COLUMN IF NOT EXISTS papel_id uuid REFERENCES public.papeis_contato(id) ON DELETE SET NULL;

-- Garante unicidade do vínculo médico×unidade
CREATE UNIQUE INDEX IF NOT EXISTS uniq_medico_unidade ON public.medico_unidades(medico_id, unidade_id);

-- 4) CONTATOS: papel_id (FK)
ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS papel_id uuid REFERENCES public.papeis_contato(id) ON DELETE SET NULL;

-- 5) PARQUE_INSTALADO: simplificar (linha + descricao + quantidade)
-- Mantém colunas antigas (equipamento_id, valor, n/série, garantia) como opcionais.
ALTER TABLE public.parque_instalado
  ADD COLUMN IF NOT EXISTS linha_id uuid REFERENCES public.linhas_produto(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ALTER COLUMN equipamento_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parque_linha ON public.parque_instalado(linha_id);
CREATE INDEX IF NOT EXISTS idx_parque_unidade ON public.parque_instalado(unidade_id);

-- 6) Triggers de updated_at (caso ainda não existam para essas tabelas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unidades_updated_at') THEN
    CREATE TRIGGER trg_unidades_updated_at BEFORE UPDATE ON public.unidades_saude
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_medicos_updated_at') THEN
    CREATE TRIGGER trg_medicos_updated_at BEFORE UPDATE ON public.medicos
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contatos_updated_at') THEN
    CREATE TRIGGER trg_contatos_updated_at BEFORE UPDATE ON public.contatos
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_parque_updated_at') THEN
    CREATE TRIGGER trg_parque_updated_at BEFORE UPDATE ON public.parque_instalado
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

-- 7) Trigger para gerar tarefa quando anotação tem proximo_contato (já existe a função)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anotacoes_proximo_contato') THEN
    CREATE TRIGGER trg_anotacoes_proximo_contato AFTER INSERT ON public.anotacoes
      FOR EACH ROW EXECUTE FUNCTION public.handle_anotacao_proximo_contato();
  END IF;
END $$;

-- 8) Trigger de stage history para deals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deal_stage_change') THEN
    CREATE TRIGGER trg_deal_stage_change BEFORE UPDATE ON public.deals
      FOR EACH ROW EXECUTE FUNCTION public.handle_deal_stage_change();
  END IF;
END $$;