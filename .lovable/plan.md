# CRM VitaTech — Plano Completo

CRM customizado para a VitaTech (equipamentos médicos) com fluxo de venda, pós-venda e relacionamento com médicos. ~15 usuários, 5 perfis distintos, nada é deletado (apenas finalizado/arquivado), histórico sempre acessível.

## Decisões assumidas (podem ser ajustadas a qualquer momento)

- **Fase 1** entrega **Fundação + Funil de Vendas** (auth, perfis, cadastros completos e Kanban de vendas funcionando).
- **Contador de tempo do deal** mede tempo parado no estágio atual do Kanban (mostra gargalos).
- **Limites de cor** (verde/amarelo/vermelho) configuráveis por linha de produto, com defaults sensatos (7d / 14d / +14d).
- **Score da unidade** = soma do valor financeiro do parque instalado, mostrado também como contagem de equipamentos.

---

## Roadmap em fases

### Fase 1 — Fundação + Funil de Vendas
Base do sistema e entrega de valor imediato para o time comercial.

- **Autenticação** com email/senha (Lovable Cloud) e os 5 perfis: Admin, Gerente, Vendedor, Pós-Venda/Técnico, Assistente de Vendas.
- **Controle de acesso** por perfil em todas as páginas e ações (vendedor só vê seus deals, assistente só vê deals em Fechamento+, etc.).
- **Cadastros base**:
  - Linhas de produto (marcas/famílias configuráveis: Microtech, R. Wolf, etc.)
  - Equipamentos (catálogo, vinculados a uma linha)
  - Unidades de saúde com ciclo Discovery → Lead → Cliente, parque instalado, score automático, médico principal, contatos não-médicos
  - Médicos como entidade independente, vinculados a múltiplas unidades com papel definido em cada
  - Contatos não-médicos vinculados à unidade (compras, eng. clínica, admin)
- **Funil de Vendas (Kanban)** por linha de produto:
  - 7 estágios: Prospecção → Qualificação → Demonstração → Negociação → Decisão → Fechamento → Finalizado (ganho/perdido)
  - Drag-and-drop entre estágios, avança e regride livremente
  - Contador de tempo no estágio atual com cores verde/amarelo/vermelho
  - Botão "encerrar" disponível em qualquer estágio
  - Motivo de perda obrigatório ao marcar como perdido
  - Visão tabela alternativa ao Kanban com filtros (vendedor, estado, cidade, linha, status)
- **Detalhe do deal**: equipamentos vinculados, valor total, vendedor responsável, histórico de movimentações, anotações e tarefas vinculadas.
- **Anotações** (texto livre vinculadas a deal/médico/unidade) com campo opcional de "data do próximo contato" que gera tarefa automaticamente.
- **Tarefas** básicas vinculadas a deal/médico/unidade, com hierarquia de prioridade (deals > relacionamento > discovery).
- **Dashboard inicial** por perfil (lista de tarefas do dia + meus deals em andamento).
- **Exportação Excel** das listas para o Gerente.

### Fase 2 — Médicos, Tarefas e Relacionamento
Aprofundar o lado relacional e operacional do dia a dia.

- **Tela completa de Médicos** com ficha rica: especialidade, unidades vinculadas e papel em cada, histórico de interações, anotações, próximas ações.
- **Hub central de Tarefas**: visão consolidada (hoje, atrasadas, próximas), filtros, marcação como concluída, snooze.
- **Geração automática de tarefas de relacionamento** quando uma anotação tem data de próximo contato, ou quando um médico fica X dias sem contato.
- **Linha do tempo unificada** por unidade e por médico (todas as interações cronologicamente).

### Fase 3 — Pós-Venda
Operação técnica completa após deal ganho.

- **Chamados técnicos** vinculados a unidade + equipamento, status (aberto → em atendimento → resolvido → fechado), contador de tempo, histórico.
- **Instalação e Aplicação** geradas automaticamente quando deal é ganho, com upload de PDF, status (pendente → em andamento → concluído).
- **Contratos de manutenção**: vigência, valor, cobertura, alertas de vencimento.
- **Garantia por equipamento**, com vencimento que gera oportunidade automática no funil de manutenção.
- **NPS**: registro periódico de satisfação por unidade.
- **Faturamento**: registrado pelo Assistente de Vendas (NF, data, valor) ao final do deal.

### Fase 4 — Funil de Manutenção e Configurações Avançadas
- **Funil de manutenção** separado por linha (mesmos 7 estágios, mesma mecânica do funil de vendas) para vender contratos de manutenção, especialmente quando garantia vence.
- **Tela de Configurações (admin)**: linhas de produto, estágios e limites de tempo/cor por linha, motivos de perda, especialidades médicas, papéis de contato.
- **Gerenciamento de Usuários (admin)**: criar/desativar usuários, atribuir perfis, transferir carteira de deals entre vendedores.

### Fase 5 — Inteligência e Relatórios
- **Dashboards executivos** por perfil (Gerente: pipeline por vendedor/estado/linha, taxa de conversão por estágio, ciclo médio; Admin: visão geral; Vendedor: meus números).
- **Relatórios exportáveis** (Excel) com filtros avançados.
- **Alertas inteligentes** (deal parado, garantia vencendo, NPS baixo, médico sem contato).
- **Arquivamento e filtros de histórico** consolidados (já que nada é deletado).

---

## Notas técnicas

- **Stack**: React + TypeScript + Vite + Tailwind + shadcn/ui (já configurado no projeto).
- **Backend**: Lovable Cloud (Supabase gerenciado) — auth, Postgres, Storage para PDFs de instalação, RLS por perfil.
- **State**: TanStack Query (já no projeto) para cache e sincronização com o backend.
- **Roles**: tabela separada `user_roles` com enum `app_role` e função `has_role` SECURITY DEFINER (padrão seguro, evita escalonamento de privilégio).
- **Soft delete em tudo**: campo `archived_at` ou `status` em todas as tabelas; nenhum DELETE no código.
- **Auditoria**: tabela de eventos para rastrear mudanças de estágio, atribuições e ações sensíveis.
- **Storage**: bucket privado para PDFs de instalação/aplicação.
- **Realtime opcional** (Fase 2+) para Kanban colaborativo.

Ao aprovar, começo pela **Fase 1**. As fases seguintes são planejadas mas só executadas quando você der sinal verde.
