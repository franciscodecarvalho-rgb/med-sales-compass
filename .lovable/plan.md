## Problema

Ao criar/listar deals no Funil de Vendas, o backend retorna:
`invalid input value for enum app_role: "assistente_vendas"`

O enum `app_role` no banco só contém: `admin`, `gerente`, `vendedor`, `pos_venda`, `equipe_advance`. Porém a função `can_view_deal` (usada pelas RLS policies de `deals`, `deal_equipamentos` e `deal_stage_history`) tem esta linha:

```sql
OR (public.has_role(_user_id, 'assistente_vendas') AND _estagio IN ('fechamento', 'finalizado'))
```

Esse literal não existe no enum → qualquer SELECT/INSERT em `deals` quebra.

## Correção

Recriar a função `can_view_deal` substituindo `'assistente_vendas'` por `'equipe_advance'`, mantendo a mesma intenção (já é o padrão usado na policy `deals_update_sales`).

```sql
CREATE OR REPLACE FUNCTION public.can_view_deal(_user_id uuid, _vendedor_id uuid, _estagio deal_stage)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin_or_gerente(_user_id)
    OR public.has_permission(_user_id, 'view_all_records')
    OR (public.has_role(_user_id, 'vendedor') AND _vendedor_id = _user_id)
    OR (public.has_role(_user_id, 'equipe_advance') AND _estagio IN ('fechamento', 'finalizado'))
    OR public.has_role(_user_id, 'pos_venda')
$$;
```

## Observação adicional (não bloqueante)

A edge function `supabase/functions/admin-create-user/index.ts` aceita `"assistente_vendas"` no tipo `Body.role`. Como o enum não tem esse valor, criar usuário com esse papel falharia também. Posso ajustar o tipo para `"equipe_advance"` no mesmo passo se você quiser — me confirme.

## Resultado esperado

Criar/listar deals volta a funcionar normalmente, sem alterar a lógica de visibilidade pretendida.