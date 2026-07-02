-- =============================================================
-- VENDAS ADVANCE V2 — 7 ÁREAS
--
-- Redesenho profundo do Vendas Advance: o checklist genérico de
-- 11 itens dá lugar a 7 áreas com campos e regra de conclusão
-- próprios (margem, crédito, legal, faturamento, logística,
-- instalação/aplicação e NPS).
--
-- 1. Elimina as saídas antigas (decisão: sem utilidade, sem migração)
-- 2. Converte a coluna bloco de enum para text (áreas novas)
-- 3. Cria nps_pesquisas + funções públicas p/ o cliente responder
--    sem login (link externo /nps/:token)
-- =============================================================

-- 1. Limpa os dados antigos do Advance (11 itens legados)
DELETE FROM public.saidas_advance_anexos;
DELETE FROM public.saidas_advance_itens;
DELETE FROM public.saidas_advance;

-- 2. bloco deixa de ser enum: as 7 áreas novas usam chaves livres
--    (margem, credito, legal, faturamento, logistica,
--     instalacao_aplicacao, nps)
ALTER TABLE public.saidas_advance_itens
  ALTER COLUMN bloco TYPE text USING bloco::text;

-- =============================================================
-- 3. NPS por link externo
-- =============================================================

CREATE TABLE public.nps_pesquisas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid NOT NULL REFERENCES public.saidas_advance(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades_saude(id) ON DELETE SET NULL,
  cliente_nome text,
  nf_numero text,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz,
  nota int CHECK (nota BETWEEN 0 AND 10),
  comentario text,
  avaliacoes jsonb,
  -- linha criada na tabela nps (aba NPS do Pós-Venda) quando o cliente responde
  nps_id uuid REFERENCES public.nps(id) ON DELETE SET NULL
);

ALTER TABLE public.nps_pesquisas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_nps_pesquisas_saida_id ON public.nps_pesquisas(saida_id);
CREATE INDEX idx_nps_pesquisas_token ON public.nps_pesquisas(token);

CREATE POLICY nps_pesquisas_select ON public.nps_pesquisas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'equipe_advance') OR
    public.has_role(auth.uid(), 'pos_venda')
  );

CREATE POLICY nps_pesquisas_insert ON public.nps_pesquisas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance')
  );

CREATE POLICY nps_pesquisas_update ON public.nps_pesquisas
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'equipe_advance')
  );

-- -------------------------------------------------------------
-- Funções públicas (SECURITY DEFINER): o link externo usa a
-- chave anon, sem sessão. Todo acesso passa por aqui — a tabela
-- continua fechada para anon.
-- -------------------------------------------------------------

-- Carrega o mínimo necessário para renderizar o formulário público
CREATE OR REPLACE FUNCTION public.nps_pesquisa_publica(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT p.respondido_em, COALESCE(u.nome, p.cliente_nome) AS cliente, p.nf_numero
    INTO r
    FROM nps_pesquisas p
    LEFT JOIN unidades_saude u ON u.id = p.unidade_id
   WHERE p.token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'cliente', r.cliente,
    'nf_numero', r.nf_numero,
    'respondido', r.respondido_em IS NOT NULL
  );
END;
$$;

-- Registra a resposta do cliente:
--  - grava nota/comentário/avaliações na pesquisa
--  - insere na tabela nps (aba NPS do Pós-Venda), se houver unidade
--  - conclui a área "nps" da saída Advance
CREATE OR REPLACE FUNCTION public.nps_responder_publico(
  p_token uuid,
  p_nota int,
  p_comentario text DEFAULT NULL,
  p_avaliacoes jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pes record;
  novo_nps uuid;
BEGIN
  IF p_nota IS NULL OR p_nota < 0 OR p_nota > 10 THEN
    RAISE EXCEPTION 'Nota inválida';
  END IF;

  SELECT * INTO pes FROM nps_pesquisas WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesquisa não encontrada';
  END IF;
  IF pes.respondido_em IS NOT NULL THEN
    RAISE EXCEPTION 'Pesquisa já respondida';
  END IF;

  IF pes.unidade_id IS NOT NULL THEN
    INSERT INTO nps (unidade_id, nota, data, comentarios)
    VALUES (pes.unidade_id, p_nota, current_date, p_comentario)
    RETURNING id INTO novo_nps;
  END IF;

  UPDATE nps_pesquisas
     SET respondido_em = now(),
         nota = p_nota,
         comentario = p_comentario,
         avaliacoes = p_avaliacoes,
         nps_id = novo_nps
   WHERE id = pes.id;

  UPDATE saidas_advance_itens
     SET concluido = true,
         concluido_em = now(),
         dados_extras = COALESCE(dados_extras, '{}'::jsonb)
                        || jsonb_build_object('nota', p_nota)
   WHERE saida_id = pes.saida_id
     AND chave_item = 'nps';

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.nps_pesquisa_publica(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nps_responder_publico(uuid, int, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nps_pesquisa_publica(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nps_responder_publico(uuid, int, text, jsonb) TO anon, authenticated;
