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

Esse check foi criado **antes** da coluna `discovery_id` existir. Em `DiscoveryDetail.tsx` (linha 284), o insert envia apenas `discovery_id`, sem deal/medico/unidade — então o constraint barra o insert.

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

## Fora de escopo

- Mudar a UI de anotações.
- Alterar a função `handle_anotacao_proximo_contato()` (follow-up de Discovery cai no fallback genérico, igual hoje).
- Mexer em RLS (policies atuais já permitem o insert).
