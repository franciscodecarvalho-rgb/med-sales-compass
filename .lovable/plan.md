## Remover constraint `deals_unidade_or_medico_required`

O frontend já foi ajustado, mas o banco ainda tem um CHECK constraint na tabela `deals` que bloqueia o insert quando `unidade_id` e `medico_id` estão ambos nulos. Por isso o Modo Lite (e o funil normal) falham com:

> new row for relation "deals" violates check constraint "deals_unidade_or_medico_required"

### Mudança

**Migração SQL** (uma linha):

```sql
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_unidade_or_medico_required;
```

### O que NÃO muda

- Colunas `unidade_id` e `medico_id` continuam nullable como já estão.
- RLS, triggers, índices: sem alteração.
- Código frontend: já está pronto (validação removida no `FunilVendas` e no `Lite`).

Depois da migração, salvar um lead/deal sem unidade nem médico passa a funcionar normalmente, e o vínculo pode ser completado depois pelo DealDetail.