# 001 — Plano

## Caminho

A mudança entra pelo Auth do ADR-006 no `compose.yaml`, pelas tabelas `tenants`, `memberships`, `profiles` e `rate_limits` e pelo `createContext`; a regra mora em `src/server/services/`, e a autorização nos middlewares do tRPC (ADR-001, 2.3 e 2.7).

## Ordem

1. **Auth no dev**, como o ADR-006 decidiu, com o link do e-mail valendo 24 horas, como na produção (RN-36). Vem primeiro porque login, seed e E2E precisam dele de pé. A pessoa recria o volume de dev e preenche o `.env.local` com as chaves do `add-new-auth-keys.sh`.
2. **Base do E2E**: Playwright contra uma pilha efêmera no Testcontainers, com Postgres, Auth e gateway (ADR-006, item 5). Vem antes das telas porque é por ela que as tarefas seguintes se verificam; nasce provando o que já existe, a landing e o `health.check` sem sessão.
3. **Schema**: `tenants`, `memberships` e `profiles`, sem FK para `auth.users`, com RLS e policy sem funções de `auth` (RN-17 a RN-19). Vem antes do contexto e do seed, que leem essas tabelas. O DDL vai na resposta e PARA para aprovação (`rules/migration.md`, passo 1).
4. **Seed**: a `default` e a conta de Flávia Rocha. Vem antes das telas porque o E2E de Operações e o dev precisam dessa conta. Lê a chave local pela exceção de `rules/secrets.md`.
5. **Contexto e autorização**: o cliente de servidor do `@supabase/ssr`, a sessão no `createContext` com `getUser()` e os três middlewares do ADR-001, 2.7. Vem antes dos routers, que dependem deles. `session`, `tenantId` e `role` são opcionais no `Context`, e ausente vale o mesmo que `null`, chamada sem sessão, para que os casos `az_04`, que montam `createCaller({ db })`, não mudem (revisão da T-05).
6. **Rate limit**: a tabela `rate_limits`, com o DDL para aprovação, e o service que conta por IP e por e-mail (ADR-001, 2.10). Vem antes do `auth.signIn`, que o chama primeiro.
7. **Routers e confirmação**: `auth.signIn`, `auth.signOut`, `auth.requestPasswordReset`, `account.me`, `account.setup` e o Route Handler `/auth/confirm`. Vem antes do proxy e das telas, que os chamam. O vínculo da primeira entrada (RN-13) fica num service chamado pelo `auth.signIn` e pelo `account.setup`, testável por `createCaller` sem Auth (ADR-006, seção 2); o que entra no Auth se prova no E2E.
8. **`proxy.ts`**, com `getClaims()`: renova a sessão em toda rota, menos os estáticos, e manda a `/login` quem abre tela do produto sem sessão. A raiz `/` e o `/api/trpc` não são redirecionados. O proxy não lê o banco: o RN-24 acontece no layout das telas de Operações, que lê o papel por `account.me` e leva o Colaborador a `/catalog`. Com ele entra o limite de 3 s do RN-48, no `proxy.ts` e no cliente de servidor de `src/server/supabase.ts`, da T-05: com o Auth inalcançável e o cookie vencido, a renovação do `supabase-js` tenta de novo por até cerca de 30 s, e uma chamada levou 25,7 s na T-05.
9. **Telas**: `/login`, `/account/setup`, `/forgot-password`, o header com "Sair" e as páginas provisórias.
10. **Cabeçalhos e CSP**, conferidos nas telas do passo 9 (`docs/layout.md`, seção 11).
11. **Primeiro administrador em produção**: o script e o passo do workflow do ADR-009, só depois de ele ser aceito e de a pessoa aprovar a mudança em `.github/workflows/`.

Dependências, com a versão exata conferida no npm em 2026-11-11. A aprovação deste plano vale como o "pedir antes" de `rules/operacao.md` para elas (decisão de 2026-11-11), e cada tarefa diz quais instala:

| Pacote | Versão | Decidido em | Tarefa |
|---|---|---|---|
| `@playwright/test` | 1.65.0 | ADR-001, 2.8 | T-02 |
| `testcontainers` | 12.2.1, a mesma do `@testcontainers/postgresql` | ADR-006, item 5 | T-02 |
| `@supabase/ssr` | 0.12.7 | ADR-001, 2.7 | T-05 |
| `@supabase/supabase-js` | 2.119.0, dependência obrigatória (peer `^2.114.0`) do `@supabase/ssr` | decisão de 2026-11-11 | T-05 |
| `lucide-react` | 1.71.0, e não a 1.72.0 conferida antes: a 1.72.0 saiu em 2026-11-11 e não passa da idade mínima de publicação do pnpm | ADR-002; decisão de 2026-11-11, na T-09 | T-09 |
| `react-hook-form` | 7.91.0, e não a 7.92.0 conferida antes, pelo mesmo motivo | ADR-001, 2.2; decisão de 2026-11-11, na T-09 | T-09 |
| `@hookform/resolvers` | 7.0.5 | ADR-001, 2.2 | T-09 |
| CLI `shadcn` | 4.23.0, por `pnpm dlx`, sem entrar no `package.json` | ADR-002 | T-09 |
| `class-variance-authority` | 0.7.1, que o `init` do shadcn/ui acrescenta | decisão de 2026-11-11, na T-09 | T-09 |
| `cn` | 0.5.2, do repositório `shadcn-ui/cn`, no lugar de `clsx` e `tailwind-merge` | decisão de 2026-11-11, na T-09 | T-09 |
| `radix-ui` | 1.8.1, a base dos primitivos (`init -b radix`) | decisão de 2026-11-11, na T-09 | T-09 |
| `tw-animate-css` | 1.4.0, que o `init` do shadcn/ui acrescenta | decisão de 2026-11-11, na T-09 | T-09 |

O `init` também quer o pacote `shadcn` como dependência, só pelo CSS que o `globals.css` importa. Esse CSS está copiado em `src/app/shadcn.css`, com a licença MIT e a versão de origem, e o pacote não entra (decisão de 2026-11-11, na T-09).

O CLI do shadcn/ui mostra antes a lista do que vai criar e das dependências que acrescenta. A T-09 cola essa lista na resposta, com a versão exata de cada dependência que não está na tabela, e PARA para aprovação antes de rodar (`rules/restrictions.md`, Escopo; `rules/operacao.md`).

## Risco

- **A landing, o `health.check` e o preview do AZ-09**, que um `proxy.ts` mal configurado tranca. Prova: o E2E do CA-08, que passa pelo proxy; os casos `az_04` provam só que o novo `createContext` não quebrou o `health.check`.
- **Os testes de banco**, porque o schema `auth` do dev, migrado pelo Auth, difere do dos testes (ADR-006, seção 4). Sem FK nem função de `auth` (RN-18 e RN-19), as migrations não dependem dele. Prova: `pnpm test` aplica todas as migrations do zero.
- **As páginas existentes**, porque a CSP com nonce as torna dinâmicas, e algum primitivo do shadcn/ui pode escrever `style`. Prova: o console sem violação. Se houver, parar e levar ao ADR-002.
- **O tempo de cada chamada tRPC**, porque o `getUser()` vai ao Auth a cada chamada (custo anotado na resposta 32), e as functions ficam nos Estados Unidos, longe do Supabase em São Paulo (ADR-001, 2.9). Prova: medir na produção depois do primeiro deploy.
- **O `compose.yaml` em versões futuras do Envoy**, que avisa que opções da configuração oficial vão sair (ADR-006, "Respostas e prova"). Prova: o CA-15 a cada troca de tag.
- **A conta de quem pede redefinição**, que a mensagem neutra (RN-42) esconde no texto, mas que o tempo de resposta pode revelar, se o Auth demorar mais para uma conta que existe. Prova: o CA-28 confere a resposta igual; o tempo não é medido.
- **A versão do Auth da produção**, que segue sem conferir (ADR-006, item 8), enquanto a do dev precisa acompanhá-la. Prova: nenhuma, por enquanto.

## Depende de

- O ADR-008 aceito, depois da conferência da seção 7 dele, para o convite chegar por e-mail em produção. Ele não segura a aprovação da spec (decisão de 2026-11-11).
- A pessoa:
  - recriar o volume de dev e preencher o `.env.local`;
  - no painel de produção, configurar o SMTP do ADR-008, os modelos dos e-mails de convite (RN-35) e de redefinição (RN-44), a validade de 24 horas do link (RN-36), a Site URL e os redirects (RN-37);
  - tirar do Preview as variáveis do Supabase (RN-34);
  - criar o secret `FIRST_ADMIN_EMAIL` no Actions;
