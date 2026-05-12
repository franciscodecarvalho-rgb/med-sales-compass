## Migrar este projeto para o seu próprio Supabase

Você terá um app idêntico, mas rodando 100% no **seu** Supabase. Sem dados antigos — você cadastra tudo do zero. Faremos passo a passo.

### O que vai mudar
- O app vai apontar para o **seu** projeto Supabase (sua URL e suas chaves).
- O Lovable Cloud deste projeto será **desativado no final** (atenção: isso é permanente e não dá pra desfazer neste projeto — por isso só fazemos depois de validar tudo).
- Estrutura do banco, regras de segurança (RLS), funções, triggers, edge functions e bucket de storage serão recriados no seu Supabase.
- Usuários: ninguém é migrado. Você cria o primeiro admin do zero.

---

### Passo a passo

**1. Coletar dados do seu Supabase** *(você faz, me manda os valores)*
No painel do seu projeto em supabase.com:
- `Project Settings → API`: anote **Project URL**, **anon public key** e **service_role key** (essa é secreta).
- `Project Settings → Database`: anote a **Connection string** (modo "URI") e o **Project Ref** (o código no início da URL).

**2. Recriar a estrutura do banco** *(eu preparo, você roda)*
- Eu vou gerar **um único arquivo SQL consolidado** (`migration_completa.sql`) juntando todas as 19 migrações deste projeto: tabelas, enums, RLS, funções e triggers.
- Você abre o **SQL Editor** do seu Supabase, cola o conteúdo e clica em **Run**. Pronto — banco com a mesma estrutura, vazio.

**3. Configurar o Auth** *(você faz no painel)*
- `Authentication → Providers`: ativar **Email** (com "Confirm email" ligado) e **Google** (cole Client ID/Secret se quiser login Google).
- `Authentication → URL Configuration`: colocar a URL do app (preview e produção) em "Site URL" e "Redirect URLs".

**4. Criar o bucket de Storage** *(você faz no painel)*
- `Storage → New bucket`: nome `posvenda-pdfs`, **privado**.

**5. Subir as Edge Functions** *(eu te dou o passo a passo com Supabase CLI)*
São 4 funções: `admin-create-user`, `admin-update-password`, `discovery-import-ai`, `lab-search`.
- Você instala o Supabase CLI (te passo o comando para Windows/Mac).
- Faz login (`supabase login`) e linka seu projeto (`supabase link --project-ref SEU_REF`).
- Roda `supabase functions deploy admin-create-user` (e os outros 3).

**6. Cadastrar os Secrets das funções** *(você faz no painel)*
Em `Edge Functions → Manage secrets`, adicionar:
- `CNPJA_API_KEY` (a sua chave do CNPJa)
- `GOOGLE_PLACES_API_KEY` (sua chave do Google Places)
- `LOVABLE_API_KEY` — esta é do Lovable AI; **não vai funcionar fora do Lovable Cloud**. A função `discovery-import-ai` usa IA. Te explico abaixo na seção "Detalhes técnicos".

**7. Apontar o app para o seu Supabase** *(eu faço no código)*
- Trocar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID` no `.env` para os do seu projeto.
- Ajustar `src/integrations/supabase/client.ts` se necessário.
- Regenerar `src/integrations/supabase/types.ts` para refletir o seu banco.

**8. Criar o primeiro admin** *(você faz no painel)*
- `Authentication → Users → Add user`: criar com seu e-mail e senha.
- No `SQL Editor`, rodar um comando que eu vou te passar para dar papel `admin` para esse usuário.

**9. Testar tudo no preview** *(juntos)*
- Login, criar unidade, criar deal, criar discovery, criar tarefa, busca no Lab, etc.
- Se algo falhar, ajusto antes de seguir.

**10. Desativar o Lovable Cloud** *(você faz no Lovable)*
- Só depois de validar tudo. Em `Connectors → Lovable Cloud → Disable Cloud`.
- ⚠️ Permanente neste projeto.

---

### Detalhes técnicos

- **Lovable AI (`LOVABLE_API_KEY`)**: a função `discovery-import-ai` usa o gateway de IA do Lovable, que só existe dentro do Lovable Cloud. Fora dele, ela vai parar de funcionar. Opções: (a) trocar por OpenAI/Gemini direto, com sua própria chave (eu adapto o código), ou (b) deixar essa função inativa e cadastrar Discoveries manualmente. Decidimos isso quando chegarmos no passo 6.
- **`config.toml`**: vamos manter as funções com `verify_jwt = false` onde já estão; as funções admin validam o JWT internamente.
- **Realtime**: não há nenhum canal `realtime` ativo no app, então não precisa publicar tabelas.
- **types.ts**: regenero com `supabase gen types typescript --project-id SEU_REF`.

---

### O que eu preciso de você para começar

Quando aprovar este plano e clicar em **Implementar plano**, eu já gero o **arquivo SQL consolidado** (passo 2) e te passo as instruções claras do passo 1 (o que copiar do painel do Supabase). A partir daí seguimos um passo de cada vez, no seu ritmo.