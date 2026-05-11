## Pastas no Discovery

Organizar os itens de Discovery em **pastas compartilhadas** (visíveis para todos), exibidas como **abas no topo** da página `/discovery`.

### Comportamento

- Abas no topo: `Todas` · `Pasta A` · `Pasta B` · … · `+ Nova pasta`
- Clicar numa aba filtra a tabela pelos itens daquela pasta (combina com os filtros já existentes: status, vendedor, tipo, UF, busca).
- Cada Discovery pertence a **uma única pasta** (ou nenhuma → aparece em "Sem pasta" / "Todas").
- Na tela de detalhe (`DiscoveryDetail`) e na linha da tabela: seletor para mover o item de pasta.
- Admin/Gerente: pode criar, renomear, reordenar e excluir pastas. Vendedor: pode apenas mover seus itens entre pastas existentes.
- Ao excluir uma pasta, os Discoveries dela voltam para "Sem pasta" (não são apagados).

### Banco de dados

Nova tabela `discovery_pastas`:
- `nome` (text, único)
- `cor` (text, opcional — para destacar a aba)
- `ordem` (int, para ordenar as abas)
- `archived_at`, `created_at`, `updated_at`, `created_by`

Coluna nova em `discovery`:
- `pasta_id uuid` (nullable, sem FK rígida, seguindo o padrão do projeto)

RLS:
- `discovery_pastas`: SELECT para todos autenticados; INSERT/UPDATE/DELETE só para admin/gerente.
- `discovery.pasta_id`: já coberto pelas policies atuais de `discovery` (vendedor pode atualizar os próprios; admin/gerente atualiza qualquer um).

### Frontend

- `src/pages/Discovery.tsx`:
  - Carregar pastas (ordenadas por `ordem`).
  - Renderizar barra de abas (shadcn `Tabs`) acima dos filtros, com aba ativa controlando um novo filtro `pastaFilter`.
  - Botão `+` na barra (só admin/gerente) abre diálogo "Nova pasta".
  - Menu de contexto / botão de engrenagem por aba (admin/gerente): renomear, mudar cor, excluir, reordenar.
  - Incluir `pasta_id` no SELECT e aplicar `.eq('pasta_id', …)` ou `.is('pasta_id', null)` para "Sem pasta".
- `src/pages/DiscoveryDetail.tsx`: adicionar `Select` "Pasta" no cabeçalho/infos para mover o item.
- Opcional (fase 2): drag-and-drop de linhas da tabela para abas.

### Fora de escopo

- Pastas aninhadas, múltiplas pastas por item, permissões por pasta.
- Mudanças no LAB ou em outras páginas.
