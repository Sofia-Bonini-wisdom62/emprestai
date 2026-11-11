# AGENTS.md — emprestai

Síntese operacional para qualquer agente que trabalhe neste repositório. Leia inteiro antes de mexer em qualquer coisa.

## 1. O produto

O emprestai substitui a planilha de controle de equipamentos internos (notebooks, monitores, cabos, câmeras).
Colaboradores pedem e devolvem itens; Operações cadastra equipamentos e acompanha os empréstimos em aberto. Projeto de disciplina da turma B, sem uso comercial.

Critério de sucesso ([`docs/PRD.md`](docs/PRD.md)): Operações consegue abandonar a planilha depois de duas semanas de uso.

## 2. Onde olhar

| Documento | Papel |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Negócio: problema, personas, escopo da v1. Não é spec, não descreve tela nem comportamento de campo |
| [`docs/perguntas-prd.md`](docs/perguntas-prd.md) | Lacunas do PRD. As abertas não são suas para decidir; as já respondidas pelo time valem até virar RN-xx na spec |
| [`docs/adr/`](docs/adr/) | Decisões técnicas e o porquê de cada uma; quais valem e como se leem juntos: seção 5. ADR aceito não se edita: correção vira ADR novo |
| [`docs/layout.md`](docs/layout.md) | Aparência: tokens, tipografia, componentes e telas. Guarda os valores; o porquê está no ADR-002 |
| [`docs/specs/`](docs/specs/) | Spec, plano e tarefas de cada funcionalidade. Formato e critérios (CA-xx) em [`docs/specs/README.md`](docs/specs/README.md) |
| [`docs/andar-zero.md`](docs/andar-zero.md) e [`docs/plan-andar-zero.md`](docs/plan-andar-zero.md) | Os critérios (AZ-xx) do esqueleto que prova a stack, que não é spec, e o plano de tarefas dele |
| [`rules/restrictions.md`](rules/restrictions.md), [`rules/checks.md`](rules/checks.md) e [`rules/operacao.md`](rules/operacao.md) | Proibições, procedimento de fim de tarefa e quem autoriza o quê. Valem sempre, e cada assunto mora num só deles |

Demais rules de `rules/`, por gatilho:

| Rule | Dispara quando |
|---|---|
| `migration.md` | Você vai mudar `prisma/schema.prisma` ou criar migration |
| `secrets.md` | Variável de ambiente, chave ou fronteira servidor/cliente |
| `tests.md` | Você vai escrever, alterar ou rodar teste |
| `spec-flow.md` | Começo de funcionalidade: do PRD à spec, ao plano e às tarefas |
| `handoff.md` | Fim de sessão, passar o bastão para a próxima |

## 3. Precedência

O que pesa mais, nesta ordem:

1. Isolamento de tenant e segurança — sempre prevalece.
2. `docs/adr/` para decisão técnica.
3. `docs/PRD.md` para regra de negócio.
4. A spec da funcionalidade em `docs/specs/` para comportamento.
5. `docs/layout.md` para aparência.
6. Este arquivo, como síntese operacional, por último.

A ordem diz onde procurar e o que pesa mais; ela não autoriza escolher. Se dois documentos discordarem, pare e avise, sem aplicar nenhum dos dois por conta própria, mesmo quando um deles está acima na lista. Até a pessoa decidir, isolamento de tenant e segurança continuam valendo.

Se não estiver escrito em lugar nenhum, pergunte, não decida.

## 4. Regras de negócio e escopo da v1

Estão em [`docs/PRD.md`](docs/PRD.md), nas seções "Regras que Operações já decidiu", "O que precisa existir na primeira versão" e "O que NÃO entra nesta versão". Leia de lá, não daqui: este arquivo não as copia, para não haver duas versões.

As quatro regras do PRD tinham lacunas: o que conta para o limite de três itens, de quando contam os 14 dias, quem registra a devolução e quem põe um item em manutenção. As três primeiras já têm resposta do time; a última segue aberta. Tudo está em [`docs/perguntas-prd.md`](docs/perguntas-prd.md): o que está em Abertas não é seu para decidir, e o que está em Respondidas vale até virar RN-xx na spec da funcionalidade.

## 5. Stack

Monolito Next.js (App Router) + TypeScript `strict` + tRPC + Prisma + PostgreSQL no Supabase + Supabase Auth via `@supabase/ssr` + Tailwind + shadcn/ui. Gerenciador de pacotes: **pnpm**.

As decisões e o porquê estão em [`docs/adr/001-stack.md`](docs/adr/001-stack.md), lido junto com [`docs/adr/003-stack-corrections.md`](docs/adr/003-stack-corrections.md): o ADR-003 numera cada trecho pela seção do ADR-001 que corrige, e onde os dois tratam do mesmo ponto vale o ADR-003. A multi-tenancy é decisão deliberada, confirmada pela resposta da pergunta 6 de `docs/perguntas-prd.md` (papel por área). [ADR-002](docs/adr/002-design-system.md): identidade visual. [ADR-004](docs/adr/004-environments.md): ambientes e bancos. [ADR-005](docs/adr/005-first-tenant-name.md): nome do primeiro tenant, que substitui as linhas do ADR-003 sobre ele. [ADR-006](docs/adr/006-dev-auth.md): Auth no desenvolvimento, em contêiner, que substitui trechos do ADR-001 e do ADR-004. [ADR-007](docs/adr/007-production-deploy-cli.md): deploy de produção pela CLI da Vercel, que substitui o Deploy Hook do ADR-004.

## 6. Bancos, três e só três

| Banco | Onde | Quem escreve nele |
|---|---|---|
| Produção | projeto Supabase `emprestai`, ref `zawqxqukgaqjlbtwiogb` | schema: GitHub Actions, via `prisma migrate deploy`; dado: a aplicação na Vercel e, só a área `default` e o vínculo do primeiro administrador, o passo do workflow (ADR-009) |
| Desenvolvimento | Postgres local em Docker, imagem `supabase/postgres`, subido por `docker compose` a partir do `compose.yaml`, com o Supabase Auth e o gateway Envoy ao lado (ADR-006), e apontado por `DATABASE_URL`/`DIRECT_URL` no `.env.local` | os comandos de Prisma listados em `rules/restrictions.md`, a aplicação e, só no schema `auth`, o servidor de Auth |
| Testes | Postgres efêmero do Testcontainers, a mesma imagem `supabase/postgres` (traz os papéis `anon` e `authenticated` que as policies usam) | o globalSetup do Vitest |

O Preview da Vercel não tem banco: a página mostra o estado de falha. Não existe Supabase CLI neste projeto; o `compose.yaml` sobe o Postgres, o Auth e o gateway. A decisão e o porquê estão no [ADR-004](docs/adr/004-environments.md) e no [ADR-006](docs/adr/006-dev-auth.md); o que pode e o que não pode em cada banco está em [`rules/restrictions.md`](rules/restrictions.md), seção Bancos e schema.

## 7. Idioma

- Prosa em português do Brasil: este arquivo, comentários, mensagens de commit, descrições de PR, mensagens de erro exibidas ao usuário.
- Código em inglês: identificadores, nomes de arquivo, tabelas, colunas, chaves de enum, rotas de API.
- Termos de domínio têm tradução fixa, para não surgirem dois nomes para a mesma coisa:

| Domínio | Código |
|---|---|
| equipamento | `equipment` |
| empréstimo | `loan` |
| devolução | `return` |
| colaborador | `member` |
| Operações | `operations` |
| área (tenant) | `tenant` |
| vínculo pessoa–tenant | `membership` |
| administrador | `admin` |
| conta | `account` |
| situação do equipamento: disponível, emprestado, em manutenção, fora de uso | `available`, `loaned`, `maintenance`, `out_of_service` (em classe e variante de CSS, com hífen: `out-of-service`) |
| em atraso | `overdue` |

"Chamado" e `ticket` não existem mais neste produto: não é um sistema de suporte.

## 8. O repositório hoje

Andar zero fechado (tag `andar-zero`) e produção no ar desde 2026-11-11, publicada pelo `.github/workflows/production.yml` (ADR-007). A raiz `/` é uma landing provisória que mostra a saúde do banco. Login e telas do produto ainda não existem. A spec 001, de login, já pode ser rascunhada: as perguntas dela estão respondidas e o ADR-006 foi aceito. O `compose.yaml` sobe o Auth e o gateway desde a T-01 da spec 001; o app ainda não fala com eles.

### Comandos

Só o que já rodou. Antes de tudo: `.env.local` preenchido a partir do `.env.example`, com as chaves do Auth local geradas como ele explica, e Docker Desktop aberto.

Primeira subida, nesta ordem:

| Passo | Comando | O que faz |
|---|---|---|
| 1 | `pnpm install` | Instala e gera o client do Prisma |
| 2 | `docker compose --env-file .env.local up -d --wait` | Sobe o Postgres, o Auth e o gateway de dev e espera os três ficarem saudáveis |
| 3 | `pnpm prisma migrate deploy` | Aplica as migrations no banco de dev |
| 4 | `pnpm dev` | Roda em http://localhost:3000; a landing mostra "Banco de dados ok" |

Depois, quando precisar:

| Comando | O que faz |
|---|---|
| `pnpm lint` e `pnpm typecheck` | ESLint e `tsc --noEmit` |
| `pnpm test` | Suíte no Testcontainers; exige o Docker de pé |
| `pnpm build` | Build de produção; exige `DATABASE_URL` |
| `pnpm prisma migrate dev --name <nome>` | Cria migration nova (`rules/migration.md`) |
| `docker compose --env-file .env.local down` | Derruba os três; o dado fica no volume |

O Prisma avisa que há versão nova e sugere `npm i prisma@latest`: ignore. O projeto usa pnpm e fixa o Prisma na versão exata do `package.json`, porque o `latest` é o 8.0.0-rc.

### Mapa de diretórios

| Pasta | O que mora ali |
|---|---|
| `src/app/` | Rotas do App Router; `api/trpc/[trpc]/` é o route handler único |
| `src/env/` | Única leitura de `process.env`, com as exceções de `rules/secrets.md` |
| `src/server/api/` | `initTRPC`, contexto, `appRouter` e, em `routers/`, um router por domínio |
| `src/server/services/` | Regra de negócio; nunca no router nem na tela |
| `src/server/db.ts` | Singleton do Prisma |
| `src/trpc/` | Lado cliente do tRPC |
| `src/generated/prisma/` | Client gerado, fora do git e do lint |
| `prisma/` | `schema.prisma` e migrations |
| `docker/` | Configuração do Envoy e script de senha do Auth, montados pelo `compose.yaml` (ADR-006) |
| `tests/` | Só infraestrutura de teste: globalSetup e helpers |

Cada teste fica ao lado do arquivo que testa. Uma funcionalidade nova toca `routers/`, `services/` e `src/app/<rota>/`, mais `prisma/` se tiver tabela nova.

### Convenções não óbvias

- Comentário não desliga regra de lint: exceção entra no `eslint.config.mjs`, com a justificativa ao lado.
- `src/env/schema.ts` não tem `server-only`, porque o `next.config.ts` o importa para validar no build e no dev. Por isso `next typegen` também exige `DATABASE_URL`, e o `layout.tsx` não usa o tipo gerado `LayoutProps`.
- Sem `.env.local`, passe uma URL fictícia na linha de comando: `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build`.
- O `build` roda `prisma generate`: o client fica fora do git, e o cache da Vercel pula o `postinstall` quando o lockfile não muda.
- `agentRules: false` no `next.config.ts` não sai: sem ele, o `next dev` escreve no nosso `AGENTS.md`.
- A tag da imagem é a mesma em `compose.yaml` e `tests/global-setup.ts`; mudou numa, muda na outra.
- O contêiner dos testes sobe como `supabase_admin` e os testes conectam como `postgres`, dono das tabelas. A imagem dá `SELECT` a `anon` e `authenticated`, então quem bloqueia é a RLS.
- O agente não roda `pnpm prisma migrate reset`: a ferramenta exige consentimento da pessoa. Para provar do zero, use um Postgres novo com `pnpm prisma migrate deploy`.
- Service não repassa erro do driver, que pode trazer host e usuário do banco.
- Procedimento sem entrada usa `.input(z.void())`, porque o ADR-001, 2.3, pede Zod em todo `.input()`.

### Como testar

Em [`rules/tests.md`](rules/tests.md), que carrega quando o assunto é teste.

## 9. Fluxo de trabalho com git

- Branch por tarefa a partir de `main`: `feat/`, `fix/`, `chore/`, `docs/` + slug curto em inglês (ex.: `feat/loan-create`).
- Commits em português, no imperativo, sem prefixo obrigatório e sem automação de formato. Um commit por passo lógico, não um por arquivo.
- O PR diz o que muda e como testar, e é aberto com `gh pr create`.

Quem autoriza commit, push e PR está em [`rules/operacao.md`](rules/operacao.md). O que é proibido está em [`rules/restrictions.md`](rules/restrictions.md), seção Produção.

## 10. Definição de pronto

Siga [`rules/checks.md`](rules/checks.md) antes do push. Ele diz o que fazer com os passos que ainda não dá para rodar. Este arquivo não resume aquele procedimento, de propósito.

## 11. Infraestrutura

IDs, URLs e estado de GitHub, Supabase, Vercel e CI: [`README.md`](README.md), seção Infraestrutura. Variáveis e onde cada uma vive: [`.env.example`](.env.example).
