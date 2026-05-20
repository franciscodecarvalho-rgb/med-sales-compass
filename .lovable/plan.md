# Gestão de permissões por papel

Hoje os papéis (admin, gerente, vendedor, pós-venda, assistente) têm regras "hardcoded" em RLS e em menus. Vamos centralizar isso em uma **matriz de permissões por papel** editável pelo admin, cobrindo: visibilidade de módulos, escopo de dados (lê tudo / edita os seus), e ações sensíveis (exportar, excluir).

## 1. Matriz de permissões (admin gerencia)

Nova tela em **Configurações → Permissões** (só admin). Tabela com papéis nas colunas e capacidades nas linhas, com checkboxes:

```text
Capacidade                       | Gerente | Vendedor | Pós-Venda | Assistente
Ver Discovery / Lab              |   ✓     |    ✓     |     -     |     -
Ver Funil de Vendas              |   ✓     |    ✓     |     -     |     ✓
Ver Funil de Manutenção          |   ✓     |    -     |     ✓     |     -
Ver Pós-Venda                    |   ✓     |    -     |     ✓     |     -
Ver Equipamentos                 |   ✓     |    -     |     ✓     |     -
Ver Faturamento                  |   ✓     |    -     |     -     |     ✓
Ver Médicos                      |   ✓     |    ✓     |     ✓     |     ✓
Ver Unidades                     |   ✓     |    ✓     |     ✓     |     ✓
Ver Painel Gerencial             |   ✓     |    -     |     -     |     -
Ver Stakeholders                 |   ✓     |    -     |     -     |     -
─────────────────────────────────|─────────|──────────|───────────|──────────
Ver dados de outros usuários*    |   ✓     |    ✓     |     ✓     |     ✓
Editar registros de outros       |   ✓     |    -     |     -     |     -
Exportar planilhas               |   ✓     |    -     |     ✓     |     ✓
Excluir / arquivar registros     |   ✓     |    -     |     -     |     -
```
*Admin sempre vê e edita tudo. Valores acima são os padrões propostos; admin pode mudar.

## 2. Modelo de dados

Nova tabela `role_permissions(role, permission, allowed)` com seed dos padrões acima. Função `has_permission(_user_id, _permission)` (security definer) que retorna `true` se algum dos papéis do usuário tem a permissão marcada — admin sempre `true`.

Permissões (slugs):
- Módulos: `view_discovery`, `view_funil_vendas`, `view_funil_manut`, `view_posvenda`, `view_equipamentos`, `view_faturamento`, `view_medicos`, `view_unidades`, `view_painel`, `view_stakeholders`
- Escopo: `view_all_records`, `edit_all_records`
- Ações: `export_data`, `delete_records`

## 3. Mudanças em RLS

Trocar a regra "lê só os seus" por **"lê tudo, edita só os seus"** para vendedor/assistente onde fizer sentido (atendendo à sua resposta):

- `deals.SELECT`: `is_admin_or_gerente(uid) OR has_permission(uid,'view_all_records') OR vendedor_id = uid` (com `view_all_records` ligado para vendedor por padrão, todos veem; o filtro "meus" passa a ser de UI).
- `deals.UPDATE`: mantém igual (já é "admin/gerente OU dono OU assistente em fechamento").
- `discovery.SELECT`: mesma lógica — leitura ampla por padrão.
- `discovery.UPDATE`: igual à atual.
- Demais tabelas mantêm RLS atual (já são `read_all` ou já restritas adequadamente).

Habilitar/desabilitar `view_all_records` no admin alterna efetivamente o comportamento sem nova migration.

## 4. Mudanças no frontend

### Hook `usePermission`
```ts
const { can } = usePermissions();
can("view_funil_vendas") // boolean
```
Carrega `role_permissions` uma vez por sessão; admin sempre retorna true.

### Menu (`AppLayout.tsx`)
Cada item passa a usar `can("view_X")` em vez de `roles=[...]` hardcoded. Itens ocultos quando sem permissão.

### Rotas (`App.tsx` / `ProtectedRoute.tsx`)
`ProtectedRoute` ganha prop `requirePermission?: string`. Rotas dos módulos passam a usar isso. Quem entra direto pela URL sem permissão → redireciona para `/`.

### Listagens (Funil, Discovery, Tarefas)
- Adicionar toggle "Meus / Todos" no topo quando `can("view_all_records")` for true e o usuário não for admin/gerente — default "Meus".
- Botões "Exportar" só aparecem se `can("export_data")`.
- Botões "Excluir / Arquivar" só aparecem se `can("delete_records")`.

### Tela de gestão
Nova página `src/pages/Permissoes.tsx` (link em Configurações, só admin): grid editável da matriz, salvando linha a linha em `role_permissions`.

## 5. Ordem de execução

1. Migration: tabela `role_permissions`, função `has_permission`, seed dos padrões, ajuste de RLS em `deals` e `discovery`.
2. Hook `usePermissions` + integração no `AppLayout`, `ProtectedRoute`, App routes.
3. Toggles "Meus/Todos" e botões condicionais em `FunilVendas`, `Discovery`, `Tarefas`, `FunilManutencao`, `Faturamento`.
4. Página `Permissoes.tsx` + link em Configurações.

## Pontos a confirmar

- **Vendedor exporta?** Proposta: não (só admin/gerente/pós-venda/assistente). Confirma?
- **Pós-Venda vê Médicos/Unidades?** Proposta: sim (já vê hoje via RLS `read_all`). Confirma?
- **Assistente vê Funil de Vendas inteiro?** Hoje só vê deals em fechamento/finalizado. Proposta: manter assim (não marcar `view_all_records` por padrão para ele). Confirma?
