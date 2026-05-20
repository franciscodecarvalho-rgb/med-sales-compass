# Editar contatos no Discovery

Hoje, na aba **Pessoas** do Discovery, cada contato só pode ser **excluído**. Vamos adicionar **edição** dos mesmos campos usados na criação: nome, cargo, papel, telefone e email.

## Mudanças

**`src/pages/DiscoveryDetail.tsx`**

1. Adicionar botão de lápis (ícone `Pencil`) ao lado do botão de lixeira em cada card de contato (visível só quando `!readOnly`).
2. Reaproveitar o `Dialog` já existente de "Novo contato", transformando-o em dialog de **novo/editar**:
   - Estado novo: `contatoEdit` (id do contato em edição) ou `null`.
   - Título dinâmico: "Novo contato" / "Editar contato".
   - Ao clicar no lápis: preenche `contatoNovo` com os dados do contato e abre o dialog.
   - Botão de salvar: se `contatoEdit` é setado, faz `update`; senão `insert` (lógica atual).
   - Ao fechar/limpar: reseta `contatoEdit` para `null`.
3. Nova função `updateContato()` que faz `supabase.from("contatos").update({...}).eq("id", contatoEdit)` e recarrega a lista.

Sem mudanças em RLS — a policy de `UPDATE` em `contatos` já existe (mesmas regras de quem pode criar/excluir).

## Fora de escopo

- Edição de médicos vinculados (não foi pedido).
- Edição de contatos em outras telas (Unidade, Médico) — só Discovery.
