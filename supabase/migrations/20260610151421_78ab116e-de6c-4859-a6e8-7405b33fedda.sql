CREATE SEQUENCE IF NOT EXISTS public.deals_numero_seq;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS numero integer;
UPDATE public.deals SET numero = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM public.deals WHERE numero IS NULL) sub
WHERE deals.id = sub.id AND deals.numero IS NULL;
SELECT setval('public.deals_numero_seq', COALESCE((SELECT MAX(numero) FROM public.deals), 0));
ALTER TABLE public.deals ALTER COLUMN numero SET DEFAULT nextval('public.deals_numero_seq');
ALTER TABLE public.deals ALTER COLUMN numero SET NOT NULL;
ALTER SEQUENCE public.deals_numero_seq OWNED BY public.deals.numero;
CREATE UNIQUE INDEX IF NOT EXISTS deals_numero_unique ON public.deals(numero);