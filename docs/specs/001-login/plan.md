# 001 — Plano

## Caminho

A mudança entra pelo Auth do ADR-006 no `compose.yaml`, pelas tabelas `tenants` e `memberships` e pelo `createContext`; a regra mora em `src/server/services/account.ts`, e a autorização nos middlewares do tRPC (ADR-001, 2.3 e 2.7).

## Ordem

1. **Auth no dev**, como decidido no ADR-006, seção 2 e "Respostas e prova". Vem primeiro porque login, seed e E2E precisam dele de pé. A pessoa recria o volume de dev e preenche o `.env.local` com as chaves do `add-new-auth-keys.sh`.
2. **Base do E2E**: Playwright contra uma pilha efêmera no Testcontainers, com Postgres, Auth e gateway (ADR-006, item 5). Vem antes das telas porque é por ela que as tarefas seguintes se verificam; nasce provando o que já existe, a landing e o `health.check` sem sessão (CA-08). Espera os itens 12 e 14.
3. **Schema**: `tenants`, `memberships` e o lugar do nome. Vem antes do contexto e do seed, que leem essas tabelas. O DDL vai na resposta e PARA para aprovação (`rules/migration.md`, passo 1), com RLS, policy e o teste de bloqueio (`rules/tests.md`, passo 3). Espera os itens 2 e 4 da spec.
4. **Seed**: a `default` e a conta de Flávia Rocha. Vem antes das telas porque o E2E de Operações e o dev precisam dessa conta. Espera os itens 2, 6 e 12.
5. **Contexto e autorização**: os clientes do `@supabase/ssr`, a sessão no `createContext` e os três middlewares do ADR-001, 2.7. Vem antes do router e das telas, que dependem deles. O teste de procedimento monta a sessão à mão, sem Auth (ADR-006, seção 2). Espera os itens 1 e 9.
6. **Router `account`**: `enter`, `me` e `setName`, com teste por `createCaller` e o caso de isolamento por procedimento. Espera os itens 2, 6 e 11.
7. **`proxy.ts`**: renova a sessão em toda rota, menos os estáticos, e manda a `/login` só quem abre uma tela do produto sem sessão. A raiz `/` e o `/api/trpc` não são redirecionados; o procedimento protegido responde 401 (CA-09). A renovação se prova com token de validade curta (CA-17). Vem depois do contexto porque usa os mesmos clientes. Espera o item 9.
8. **Telas**: `/login`, a tela do link de convite, o header com "Sair" e as páginas provisórias. Vêm depois do contexto e do proxy, de que dependem. Esperam os itens 1, 6, 7, 8, 11, 12, 13 e 14.
9. **Cabeçalhos e CSP**, se o item 13 confirmar. Vêm depois das telas porque a conferência é feita nelas (`docs/layout.md`, seção 11).
10. **Primeiro administrador em produção**: só depois do ADR que o item 5 pede. O CA e a tarefa nascem com essa decisão.

## Risco

- **A landing, o `health.check` e o preview do AZ-09**, que um `proxy.ts` mal configurado tranca. Prova: o E2E do CA-08, que passa pelo proxy; os casos `az_04` chamam o procedimento direto e provam só que o novo `createContext` não quebrou o `health.check`.
- **Os testes de banco**, porque o schema `auth` do dev, migrado pelo Auth, difere do dos testes (ADR-006, seção 4). Prova: `pnpm test` aplica todas as migrations do zero.
- **O fluxo de migration**, porque uma FK para `auth.users` quebra o `prisma migrate dev` (item 2). Prova: o `migrate dev` da tarefa do schema roda sem erro.
- **As páginas existentes**, porque a CSP com nonce as torna dinâmicas, e algum primitivo do shadcn/ui pode escrever `style`. Prova: o console sem violação. Se houver, parar e levar ao ADR-002.
- **O `compose.yaml` em versões futuras do Envoy**, que avisa que opções da configuração oficial (`dns_refresh_rate`, `cors` no virtual host, `inline_code` do Lua) vão sair (ADR-006, "Respostas e prova"). Prova: o CA-15 a cada troca de tag.
- **A versão do Auth da produção**, que segue sem conferir (ADR-006, item 8). Prova: nenhuma, por enquanto.

## Depende de

- As respostas aos itens de "Não decidido" da spec, e os ADRs novos que os itens 1, 5, 6 e 13 podem pedir. Sem elas, a spec não passa de rascunho, e nenhuma tarefa começa (`rules/restrictions.md`, seção Ritmo).
- O ADR do provedor de e-mail transacional (item 10), para o convite em produção.
- A pessoa: recriar o volume de dev e preencher o `.env.local`; no painel de produção, configurar o SMTP, os modelos de e-mail, a URL do site, os redirects e as variáveis do Preview, e conferir a redefinição (item 10).
