ALTER TABLE public.deals
  ADD CONSTRAINT deals_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE SET NULL;