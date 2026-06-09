-- deals_manutencao.unidade_id tinha apenas índice, sem FK para unidades_saude.
-- PostgREST não conseguia fazer o join; erro: "Could not find a relationship..."
ALTER TABLE public.deals_manutencao
  ADD CONSTRAINT deals_manutencao_unidade_id_fkey
  FOREIGN KEY (unidade_id) REFERENCES public.unidades_saude(id) ON DELETE RESTRICT;
