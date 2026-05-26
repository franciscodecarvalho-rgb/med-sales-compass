## Persistência de filtros no Funil de Vendas

Hoje os filtros do `/funil-vendas` (linha, busca, UF, região, vendedor, view kanban/tabela, sort, finalizados) são `useState` puros — ao navegar para um deal e voltar, tudo zera.

### Mudanças em `src/pages/FunilVendas.tsx`

1. **Persistir filtros em `sessionStorage`** sob a chave `funil-vendas:filters:v1`:
   - Campos salvos: `linhaId`, `search`, `filterEstado`, `filterRegiao`, `filterVendedor`, `showFinalizados`, `view`, `sortKey`, `sortDir`.
   - Inicializar cada `useState` com lazy initializer que lê do `sessionStorage` (fallback para o default atual).
   - `useEffect` único que grava o objeto serializado sempre que qualquer um desses estados mudar.
   - `sessionStorage` (não `localStorage`) → some ao fechar o navegador, mas mantém durante toda a navegação da sessão.

2. **Default = vendedor logado**:
   - Na primeira visita da sessão (quando não há estado salvo), se o usuário logado tiver role `vendedor` (e não for admin/gerente), pré-selecionar `filterVendedor = user.id`.
   - Usar `useAuth()` para obter `user` e `isAdminOrGerente`.
   - Admin/gerente continua começando em "Todos vendedores" (eles costumam querer visão global).
   - Se já existe valor salvo na sessão, respeitar o salvo (não sobrescrever).

3. **Botão "Limpar filtros"** (pequeno, ao lado dos selects) que reseta tudo para os defaults e limpa a chave do `sessionStorage` — para o caso de o usuário querer voltar à visão original sem recarregar.

Nenhuma mudança em backend, schema ou outros arquivos.
