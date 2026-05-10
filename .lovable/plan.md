## Alteração: busca de CNAE apenas por código

### Problema
Atualmente o filtro do CNAE busca tanto pelo `id` (código) quanto pelo `descricao` (nome da atividade). Isso gera muitos resultados irrelevantes quando o usuário digita termos genéricos do nome.

### Solução
Restringir a busca **exclusivamente ao código do CNAE** (`c.id`).

Arquivo: `src/pages/DiscoveryLab.tsx`

### Mudanças

1. **Remover a busca por descrição**
   Na função `cnaeFiltered` (linha ~199), alterar de:
   ```ts
   .filter((c) => c.id.includes(q) || c.descricao.toLowerCase().includes(q))
   ```
   para:
   ```ts
   .filter((c) => c.id.includes(q))
   ```

2. **Ajustar o placeholder do input**
   Alterar o `CommandInput` (linha ~609) de:
   ```
   "Buscar por código ou descrição..."
   ```
   para:
   ```
   "Digite o código CNAE..."
   ```

3. **Remover campo `search` pré-computado (se existir)**
   Como a busca será puramente pelo `id` (string simples, sem acentos), não há necessidade de índice normalizado. Manter apenas o `id` e `descricao` no tipo.

### Resultado esperado
- Digitar "86" → lista todos os CNAEs que começam com 86
- Digitar "8610-1" → encontra exatamente 8610-1/00
- Digitar "medic" ou "hospital" → **nenhum resultado** (busca é só por código)
- O filtro continua case-insensitive (`toLowerCase()` permanece no `q`, embora os códigos IBGE já sejam maiúsculos).

### Fora de escopo
- Layout, visual, popover, responsividade, outras funcionalidades do LAB.
