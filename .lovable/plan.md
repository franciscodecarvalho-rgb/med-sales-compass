## Diagnóstico

- O perfil `adriano.vaz@vitatech.com.br` existe em `profiles` (id `02c684d9-…f9d`, `ativo=true`).
- A edge function `admin-update-password` está deployada e funcionando (testei: responde corretamente, inclusive `User not found` para id inválido).
- Não há registros de erro nos logs do edge function nem tentativas de login do Adriano nos auth logs recentes — ou seja, ou o reset rodou com sucesso mas o Adriano ainda não tentou logar de novo, ou ele está digitando algo ligeiramente diferente (ex.: `V` minúsculo, `@` trocado por mobile, espaço no fim).
- Também é possível que a conta dele esteja sem `email_confirmed_at` em `auth.users`, o que faz o login falhar com "Invalid login credentials" mesmo a senha estando certa.

## O que vou fazer

1. **Resetar a senha do Adriano para `Vaz@1975` diretamente pelo backend**, chamando a edge function `admin-update-password` com o `user_id` `02c684d9-1cd1-4d55-82e4-1855da0a2f9d`.
2. **Confirmar o email no `auth.users`** via migration (set `email_confirmed_at = now()` se estiver nulo, só para esse usuário) — assim eliminamos a hipótese de conta não confirmada.
3. Verificar nos auth logs imediatamente depois se a próxima tentativa de login dele aparece como sucesso ou erro, e te reportar o resultado.

Não vou alterar a UI da tela de Usuários nem a edge function — elas estão funcionando.

## Importante

Depois do reset, peça ao Adriano para:
- Abrir uma janela anônima
- Digitar a senha exatamente: **`Vaz@1975`** (V maiúsculo, sem espaço no fim)
- Se ainda falhar, me mande o print da mensagem de erro para eu olhar o auth log correspondente.
