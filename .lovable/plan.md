# Permitir editar o valor total do deal manualmente

Hoje o `valor_total` na tela do deal é só leitura — ele é calculado automaticamente a partir dos equipamentos lançados. Quando o deal não tem equipamentos, o valor fica travado em R$ 0,00.

## Mudança

Tornar o "Valor total" no card do canto superior direito de `DealDetail.tsx` editável inline:

- Clique no valor (ou num ícone de lápis ao lado) abre um input numérico com o valor atual.
- Ao confirmar (Enter ou botão de check), faz `UPDATE deals SET valor_total = X WHERE id = ...`, recarrega o deal e mostra toast de sucesso.
- Esc/botão de cancelar volta sem salvar.
- Formatação BRL na exibição; input aceita número simples (ex.: `15000.50`).

## Interação com equipamentos

Mantém o comportamento atual: sempre que um equipamento é adicionado ou removido, o `valor_total` é recalculado automaticamente a partir da soma `quantidade × valor_unitário` (linhas 344-346 e equivalentes na remoção). Isso sobrescreve a edição manual — comportamento intencional, porque o valor manual só faz sentido enquanto não há itens lançados.

Para deixar isso claro para o usuário: mostrar uma legenda discreta abaixo do valor quando há equipamentos no deal — "Calculado a partir dos equipamentos". Quando não há equipamentos, mostrar o ícone de editar.

## Permissão

Só quem já pode editar o deal (admin, gerente, ou o vendedor dono — mesma regra do RLS `deals_update_sales`) consegue salvar. O input nem aparece para os demais.

## Arquivos

- `src/pages/DealDetail.tsx`: trocar o `<div>` do valor (linha 136) por um pequeno componente com modo view/edit usando `useState` local; reaproveitar `formatCurrency`.

Nenhuma migration necessária — `valor_total` já é coluna editável em `deals`.
