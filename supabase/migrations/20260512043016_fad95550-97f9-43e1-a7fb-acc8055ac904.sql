ALTER TABLE public.tarefas
  ADD CONSTRAINT tarefas_discovery_id_fkey
  FOREIGN KEY (discovery_id) REFERENCES public.discovery(id) ON DELETE SET NULL;