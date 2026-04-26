
CREATE OR REPLACE FUNCTION public.handle_anotacao_proximo_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo TEXT;
  v_nome   TEXT;
BEGIN
  IF NEW.proximo_contato IS NOT NULL THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT titulo INTO v_nome FROM public.deals WHERE id = NEW.deal_id;
      v_titulo := 'Follow-up: ' || COALESCE(v_nome, 'deal');
    ELSIF NEW.medico_id IS NOT NULL THEN
      SELECT 'Dr. ' || nome INTO v_nome FROM public.medicos WHERE id = NEW.medico_id;
      v_titulo := 'Follow-up: ' || COALESCE(v_nome, 'médico');
    ELSIF NEW.unidade_id IS NOT NULL THEN
      SELECT nome INTO v_nome FROM public.unidades_saude WHERE id = NEW.unidade_id;
      v_titulo := 'Follow-up: ' || COALESCE(v_nome, 'unidade');
    ELSE
      v_titulo := 'Follow-up (anotação)';
    END IF;

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
