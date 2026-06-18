
CREATE TABLE public.metas_campanha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL DEFAULT 'Todos no Ataque',
  meta_contatos_dia integer NOT NULL DEFAULT 40,
  meta_agendas_dia integer NOT NULL DEFAULT 4,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_campanha TO authenticated;
GRANT ALL ON public.metas_campanha TO service_role;

ALTER TABLE public.metas_campanha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados leem campanhas"
  ON public.metas_campanha FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Apenas admin/gerente gerencia campanhas (insert)"
  ON public.metas_campanha FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Apenas admin/gerente gerencia campanhas (update)"
  ON public.metas_campanha FOR UPDATE
  TO authenticated USING (public.is_admin_or_gerente(auth.uid()))
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Apenas admin/gerente gerencia campanhas (delete)"
  ON public.metas_campanha FOR DELETE
  TO authenticated USING (public.is_admin_or_gerente(auth.uid()));

CREATE TRIGGER trg_metas_campanha_updated_at
  BEFORE UPDATE ON public.metas_campanha
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RPC: painel de ataque do dia (contatos = ligacoes hoje, agendamentos = tarefas com tipo_agendamento criadas hoje)
CREATE OR REPLACE FUNCTION public.painel_ataque_hoje()
RETURNS TABLE (vendedor_id uuid, nome text, contatos bigint, agendamentos bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH lig AS (
    SELECT l.vendedor_id, COUNT(*)::bigint AS c
    FROM public.ligacoes l
    WHERE l.created_at >= date_trunc('day', now())
      AND l.created_at <  date_trunc('day', now()) + interval '1 day'
    GROUP BY l.vendedor_id
  ),
  ag AS (
    SELECT t.criador_id AS vendedor_id, COUNT(*)::bigint AS a
    FROM public.tarefas t
    WHERE t.tipo_agendamento IS NOT NULL
      AND t.created_at >= date_trunc('day', now())
      AND t.created_at <  date_trunc('day', now()) + interval '1 day'
    GROUP BY t.criador_id
  ),
  ids AS (
    SELECT vendedor_id FROM lig
    UNION
    SELECT vendedor_id FROM ag
  )
  SELECT
    i.vendedor_id,
    COALESCE(p.nome, p.email, 'Vendedor') AS nome,
    COALESCE(lig.c, 0) AS contatos,
    COALESCE(ag.a, 0) AS agendamentos
  FROM ids i
  LEFT JOIN public.profiles p ON p.id = i.vendedor_id
  LEFT JOIN lig ON lig.vendedor_id = i.vendedor_id
  LEFT JOIN ag  ON ag.vendedor_id  = i.vendedor_id
  ORDER BY (COALESCE(lig.c,0) + COALESCE(ag.a,0)) DESC, nome ASC;
$$;

GRANT EXECUTE ON FUNCTION public.painel_ataque_hoje() TO authenticated;
