-- ============================================================
-- Campanha "Todos no Ataque": meta diária coletiva da empresa
-- - metas_campanha: alvo da empresa (contatos + agendas por dia)
-- - painel_ataque_hoje(): agregados por pessoa visíveis a TODOS
--   (SECURITY DEFINER — devolve só contagens + nome, sem expor
--   linhas sensíveis que o RLS protege)
-- ============================================================

CREATE TABLE public.metas_campanha (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo             text NOT NULL DEFAULT 'Todos no Ataque',
  meta_contatos_dia  integer NOT NULL CHECK (meta_contatos_dia > 0),
  meta_agendas_dia   integer NOT NULL CHECK (meta_agendas_dia > 0),
  ativo              boolean NOT NULL DEFAULT true,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- No máximo UMA campanha ativa
CREATE UNIQUE INDEX idx_metas_campanha_ativa ON public.metas_campanha(ativo) WHERE ativo = true;

CREATE TRIGGER trg_metas_campanha_touch
  BEFORE UPDATE ON public.metas_campanha
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.metas_campanha ENABLE ROW LEVEL SECURITY;

-- Todos leem a campanha (é coletiva); só admin/gerente edita
CREATE POLICY "metas_campanha_select" ON public.metas_campanha FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "metas_campanha_insert" ON public.metas_campanha FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "metas_campanha_update" ON public.metas_campanha FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

-- Meta inicial da empresa
INSERT INTO public.metas_campanha (titulo, meta_contatos_dia, meta_agendas_dia)
VALUES ('Todos no Ataque', 40, 4);

-- Agregados do dia por pessoa (contatos = ligações; agendamentos = tarefas com tipo).
-- SECURITY DEFINER para que qualquer vendedor enxergue o esforço do time inteiro,
-- sem dar acesso direto às linhas (que o RLS mantém restritas).
CREATE OR REPLACE FUNCTION public.painel_ataque_hoje()
RETURNS TABLE (vendedor_id uuid, nome text, contatos bigint, agendamentos bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dia AS (
    -- janela do dia no fuso de Brasília (alinha com a contagem local do front)
    SELECT (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo' AS ini,
           (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day') AT TIME ZONE 'America/Sao_Paulo' AS fim
  ),
  lig AS (
    SELECT l.vendedor_id AS pid, count(*) AS c
    FROM public.ligacoes l, dia
    WHERE l.created_at >= dia.ini AND l.created_at < dia.fim
    GROUP BY l.vendedor_id
  ),
  ag AS (
    SELECT t.criador_id AS pid, count(*) AS c
    FROM public.tarefas t, dia
    WHERE t.tipo_agendamento IS NOT NULL
      AND t.archived_at IS NULL
      AND t.created_at >= dia.ini AND t.created_at < dia.fim
    GROUP BY t.criador_id
  ),
  pessoas AS (
    SELECT pid FROM lig
    UNION
    SELECT pid FROM ag
  )
  SELECT pe.pid AS vendedor_id,
         COALESCE(p.nome, 'Sem nome') AS nome,
         COALESCE(lig.c, 0) AS contatos,
         COALESCE(ag.c, 0) AS agendamentos
  FROM pessoas pe
  LEFT JOIN lig ON lig.pid = pe.pid
  LEFT JOIN ag  ON ag.pid  = pe.pid
  LEFT JOIN public.profiles p ON p.id = pe.pid
  ORDER BY (COALESCE(lig.c, 0) + COALESCE(ag.c, 0)) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.painel_ataque_hoje() TO authenticated;
