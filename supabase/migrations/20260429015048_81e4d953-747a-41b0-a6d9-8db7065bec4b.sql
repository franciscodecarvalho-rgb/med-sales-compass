-- Adiciona FKs para public.profiles (nomes únicos, não conflitam com FKs existentes para auth.users)
ALTER TABLE public.deals
  ADD CONSTRAINT deals_vendedor_profile_fkey FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.deals_manutencao
  ADD CONSTRAINT deals_manutencao_vendedor_profile_fkey FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.anotacoes
  ADD CONSTRAINT anotacoes_autor_profile_fkey FOREIGN KEY (autor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.tarefas
  ADD CONSTRAINT tarefas_responsavel_profile_fkey FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.tarefas
  ADD CONSTRAINT tarefas_criador_profile_fkey FOREIGN KEY (criador_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.deal_stage_history
  ADD CONSTRAINT deal_stage_history_changed_by_profile_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.faturamento
  ADD CONSTRAINT faturamento_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chamados
  ADD CONSTRAINT chamados_tecnico_profile_fkey FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.instalacoes
  ADD CONSTRAINT instalacoes_tecnico_profile_fkey FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
