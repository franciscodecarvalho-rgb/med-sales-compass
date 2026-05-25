# Tarefas: alinhar contadores e permitir atribuição

## 1. Divergência de contadores (Painel vs Tarefas)

Causas identificadas no `DashboardVendedor.tsx`:

- **"Tarefas hoje"** (linha 45) só conta status `pendente`/`em_andamento` com `data_vencimento` em hoje. Se uma tarefa de hoje virou `atrasada` (passou da hora), ela some do KPI mas continua sendo contada como "Hoje" em `/tarefas`.
- **"Atrasadas"** (linha 46) filtra apenas por `status = 'atrasada'`. Esse status só é marcado quando o usuário abre a página `/tarefas` (que chama `rpc('marcar_tarefas_atrasadas')`). Se o vendedor só olha o painel, tarefas vencidas ainda em `pendente` não entram na contagem.

### Correção

No `DashboardVendedor.tsx` (e mesma lógica aplicada onde fizer sentido em `DashboardGerente.tsx`):

1. Chamar `await supabase.rpc('marcar_tarefas_atrasadas')` no início do `load()`, antes das demais queries, para sincronizar status.
2. Mudar o critério das contagens para serem coerentes com o que `/tarefas` mostra:
   - **Atrasadas** = `status in ('pendente','em_andamento','atrasada')` AND `data_vencimento < inicioHoje`.
   - **Hoje** = `status in ('pendente','em_andamento','atrasada')` AND `data_vencimento >= inicioHoje AND data_vencimento < fimHoje`.
   
   Assim KPI e página usam exatamente a mesma definição (mesma que `counts` em `Tarefas.tsx`).

## 2. Atribuir tarefa a outro usuário

Hoje `NovaTarefaDialog` e `EditarTarefaDialog` sempre usam `responsavel_id = user.id`. Adicionar seleção de responsável:

### `NovaTarefaDialog` (em `src/pages/Tarefas.tsx`)
- Carregar lista de `profiles` ativos quando o usuário for admin/gerente (reusar o estilo do filtro já existente).
- Adicionar campo `<Select>` "Responsável" mostrado apenas para admin/gerente; default = usuário logado. Para vendedor comum, mantém comportamento atual (auto-atribui a si).
- `payload.responsavel_id = form.responsavelId || user.id`.

### `EditarTarefaDialog` (em `src/components/EditarTarefaDialog.tsx`)
- Adicionar mesmo `<Select>` "Responsável" visível apenas para admin/gerente.
- Incluir `responsavel_id` no `update`.
- Carregar profiles ativos no mount do dialog (quando admin/gerente).

Permissão de banco: RLS de `tarefas` precisa permitir admin/gerente alterar/criar com `responsavel_id` diferente. Verificar e, se necessário, ajustar política via migration (provavelmente já permite, mas confirmar antes de codar).

## Arquivos afetados

- `src/components/dashboards/DashboardVendedor.tsx` — corrigir queries de KPI.
- `src/components/dashboards/DashboardGerente.tsx` — chamar `marcar_tarefas_atrasadas` no load (consistência).
- `src/pages/Tarefas.tsx` — campo Responsável no `NovaTarefaDialog`.
- `src/components/EditarTarefaDialog.tsx` — campo Responsável.
- Possível migration em `supabase/migrations/` se a RLS bloquear atribuição cruzada.

Sem mudança de schema esperada — `tarefas.responsavel_id` já existe.
