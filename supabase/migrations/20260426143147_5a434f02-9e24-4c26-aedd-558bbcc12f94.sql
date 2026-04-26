
-- Adiciona 'atrasada' ao enum tarefa_status
ALTER TYPE public.tarefa_status ADD VALUE IF NOT EXISTS 'atrasada';

-- Função para auto-marcar tarefas atrasadas
CREATE OR REPLACE FUNCTION public.marcar_tarefas_atrasadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.tarefas
     SET status = 'atrasada'::public.tarefa_status,
         updated_at = now()
   WHERE status = 'pendente'::public.tarefa_status
     AND data_vencimento IS NOT NULL
     AND data_vencimento < now()
     AND archived_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
