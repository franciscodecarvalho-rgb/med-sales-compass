## Lista de Espera do LAB ("Segunda Chance")

Hoje os resultados do LAB existem só na memória da página: ao sair, atualizar ou rodar nova busca, tudo se perde. Vamos transformar a tabela de resultados numa **lista de espera persistente**, compartilhada entre todos os vendedores, ordenada por prioridade (score). Empresas só saem da lista de duas formas: enviadas ao Discovery, ou descartadas individualmente (com motivo opcional).

### Comportamento

- Toda empresa pesquisada no LAB é salva no banco automaticamente, com todos os dados enriquecidos (CNPJ, sócios, capital, Google, score etc.).
- O LAB ganha **duas abas** no topo:
  1. **Buscar** — formulário atual de CNAE + UF + Cidade + botão Pesquisar (fluxo idêntico ao de hoje, mas o resultado vai para a lista de espera ao invés de ficar só em tela).
  2. **Aguardando (N)** — a lista de espera completa, ordenada por score (maior → menor), com paginação. Eliminadas aparecem no fim, em vermelho.
- Ao rodar uma nova busca, os CNPJs já existentes na lista são **atualizados** (não duplicados); novos entram com o score recalculado.
- Todos os vendedores veem a mesma lista; admin/gerente também. (Pós-venda, técnico e assistente continuam sem acesso ao LAB.)
- **Descarte:** botão "Descartar" em cada linha → abre modal pedindo motivo (opcional, texto livre). Sem ação em lote para descarte. Eliminação fica registrada em `lab_eliminados` (já existe).
- **Enviar para Discovery:** mantém seleção em lote (checkbox) e botão verde flutuante. Ao enviar com sucesso, a empresa é **removida** da lista de espera (e fica registrada no Discovery normalmente).
- Detalhes (modal "Eye") e configurações continuam iguais.

### Mudanças no banco

Nova tabela `lab_pendentes` para guardar a lista de espera:

- `cnpj` (PK, único — evita duplicidade entre buscas)
- `razao_social`, `nome_fantasia`, `cidade`, `uf`, `endereco`
- `cnae_codigo`, `cnae_descricao`, `capital_social`, `data_abertura`, `porte`
- `email`, `telefone`, `site`
- `socios` (jsonb — lista com nome, qualificação, entrada, flag médico)
- `rating`, `reviews` (Google)
- `score` (numérico, calculado no momento da inserção, usado para ordenação no servidor)
- `pesquisado_por` (uuid do vendedor que rodou a busca; informativo)
- `pesquisado_em`, `atualizado_em`

RLS:
- SELECT: qualquer usuário autenticado com papel `admin`, `gerente` ou `vendedor`.
- INSERT/UPDATE/DELETE: mesmos papéis. (Sem restrição por dono — lista compartilhada.)

A tabela `lab_eliminados` já existe e continua sendo usada como histórico de descartes; ao descartar, removemos da `lab_pendentes` e gravamos em `lab_eliminados`.

### Mudanças no frontend (`src/pages/DiscoveryLab.tsx`)

- Adicionar `Tabs` (Buscar / Aguardando).
- Após `pesquisar()`, fazer `upsert` em `lab_pendentes` com cada resultado (já com score).
- Aba "Aguardando" carrega `lab_pendentes` direto do banco (não depende de busca em tela), ordenado por `score desc`.
- Renderizar a tabela de espera reaproveitando o componente atual (linhas, modal de detalhes, checkbox, score badge).
- Botão "Descartar" por linha → modal com textarea de motivo opcional → grava em `lab_eliminados` + remove de `lab_pendentes`.
- Botão "Enviar para Discovery" (lote) → após sucesso, remove os CNPJs enviados de `lab_pendentes`.
- Remover ação de descarte em lote.

### Fora de escopo (não muda)

- Edge function `lab-search` continua igual.
- Configurações do LAB (limite mensal, contador de chamadas) continuam iguais.
- Discovery em si não muda.
