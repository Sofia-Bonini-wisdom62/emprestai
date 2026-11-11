# 001 — Tarefas

Nenhuma tarefa começa antes de a spec sair de rascunho e o plano ser aprovado. Cada tarefa diz o item de "Não decidido" da spec que espera e os pacotes que instala; a forma de pedir a instalação é o item 14.

- [ ] T-01 — Auth e gateway no `compose.yaml`, como no ADR-006, mais as variáveis novas no `.env.example` e a correção das linhas `onde:` que o ADR-006 desatualizou
      CA: CA-15
      Verifica: `docker compose --env-file .env.local up -d --wait` sobe os três serviços saudáveis; pelo gateway, `/auth/v1/health` responde 200 com a chave publishable e 401 sem chave
- [ ] T-02 — Base do E2E: Playwright contra a pilha efêmera do Testcontainers (Postgres, Auth e gateway) e o script `test:e2e`. Instala `@playwright/test` e `testcontainers`. Espera os itens 12 e 14
      CA: CA-08
      Verifica: `pnpm test:e2e` com o caso `ca_08` na parte que já existe (landing e `health.check` sem sessão); `docker ps` sem contêiner da pilha depois da rodada
- [ ] T-03 — Migration de `tenants` e `memberships` (e do nome, conforme o item 2), com RLS, policy e teste de bloqueio. Espera os itens 2 e 4
      CA: CA-14
      Verifica: o DDL aprovado na resposta antes de gerar; `pnpm test` com os casos `ca_14` de policy (`SET LOCAL ROLE`, controle sem RLS, `pg_policies`); `pnpm prisma migrate dev` sem erro
- [ ] T-04 — Seed com a `default` e a conta de Flávia Rocha, com nome, pela API de admin do Auth. Espera os itens 2, 6 e 12
      CA: CA-13
      Verifica: o caso `ca_13` roda o seed duas vezes na pilha efêmera e conta as linhas pelo Prisma
- [ ] T-05 — Clientes do `@supabase/ssr`, sessão no `createContext` e os middlewares `protectedProcedure`, `tenantProcedure` e `adminProcedure`. Instala `@supabase/ssr` e `@supabase/supabase-js`. Espera os itens 1, 9 e 14
      CA: CA-10
      Verifica: `pnpm test` com `ca_10` via `createCaller`, com um procedimento de teste montado com `adminProcedure`; os casos `az_04` continuam passando com o novo `createContext`
- [ ] T-06 — Router e service `account`: `enter`, `me` e `setName`. Espera os itens 2, 6 e 11
      CA: CA-05, CA-06, CA-09, CA-14
      Verifica: `pnpm test` com `ca_05` (um vínculo só depois de dois `enter`), `ca_06` (nome vazio e só com espaços recusados), `ca_09` (`account.me` sem sessão) e `ca_14` em cada procedimento (duas áreas; `tenantId` no input recusado); `pnpm test:e2e` com `ca_09` pela rota HTTP (401 sem dado)
- [ ] T-07 — `proxy.ts`: renova a sessão em toda rota, menos os estáticos, e manda a `/login` só quem abre tela do produto sem sessão. Espera o item 9
      CA: CA-08, CA-17
      Verifica: `pnpm test:e2e` com `ca_08` completo e `ca_17`, numa pilha com validade curta do token de acesso
- [ ] T-08 — Tela `/login` com shadcn/ui, entrar e sair. Instala, depois de mostrar a lista do que o CLI cria, os primitivos do shadcn/ui, `lucide-react`, `react-hook-form` e `@hookform/resolvers`. Espera os itens 1, 11, 12 e 14
      CA: CA-01, CA-02, CA-03, CA-04, CA-12
      Verifica: `pnpm test:e2e` com `ca_03` e `ca_04`, e com `ca_01` e `ca_02` só no destino pela URL (o header e as páginas vêm na T-10); CA-12 no navegador no desktop e em 375px, com captura de tela
- [ ] T-09 — Tela do link de convite. Espera os itens 6, 7 e 11
      CA: CA-06, CA-07
      Verifica: `pnpm test:e2e` com `ca_07` (convite por `generateLink` até `/catalog`) e `ca_06` (conta sem nome vai à tela antes de qualquer outra; nome vazio mostra a mensagem)
- [ ] T-10 — Header com o nome e "Sair", e as páginas provisórias de `/catalog` e `/operations/loans`. Espera os itens 8, 11 e 13
      CA: CA-01, CA-02, CA-11
      Verifica: `pnpm test:e2e` com `ca_01` e `ca_02` completos (header com o nome; `ca_02` com a conta do seed) e `ca_11`
- [ ] T-11 — Cabeçalhos HTTP e CSP sem `unsafe-inline`, com nonce. Espera o item 13
      CA: CA-16
      Verifica: `pnpm test:e2e` com `ca_16` (o cabeçalho `Content-Security-Policy` na resposta de `/login` e o console sem violação em `/login` e no header)
