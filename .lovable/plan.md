## Modo Lite — Captura rápida de leads em feiras

Página focada em mobile para criar deals em segundos durante eventos, mostrando só os leads do vendedor logado.

### Rota e acesso
- Nova rota `/lite` (página `src/pages/Lite.tsx`).
- Item no sidebar **"Modo Lite"** (ícone `Zap`), visível para qualquer usuário autenticado, logo abaixo de "Dashboard".
- Mesma URL serve como link direto para salvar no celular (PWA-style).

### O que faz
- Lista somente os deals onde `vendedor_id = auth.uid()` criados via Lite, ordenados do mais recente para o mais antigo.
- Cada card mostra: título (nome do lead), telefone, observação curta, badge "pendente unidade" quando `unidade_id IS NULL`, data relativa ("há 5 min").
- Toque no card → abre `/deals/:id` (página existente) para completar unidade/médico depois, no escritório.
- Botão **"+ Novo lead"** fixo no topo (grande, full-width no mobile) abre dialog.

### Form rápido (dialog)
Três campos, foco em velocidade:
1. **Nome do lead*** (vira `deals.titulo`) — autofocus
2. **Telefone** — máscara BR
3. **Observação** — textarea curta (3 linhas)

Mais um seletor compacto que aparece só na primeira vez (depois fica salvo em `localStorage`):
- **Linha de produto*** — obrigatório no schema; vendedor escolhe uma vez e a página memoriza.

Botão **"Salvar lead"** com loading. Após salvar: toast, fecha dialog, limpa form, recarrega lista. O dialog não muda de tela — fica pronto pra próximo lead (caso muito comum em feira).

### Como grava no banco
Insert em `deals` com:
- `titulo` = nome digitado
- `vendedor_id` = `auth.uid()`
- `linha_id` = linha escolhida (memorizada)
- `estagio` = `'prospeccao'`, `resultado` = `'em_andamento'`
- `unidade_id` = `NULL` (pendente — o usuário liga depois)
- `observacoes` = `"📱 Lead Modo Lite\nTel: {telefone}\n\n{observacao}"` (assim o telefone fica buscável e visível no DealDetail sem precisar de coluna nova)

Nenhuma mudança de schema é necessária — `deals.unidade_id` já é nullable e a policy `deals_insert_sales` já permite vendedor inserir o próprio deal.

### Filtro da listagem
- Query: `deals` onde `vendedor_id = user.id`, `archived_at IS NULL`, ordenado por `created_at desc`, limite 50.
- Filtro de busca por título no topo (input simples).
- Badge "pendente unidade" quando `unidade_id IS NULL` para o vendedor saber quais ainda precisa completar.

### UI
- Layout mobile-first (max-w-md centralizado em desktop).
- Header sticky com título "Modo Lite ⚡", contador "X leads hoje".
- Botão "+ Novo lead" gradiente primary, alto (h-14), ícone Plus grande.
- Cards densos, tap-friendly (min-h-16).
- Sem sidebar/breadcrumbs visuais pesados — manter o foco.

### Arquivos
- **Criar**: `src/pages/Lite.tsx`
- **Editar**: `src/App.tsx` (rota `/lite` dentro de `<ProtectedRoute>` + `<AppLayout>`)
- **Editar**: `src/components/AppLayout.tsx` (item "Modo Lite" no menu)

Sem migrações, sem novas policies, sem alterações em telas existentes.