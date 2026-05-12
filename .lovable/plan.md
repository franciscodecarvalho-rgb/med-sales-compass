## Objetivo

1. **Deal sem unidade**: permitir abrir deal vinculado apenas a um médico (ou unidade, ou ambos — mas obrigatório pelo menos um).
2. **Stakeholders**: nova área (admin + gerente) com cadastro de pessoas-chave externas e tarefas vinculadas.

---

## 1. Médico opcional/obrigatório no deal

### Banco
- Adicionar coluna `medico_id uuid` em `deals` (nullable).
- Tornar `unidade_id` nullable em `deals`.
- Constraint `CHECK (unidade_id IS NOT NULL OR medico_id IS NOT NULL)`.
- Mesmo tratamento em `deals_manutencao`? **Não** — manutenção sempre tem unidade.

### Código
- **`src/pages/FunilVendas.tsx`** (NewDealDialog):
  - Adicionar combobox de médico (busca por nome/CRM).
  - Validação: exige unidade OU médico (linha + título continuam obrigatórios).
  - Payload inclui `medico_id`.
- **`src/pages/FunilVendas.tsx`** (listagem): exibir médico quando não houver unidade (coluna "Cliente").
- **`src/pages/DealDetail.tsx`**: mostrar bloco médico análogo ao da unidade; permitir editar ambos.
- **`src/components/EditarTarefaDialog.tsx`**: já lida com tarefa vinculada a médico — sem mudança.

---

## 2. Stakeholders (admin + gerente)

### Banco
- Nova tabela `stakeholders`:
  - `nome` (text, NOT NULL)
  - `cargo` (text)
  - `organizacao` (text)
  - `tipo` (text, ex.: "decisor", "influenciador", "político", "financeiro")
  - `telefone`, `email` (text)
  - `observacoes` (text)
  - `created_by` (uuid)
  - `archived_at`, `created_at`, `updated_at`
- RLS: SELECT/INSERT/UPDATE só `is_admin_or_gerente(auth.uid())`.
- Adicionar `stakeholder_id uuid` em `tarefas` (nullable).
- Atualizar trigger `handle_anotacao_proximo_contato` se necessário (não muda — stakeholders não geram anotações nesta etapa).

### Código
- **`src/pages/Stakeholders.tsx`** (novo): lista + busca + dialog de criar/editar; filtros por tipo.
- **`src/pages/StakeholderDetail.tsx`** (novo): dados, lista de tarefas, botão "Nova tarefa" usando o mesmo padrão de criação de tarefa.
- **`src/App.tsx`**: rotas `/stakeholders` e `/stakeholders/:id` protegidas por `requireRoles={["admin","gerente"]}`.
- **`src/components/AppLayout.tsx`**: item de menu "Stakeholders" (ícone `Users2` ou `Handshake`), `roles: ["admin","gerente"]`.
- **`src/pages/Tarefas.tsx`**: incluir `stakeholders(id, nome)` na query e mapeamento `tipoOf`/`TIPO_META` para mostrar link "→ stakeholder".
- **`src/components/EditarTarefaDialog.tsx`**: adicionar `stakeholder` no `VINCULO_CLS` e na cadeia de detecção (após discovery/medico/unidade), navegando para `/stakeholders/:id`.

---

## Confirmação

Após aprovar, executo na ordem:
1. Migração (deals.medico_id + nullable unidade + check; stakeholders + tarefas.stakeholder_id + RLS).
2. Código frontend (Funil, DealDetail, Stakeholders, Tarefas, EditarTarefaDialog, Layout, App).