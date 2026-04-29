
-- Limpeza completa de dados de teste (preserva usuários, perfis, papéis, linhas de produto, estados, tipos, especialidades, etc.)
DELETE FROM public.faturamento;
DELETE FROM public.deal_equipamentos;
DELETE FROM public.deal_stage_history;
DELETE FROM public.tarefas;
DELETE FROM public.anotacoes;
DELETE FROM public.nps;
DELETE FROM public.chamados;
DELETE FROM public.instalacoes;
DELETE FROM public.contratos_manutencao;
DELETE FROM public.garantias;
DELETE FROM public.parque_instalado;
DELETE FROM public.deals_manutencao;
DELETE FROM public.deals;
DELETE FROM public.contatos;
DELETE FROM public.medico_unidades;
DELETE FROM public.medicos;
DELETE FROM public.unidades_saude;
