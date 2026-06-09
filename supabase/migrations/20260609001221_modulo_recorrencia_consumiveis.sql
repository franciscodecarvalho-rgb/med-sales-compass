-- ============================================================
-- Módulo: Recorrência de Consumíveis
-- Fluxo: mini-funil de prospecção + radar de recência por (unidade, linha)
-- ============================================================

-- Enums
CREATE TYPE public.consumivel_estagio   AS ENUM ('interesse', 'convertido');
CREATE TYPE public.consumivel_status    AS ENUM ('ativo', 'atencao', 'em_risco', 'inativo', 'pausado');
CREATE TYPE public.origem_equipamento   AS ENUM ('proprio', 'concorrente', 'desconhecido');

-- ── Alterar tabelas existentes ──────────────────────────────

ALTER TABLE public.linhas_produto
  ADD COLUMN IF NOT EXISTS ciclo_consumivel_padrao_dias integer;

-- ── Tabela: consumiveis_prospeccao ──────────────────────────
-- Mini-funil para unidades que ainda não compram consumível conosco

CREATE TABLE public.consumiveis_prospeccao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id          uuid NOT NULL REFERENCES public.unidades_saude(id)   ON DELETE RESTRICT,
  linha_id            uuid NOT NULL REFERENCES public.linhas_produto(id)   ON DELETE RESTRICT,
  vendedor_id         uuid NOT NULL REFERENCES public.profiles(id)          ON DELETE RESTRICT,
  estagio             public.consumivel_estagio NOT NULL DEFAULT 'interesse',
  origem_equipamento  public.origem_equipamento NOT NULL DEFAULT 'desconhecido',
  notas               text,
  archived_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, linha_id)
);

CREATE TRIGGER trg_consumiveis_prosp_touch
  BEFORE UPDATE ON public.consumiveis_prospeccao
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_consumiveis_prosp_unidade  ON public.consumiveis_prospeccao(unidade_id);
CREATE INDEX idx_consumiveis_prosp_vendedor ON public.consumiveis_prospeccao(vendedor_id);
CREATE INDEX idx_consumiveis_prosp_estagio  ON public.consumiveis_prospeccao(estagio);

-- ── Tabela: consumiveis_recorrencia ────────────────────────
-- Um registro por (unidade, linha) — radar de recompra

CREATE TABLE public.consumiveis_recorrencia (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id             uuid NOT NULL REFERENCES public.unidades_saude(id) ON DELETE RESTRICT,
  linha_id               uuid NOT NULL REFERENCES public.linhas_produto(id) ON DELETE RESTRICT,
  vendedor_id            uuid NOT NULL REFERENCES public.profiles(id)        ON DELETE RESTRICT,
  origem_equipamento     public.origem_equipamento NOT NULL DEFAULT 'desconhecido',
  data_ultima_compra     date,
  ciclo_estimado_dias    integer,
  ciclo_editado_dias     integer,
  status                 public.consumivel_status NOT NULL DEFAULT 'ativo',
  pausa_motivo           text,
  pausa_ate              date,
  archived_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, linha_id)
);

CREATE TRIGGER trg_consumiveis_rec_touch
  BEFORE UPDATE ON public.consumiveis_recorrencia
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_consumiveis_rec_unidade  ON public.consumiveis_recorrencia(unidade_id);
CREATE INDEX idx_consumiveis_rec_vendedor ON public.consumiveis_recorrencia(vendedor_id);
CREATE INDEX idx_consumiveis_rec_status   ON public.consumiveis_recorrencia(status);

-- ── Alterar tarefas (após consumiveis_recorrencia existir) ──

ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS consumivel_id uuid
    REFERENCES public.consumiveis_recorrencia(id) ON DELETE SET NULL;

CREATE INDEX idx_tarefas_consumivel ON public.tarefas(consumivel_id)
  WHERE consumivel_id IS NOT NULL;

-- ── Tabela: compras_consumiveis ─────────────────────────────
-- Registro leve de "cliente comprou" — sem produto/qty/valor (fica no ERP)

CREATE TABLE public.compras_consumiveis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumivel_id   uuid NOT NULL REFERENCES public.consumiveis_recorrencia(id) ON DELETE RESTRICT,
  data            date NOT NULL DEFAULT CURRENT_DATE,
  observacao      text,
  registrado_por  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_consumivel ON public.compras_consumiveis(consumivel_id, data DESC);

-- ── Tabela: historico_status_consumiveis ───────────────────
-- Auditoria de toda mudança de status (gerada por trigger e job)

CREATE TABLE public.historico_status_consumiveis (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumivel_id             uuid NOT NULL REFERENCES public.consumiveis_recorrencia(id) ON DELETE RESTRICT,
  status_anterior           public.consumivel_status NOT NULL,
  status_novo               public.consumivel_status NOT NULL,
  ciclo_efetivo_dias        integer,
  dias_desde_ultima_compra  integer,
  changed_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historico_consumivel ON public.historico_status_consumiveis(consumivel_id, changed_at DESC);

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE public.consumiveis_prospeccao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumiveis_recorrencia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_consumiveis       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status_consumiveis ENABLE ROW LEVEL SECURITY;

-- prospeccao
CREATE POLICY "prosp_select" ON public.consumiveis_prospeccao FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()) OR vendedor_id = auth.uid());
CREATE POLICY "prosp_insert" ON public.consumiveis_prospeccao FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "prosp_update" ON public.consumiveis_prospeccao FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- recorrencia
CREATE POLICY "rec_select" ON public.consumiveis_recorrencia FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()) OR vendedor_id = auth.uid());
CREATE POLICY "rec_insert" ON public.consumiveis_recorrencia FOR INSERT TO authenticated
  WITH CHECK (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "rec_update" ON public.consumiveis_recorrencia FOR UPDATE TO authenticated
  USING (vendedor_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- compras (qualquer autenticado pode ler; inserir = próprio)
CREATE POLICY "compras_select" ON public.compras_consumiveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "compras_insert" ON public.compras_consumiveis FOR INSERT TO authenticated
  WITH CHECK (registrado_por = auth.uid());

-- historico (read-only para todos autenticados)
CREATE POLICY "historico_select" ON public.historico_status_consumiveis FOR SELECT TO authenticated USING (true);

-- ── Funções ────────────────────────────────────────────────

-- Calcula status com base nos thresholds acordados:
-- ativo ≤1.1× / atencao 1.1–1.8× / em_risco 1.8–3× / inativo >3×
CREATE OR REPLACE FUNCTION public.calcular_status_consumivel(
  p_data_ultima_compra date,
  p_ciclo_efetivo      integer
) RETURNS public.consumivel_status LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  dias  integer;
  ratio numeric;
BEGIN
  IF p_data_ultima_compra IS NULL OR p_ciclo_efetivo IS NULL OR p_ciclo_efetivo = 0 THEN
    RETURN 'ativo';
  END IF;
  dias  := CURRENT_DATE - p_data_ultima_compra;
  ratio := dias::numeric / p_ciclo_efetivo::numeric;
  IF    ratio <= 1.1 THEN RETURN 'ativo';
  ELSIF ratio <= 1.8 THEN RETURN 'atencao';
  ELSIF ratio <= 3.0 THEN RETURN 'em_risco';
  ELSE                    RETURN 'inativo';
  END IF;
END;
$$;

-- Trigger: ao registrar uma compra, recalcula ciclo + status do cliente
CREATE OR REPLACE FUNCTION public.handle_compra_consumivel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ciclo_novo    integer;
  status_novo   public.consumivel_status;
  status_atual  public.consumivel_status;
  ciclo_efetivo integer;
  rec           RECORD;
BEGIN
  -- Atualiza data_ultima_compra (só se for mais recente)
  UPDATE public.consumiveis_recorrencia
  SET data_ultima_compra = GREATEST(COALESCE(data_ultima_compra, NEW.data), NEW.data),
      updated_at = now()
  WHERE id = NEW.consumivel_id;

  -- Recalcula ciclo estimado: mediana dos intervalos entre as últimas 6 compras
  SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY diff))::integer INTO ciclo_novo
  FROM (
    SELECT (data - LAG(data) OVER (ORDER BY data))::integer AS diff
    FROM public.compras_consumiveis
    WHERE consumivel_id = NEW.consumivel_id
    ORDER BY data DESC
    LIMIT 6
  ) d
  WHERE diff IS NOT NULL AND diff > 0;

  IF ciclo_novo IS NOT NULL THEN
    UPDATE public.consumiveis_recorrencia
    SET ciclo_estimado_dias = ciclo_novo
    WHERE id = NEW.consumivel_id;
  END IF;

  -- Busca registro atualizado + ciclo padrão da linha
  SELECT cr.*, lp.ciclo_consumivel_padrao_dias AS ciclo_padrao
  INTO rec
  FROM public.consumiveis_recorrencia cr
  JOIN public.linhas_produto lp ON lp.id = cr.linha_id
  WHERE cr.id = NEW.consumivel_id;

  IF rec.status = 'pausado' THEN RETURN NEW; END IF;

  ciclo_efetivo := COALESCE(rec.ciclo_editado_dias, rec.ciclo_estimado_dias, rec.ciclo_padrao);
  IF ciclo_efetivo IS NULL THEN RETURN NEW; END IF;

  status_novo  := public.calcular_status_consumivel(rec.data_ultima_compra, ciclo_efetivo);
  status_atual := rec.status;

  IF status_novo != status_atual THEN
    UPDATE public.consumiveis_recorrencia SET status = status_novo WHERE id = NEW.consumivel_id;

    INSERT INTO public.historico_status_consumiveis
      (consumivel_id, status_anterior, status_novo, ciclo_efetivo_dias, dias_desde_ultima_compra)
    VALUES
      (NEW.consumivel_id, status_atual, status_novo, ciclo_efetivo, CURRENT_DATE - rec.data_ultima_compra);

    -- Conclui tarefa pendente se voltou a ativo
    IF status_novo = 'ativo' THEN
      UPDATE public.tarefas
      SET status = 'concluida', concluida_em = now()
      WHERE consumivel_id = NEW.consumivel_id
        AND status IN ('pendente', 'em_andamento')
        AND archived_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compra_consumivel_insert
  AFTER INSERT ON public.compras_consumiveis
  FOR EACH ROW EXECUTE FUNCTION public.handle_compra_consumivel();

-- Job diário: recalcula status de todos os clientes ativos e gera/conclui tarefas
CREATE OR REPLACE FUNCTION public.job_recalcular_consumiveis()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec           RECORD;
  status_novo   public.consumivel_status;
  ciclo_efetivo integer;
  dias_desde    integer;
BEGIN
  FOR rec IN
    SELECT cr.*,
           lp.ciclo_consumivel_padrao_dias AS ciclo_padrao,
           lp.nome   AS linha_nome,
           us.nome   AS unidade_nome
    FROM public.consumiveis_recorrencia cr
    JOIN public.linhas_produto  lp ON lp.id = cr.linha_id
    JOIN public.unidades_saude  us ON us.id = cr.unidade_id
    WHERE cr.archived_at IS NULL
  LOOP
    -- Auto-despausa se pausa_ate já passou
    IF rec.status = 'pausado' AND rec.pausa_ate IS NOT NULL AND rec.pausa_ate < CURRENT_DATE THEN
      UPDATE public.consumiveis_recorrencia
      SET status = 'ativo', pausa_motivo = NULL, pausa_ate = NULL
      WHERE id = rec.id;
      CONTINUE;
    END IF;

    IF rec.status = 'pausado' THEN CONTINUE; END IF;
    IF rec.data_ultima_compra IS NULL THEN CONTINUE; END IF;

    ciclo_efetivo := COALESCE(rec.ciclo_editado_dias, rec.ciclo_estimado_dias, rec.ciclo_padrao);
    IF ciclo_efetivo IS NULL THEN CONTINUE; END IF;

    dias_desde  := CURRENT_DATE - rec.data_ultima_compra;
    status_novo := public.calcular_status_consumivel(rec.data_ultima_compra, ciclo_efetivo);

    IF status_novo = rec.status THEN CONTINUE; END IF;

    -- Atualiza status
    UPDATE public.consumiveis_recorrencia
    SET status = status_novo, updated_at = now()
    WHERE id = rec.id;

    -- Registra histórico
    INSERT INTO public.historico_status_consumiveis
      (consumivel_id, status_anterior, status_novo, ciclo_efetivo_dias, dias_desde_ultima_compra)
    VALUES (rec.id, rec.status, status_novo, ciclo_efetivo, dias_desde);

    -- Gera tarefa apenas na entrada em atenção/risco
    IF status_novo IN ('atencao', 'em_risco') THEN
      INSERT INTO public.tarefas (
        titulo, descricao, responsavel_id, criador_id,
        status, prioridade, unidade_id, consumivel_id, data_vencimento
      ) VALUES (
        CASE status_novo
          WHEN 'atencao'   THEN 'Consumível atenção: '  || rec.unidade_nome
          WHEN 'em_risco'  THEN 'Consumível RISCO: '    || rec.unidade_nome
        END,
        'Linha ' || rec.linha_nome || '. Última compra há ' || dias_desde
          || ' dias (ciclo esperado: ' || ciclo_efetivo || ' dias).',
        rec.vendedor_id,
        rec.vendedor_id,
        'pendente',
        CASE status_novo
          WHEN 'em_risco' THEN 'alta'::public.tarefa_prioridade
          ELSE                 'media'::public.tarefa_prioridade
        END,
        rec.unidade_id,
        rec.id,
        CURRENT_DATE + 3
      );

    -- Conclui tarefa se voltou a ativo
    ELSIF status_novo = 'ativo' THEN
      UPDATE public.tarefas
      SET status = 'concluida', concluida_em = now()
      WHERE consumivel_id = rec.id
        AND status IN ('pendente', 'em_andamento')
        AND archived_at IS NULL;
    END IF;

  END LOOP;
END;
$$;

-- ── Seed: permissões por papel ─────────────────────────────

INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('gerente',          'view_recorrencia', true),
  ('vendedor',         'view_recorrencia', true),
  ('equipe_advance',   'view_recorrencia', false),
  ('pos_venda',        'view_recorrencia', false)
ON CONFLICT (role, permission) DO UPDATE SET allowed = EXCLUDED.allowed;
