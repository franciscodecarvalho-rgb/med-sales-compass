## Objetivo

1. Na **timeline do Discovery**, o badge "⏰ Follow-up: ..." deve ser clicável e abrir o mesmo diálogo de edição de tarefa que aparece em **Tarefas**.
2. Na página **Tarefas**, garantir que tarefas vinculadas a Discovery mostrem o link "→ nome do discovery" (igual deals).

## Mudanças

### `src/pages/DiscoveryDetail.tsx`
- No `load()`, buscar tarefas do discovery (`tarefas` onde `discovery_id = id`, não arquivadas), retornando `id, anotacao_id, status, ...campos usados pelo EditarTarefaDialog`. Indexar por `anotacao_id`.
- Importar `EditarTarefaDialog` de `@/components/EditarTarefaDialog`.
- No bloco da timeline (linhas 741–745), quando `a.proximo_contato` existir e houver tarefa correspondente (via `anotacao_id`), trocar o `<div>` do follow-up por um `<button>` que abre o dialog.
- Estado local: `tarefaAberta` (objeto da tarefa) + render do `<EditarTarefaDialog>` controlado, recarregando `load()` ao salvar.
- Mostrar visualmente o status concluído quando `tarefa.status === 'concluida'` (ex: ✓ verde).

### `src/pages/Tarefas.tsx`
O mapeamento já contempla discovery (linhas 421–428), mas a query precisa ser confirmada. Verificar:
- Linha 82: `discovery(id, nome)` — se Supabase não inferir a relação automaticamente (não há FK declarada formalmente nessas tabelas), substituir pelo nome correto da relação ou fazer join manual.
- Se necessário, ajustar para `discovery:discovery_id(id, nome)` ou buscar nomes via `in()` separado e mesclar.
- Confirmar que `tipoOf()` (linha 358) e `TIPO_META` já incluem discovery — confirmado.

Resultado: clicar no follow-up abre a tarefa direto; lista de Tarefas mostra link para o Discovery vinculado.