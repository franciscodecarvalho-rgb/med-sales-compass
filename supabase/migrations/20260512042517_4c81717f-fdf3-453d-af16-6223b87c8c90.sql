DROP TRIGGER IF EXISTS trg_anotacoes_proximo_contato ON public.anotacoes;

WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY anotacao_id
           ORDER BY created_at, id
         ) AS rn
  FROM public.tarefas
  WHERE anotacao_id IS NOT NULL
)
DELETE FROM public.tarefas
WHERE id IN (SELECT id FROM dups WHERE rn > 1);