# 001 — Tarefas

Nenhuma tarefa começa antes de a spec e o plano serem aprovados. Os pacotes de cada tarefa e as versões estão na tabela do plano.

- [ ] T-01 — Auth e gateway no `compose.yaml`, como no ADR-006, mais as variáveis novas no `.env.example` e a correção das linhas `onde:` que o ADR-006 e o RN-34 desatualizaram
      CA: CA-15
      Verifica: `docker compose --env-file .env.local up -d --wait` sobe os três serviços saudáveis; pelo gateway, `/auth/v1/health` responde 200 com a chave publishable e 401 sem chave
- [x] T-02 — Base do E2E: Playwright contra a pilha efêmera do Testcontainers (Postgres, Auth e gateway) e o script `test:e2e`. Instala `@playwright/test` e `testcontainers`
      CA: CA-08
      Verifica: `pnpm test:e2e` com o caso `ca_08` na parte que já existe (landing e `health.check` sem sessão); `docker ps` sem contêiner da pilha depois da rodada
- [x] T-03 — Migration de `tenants`, `memberships` e `profiles`, sem FK para `auth.users`, com RLS, policy e teste de bloqueio
      CA: CA-14
      Verifica: o DDL aprovado na resposta antes de gerar; `pnpm test` com os casos `ca_14` de policy (`SET LOCAL ROLE`, controle sem RLS, `pg_policies`); `pnpm prisma migrate dev` sem erro
- [ ] T-04 — Seed com a `default` e a conta de Flávia Rocha, com nome, pela API de admin do Auth
      CA: CA-13
      Verifica: o caso `ca_13` roda o seed duas vezes na pilha efêmera e conta as linhas pelo Prisma
- [x] T-05 — Cliente de servidor do `@supabase/ssr`, sessão no `createContext` com `getUser()` e os middlewares `protectedProcedure`, `tenantProcedure` e `adminProcedure`. Instala `@supabase/ssr` e `@supabase/supabase-js`
      CA: CA-10
      Verifica: `pnpm test` com `ca_10` via `createCaller`, com um procedimento de teste montado com `adminProcedure`; os casos `az_04` continuam passando com o novo `createContext`
- [x] T-06 — Rate limit: migration de `rate_limits`, com RLS e policy, e o service que conta por IP e por e-mail
      CA: CA-14, CA-22
      Verifica: o DDL aprovado na resposta antes de gerar; `pnpm test` com `ca_22` no service e `ca_14` na policy de `rate_limits`
- [ ] T-07 — Routers `auth` (`signIn`, `signOut`, `requestPasswordReset`) e `account` (`me`, `setup`), e o Route Handler `/auth/confirm`
      CA: CA-05, CA-06, CA-09, CA-14, CA-21, CA-22, CA-28
      Verifica: `pnpm test` com `ca_05` no service da primeira entrada (duas chamadas, um vínculo), `ca_06` (nome vazio, só com espaços e com 81 caracteres recusados), `ca_09` e `ca_14` em `account.me` e `account.setup` via `createCaller` (duas áreas; `tenantId` no input recusado); `pnpm test:e2e` com `ca_05` e `ca_14` no `auth.signIn` e no `auth.signOut`, `ca_09` pela rota HTTP, `ca_21` (bloqueio no Auth com sessão aberta), `ca_22` no `auth.signIn` e no `auth.requestPasswordReset`, e `ca_28` (a mesma resposta para e-mail com e sem conta)
- [ ] T-08 — `proxy.ts` com `getClaims()`: renova a sessão e manda a `/login` quem abre tela do produto sem sessão, sem ler o banco
      CA: CA-08, CA-17
      Verifica: `pnpm test:e2e` com `ca_08` completo e `ca_17`, numa pilha com validade curta do token de acesso
- [ ] T-09 — Tela `/login` com shadcn/ui. Instala os primitivos do shadcn/ui pelo CLI, depois de mostrar a lista do que ele cria, `lucide-react`, `react-hook-form` e `@hookform/resolvers`
      CA: CA-01, CA-02, CA-03, CA-04, CA-12, CA-19, CA-22, CA-23
      Verifica: `pnpm test:e2e` com `ca_03`, `ca_04`, `ca_19`, a mensagem de `ca_22` na tela, `ca_23` com o app sem as variáveis do Supabase, e `ca_01` e `ca_02` só no destino pela URL (o header e as páginas vêm na T-11); CA-12 no navegador em 1024px e 375px, com captura de tela
- [ ] T-10 — Telas `/account/setup`, com o link "Sair", e `/forgot-password`, as duas na moldura do login
      CA: CA-06, CA-07, CA-20, CA-25, CA-26, CA-27, CA-28
      Verifica: `pnpm test:e2e` com `ca_07` (convite por `generateLink` até `/catalog`), `ca_06` (conta sem nome vai à tela antes de qualquer outra; nome vazio mostra "Informe seu nome."), `ca_25` (link usado e link vencido, com a validade reduzida na pilha), `ca_26` (senha curta), `ca_27` ("Sair"), `ca_20` (do "Esqueci minha senha" à senha nova) e `ca_28` na tela
- [ ] T-11 — Header com o nome e "Sair", e as páginas provisórias de `/catalog` e `/operations/loans`, esta com o layout das telas de Operações que leva o Colaborador a `/catalog`
      CA: CA-01, CA-02, CA-11, CA-18, CA-21
      Verifica: `pnpm test:e2e` com `ca_01` e `ca_02` completos (header com o nome; `ca_02` com a conta do seed), `ca_11`, `ca_18` e a ida a `/login` de `ca_21`
- [ ] T-12 — Cabeçalhos HTTP e CSP sem `unsafe-inline`, com nonce
      CA: CA-16
      Verifica: `pnpm test:e2e` com `ca_16` (o cabeçalho na resposta de `/login` e o console sem violação em `/login`, `/account/setup` e no header)
- [ ] T-13 — Script e passo do primeiro administrador no workflow de produção (ADR-009). Espera a aprovação para editar `.github/workflows/`
      CA: CA-24
      Verifica: `pnpm test` com `ca_24`, que roda o script duas vezes contra o Postgres do Testcontainers com uma linha fictícia em `auth.users` e uma vez com e-mail inexistente; a rodada real em produção é conferida pela pessoa
