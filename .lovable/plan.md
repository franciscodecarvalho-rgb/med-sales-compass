Corrigir a tela em branco causada pela tradução automática do navegador quando a interface já está em português.

### Problema
O `index.html` declara `<html lang="en">`. Como a interface do CRM já está em português, navegadores (Chrome, Edge, etc.) oferecem traduzir a página para PT. Quando o usuário aceita, o tradutor modifica o DOM diretamente, quebrando a reconciliação do React e causando tela em branco.

### Solução
Editar `index.html` com 3 mudanças simples:

1. **Alterar idioma declarado** — mudar `<html lang="en">` para `<html lang="pt-BR" translate="no">`.
2. **Bloquear tradução** — adicionar `<meta name="google" content="notranslate">` no `<head>` como camada extra.
3. **Atualizar meta tags** — traduzir `description`, `og:description` e `twitter:description` para português para manter consistência com o idioma real da página.

### Arquivo afetado
- `index.html`

Nenhuma outra alteração no React, rotas, backend ou estilos será necessária.