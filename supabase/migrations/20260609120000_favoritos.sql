-- ============================================================
-- Favoritos: marcação pessoal (por usuário) de qualquer item do CRM
-- ============================================================

CREATE TYPE public.favorito_tipo AS ENUM (
  'unidade', 'medico', 'deal', 'deal_manutencao',
  'discovery', 'stakeholder', 'recorrencia'
);

CREATE TABLE public.favoritos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo        public.favorito_tipo NOT NULL,
  item_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo, item_id)
);

CREATE INDEX idx_favoritos_user ON public.favoritos(user_id, tipo);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê e gerencia apenas os próprios favoritos
CREATE POLICY "fav_select" ON public.favoritos FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "fav_insert" ON public.favoritos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "fav_delete" ON public.favoritos FOR DELETE TO authenticated
  USING (user_id = auth.uid());
