## Problema

Ao adicionar uma anotação em um Discovery, o banco rejeita com:

```
new row for relation "anotacoes" violates check constraint "anotacoes_check"
```

### Causa raiz

A tabela `anotacoes` tem o constraint:

```sql
CHECK (deal_id IS NOT NULL OR medico_id IS NOT NULL OR unidade_id IS NOT NULL)
```

Esse check foi criado **antes** da coluna `discovery_id` existir. Hoje, em `DiscoveryDetail.tsx` (linha 284), o insert envia apenas `discovery_id`, sem deal/medico/unidade — então o constraint barra o insert.

## Solução

Atualizar o check constraint para também aceitar `discovery_id` como vínculo válido.

### Migração (schema)

```sql
ALTER TABLE public.anotacoes DROP CONSTRAINT anotacoes_check;

ALTER TABLE public.anotacoes ADD CONSTRAINT anotacoes_check CHECK (
  deal_id IS NOT NULL
  OR medico_id IS NOT NULL
  OR unidade_id IS NOT NULL
  OR discovery_id IS NOT NULL
);
```

### Trigger relacionado

A função `handle_anotacao_proximo_contato()` (que cria tarefa de follow-up) já trata os casos `deal_id / medico_id / unidade_id`, mas **não** trata `discovery_id` — cai no fallback "Follow-up (anotação)" e a tarefa criada fica sem `discovery_id` (a tabela `tarefas` nem tem essa coluna). Como follow-ups de Discovery hoje funcionam assim mesmo (sem vínculo direto na tarefa), **não vou alterar** essa função neste plano para não escopar mais do que o necessário. Se quiser, posso incluir num plano separado.

## Fora de escopo

- Mudar a UI de anotações.
- Adicionar coluna `discovery_id` em `tarefas`.
- Mexer em RLS (as policies atuais já permitem o insert).
