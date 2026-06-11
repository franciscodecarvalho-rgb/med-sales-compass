-- ============================================================
-- Meta diária de agendamentos (call/visita) + tabela de metas
-- Contagem on-the-fly pela criação da tarefa; sem job.
-- ============================================================

-- Tipo de agendamento na tarefa (NULL = tarefa comum, não conta na meta)
CREATE TYPE public.tipo_agendamento AS ENUM ('call', 'visita');

ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS tipo_agendamento public.tipo_agendamento;

CREATE INDEX idx_tarefas_agendamento
  ON public.tarefas(criador_id, created_at)
  WHERE tipo_agendamento IS NOT NULL;

-- Tabela de metas por vendedor (histórico preservado via ativo=false)
CREATE TABLE public.metas_atividade (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meta_agendamentos_dia    integer NOT NULL CHECK (meta_agendamentos_dia > 0),
  ativo                    boolean NOT NULL DEFAULT true,
  created_by               uuid NOT NULL REFERENCES public.profiles(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_metas_atividade_touch
  BEFORE UPDATE ON public.metas_atividade
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- No máximo UMA meta ativa por vendedor
CREATE UNIQUE INDEX idx_metas_ativa_unica
  ON public.metas_atividade(user_id)
  WHERE ativo = true;

ALTER TABLE public.metas_atividade ENABLE ROW LEVEL SECURITY;

-- Vendedor lê a própria meta; admin/gerente lê todas
CREATE POLICY "metas_select" ON public.metas_atividade FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- Só admin/gerente cria e edita
CREATE POLICY "metas_insert" ON public.metas_atividade FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "metas_update" ON public.metas_atividade FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));
