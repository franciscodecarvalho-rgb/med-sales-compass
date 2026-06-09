## Objetivo

Na página **Discovery** (`/discovery`), agrupar visualmente os itens da listagem por **cidade**, mantendo todos os filtros e funcionalidades atuais (pastas, busca, status, vendedor, tipo, UF).

## Como vai funcionar

Em vez de uma tabela única, a lista passa a ter cabeçalhos por cidade:

```text
📍 São Paulo - SP  (5)
   ─────────────────────────────────────────
   Nome           Tipo    Pasta    Vendedor    Status    Criado
   Hospital A     ...     ...      ...         ...       ...
   Clínica B      ...     ...      ...         ...       ...

📍 Campinas - SP  (2)
   ─────────────────────────────────────────
   ...

📍 Sem cidade  (1)
   ...
```

Detalhes:
- Ordenação: cidades em ordem alfabética; "Sem cidade" no final.
- Cada grupo mostra a contagem de itens.
- Dentro de cada grupo mantém a ordenação por data de criação (mais recente primeiro).
- A coluna "Cidade / UF" é removida da tabela (vira o cabeçalho do grupo) para evitar redundância.
- Filtros, busca, abas de pasta e ação de mover entre pastas continuam funcionando igual.
- Aplicado tanto quando filtro de vendedor é "Todos" quanto nos demais casos.

## Arquivos afetados

- `src/pages/Discovery.tsx` — substituir a tabela única pela listagem agrupada por cidade.

Nenhuma mudança de backend, schema ou outras páginas.
