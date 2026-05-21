## Remover obrigatoriedade de unidade/médico ao criar deal

Hoje o dialog "Novo deal" do Funil de Vendas exige que o vendedor vincule uma unidade de saúde **ou** um médico para conseguir salvar. Com o Modo Lite criando deals sem unidade, faz sentido alinhar o funil normal: deixar esses vínculos opcionais e permitir completar depois.

### Mudanças em `src/pages/FunilVendas.tsx` (componente `NewDealDialog`)

1. **Validação no `submit`** — remover o bloco que exige `unidade_id || medico_id` (linhas 584-587). Manter apenas a validação de `titulo` e `linha_id`.
2. **Botão "Criar deal"** — tirar `(!form.unidade_id && !form.medico_id)` do `disabled` (linha 732). Continuar desabilitando apenas quando faltar título ou linha.
3. **Texto auxiliar do form** — trocar o aviso "Vincule a uma unidade ou a um médico (pelo menos um)" (linha 642) por algo neutro tipo: *"Vincule a uma unidade e/ou médico (opcional — pode completar depois)."*
4. **Badge "pendente"** — quando salvar sem unidade, o deal já aparece com unidade vazia nas listagens existentes (`"—"` no funil). Sem mudança adicional necessária aqui.

### O que NÃO muda

- Schema do banco: `deals.unidade_id` e `medico_id` já são nullable, RLS já permite. Sem migração.
- Modo Lite: já funciona assim, segue igual.
- DealDetail, listagens, exportações: continuam tratando unidade/médico ausentes como hoje (já mostram `"—"`).
- Outros formulários (Discovery, Stakeholders etc.): fora do escopo.

### Arquivo

- **Editar**: `src/pages/FunilVendas.tsx` (3 ajustes pontuais no componente `NewDealDialog`).
