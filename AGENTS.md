# AGENTS.md — emprestai

Instruções para qualquer agente de código que trabalhe neste repositório. Leia inteiro antes de mexer em qualquer coisa.

## 1. O que é o projeto

Sistema de suporte de TI: abertura de chamados e inventário de ativos, multi-tenant (cada área da empresa é um tenant). Projeto de disciplina da turma B, sem uso comercial.

A fonte da verdade sobre arquitetura e stack é [`docs/adr/001-stack.md`](docs/adr/001-stack.md). Este arquivo resume o ADR e acrescenta convenções de trabalho; em caso de dúvida, o ADR vence.

Leia também, antes de qualquer tarefa:

- [`rules/restrictions.md`](rules/restrictions.md): o que você não pode fazer. É a **única** fonte das proibições; este arquivo não as repete, para não haver duas versões da mesma regra.
- [`rules/checks.md`](rules/checks.md): o procedimento que precisa passar antes de dizer "pronto". É a **única** fonte desse procedimento.
- [`docs/specs/README.md`](docs/specs/README.md): formato das specs e dos critérios de aceitação (CA-xx).

## 2. Regras que não se negocia

Extraídas do ADR. Uma linha cada; a justificativa está lá.

- `tenant_id` vem da sessão, resolvido no `createContext` do tRPC. Nunca do input de um procedure.
- Toda tabela de domínio tem `tenant_id`. Todo procedure de domínio passa por `tenantProcedure`, que injeta o tenant no service.
- Todo procedure tRPC tem `.input()` com Zod. Sem Server Actions. Client Components buscam dado só via tRPC; Server Components não tocam o Prisma.
- Um router por domínio em `src/server/api/routers/<dominio>.ts`. O procedure cuida de entrada, contexto e permissão; a regra de negócio fica no service.
- Nada secreto com prefixo `NEXT_PUBLIC_`. `SUPABASE_SECRET_KEY` só existe em módulo que começa com `import 'server-only'`.
- RLS ligado em toda tabela, deny by default. Policies, triggers e funções entram como SQL dentro da migration do Prisma. Prisma Migrate é o único dono do schema; o Supabase CLI não gerencia migration.
- Migration roda no CI antes do deploy, nunca no boot da aplicação.
- superjson como transformer, paginação por cursor, erros como `TRPCError` com código.
- Toda operação cabe em 60 segundos. Importação e relatório grande são feitos em lotes.
- Cookie de sessão é `httpOnly`. Login, logout, convite e redefinição de senha rodam no servidor (procedure ou Route Handler), nunca via `createBrowserClient`.
- Log estruturado em JSON com `request_id` e `tenant_id`. Rate limit por IP e por usuário com contador no Postgres. Tabela de auditoria append-only.

## 3. Stack e comandos

Next.js (App Router) + TypeScript `strict` + tRPC + Prisma + PostgreSQL no Supabase + Supabase Auth via `@supabase/ssr` + Tailwind + shadcn/ui + TanStack Query + React Hook Form + Vitest + Testcontainers + Playwright + Sentry. Gerenciador de pacotes: **pnpm**.

| Comando | O que faz |
|---|---|
| `pnpm install` | instala dependências (lockfile estrito) |
| `pnpm dev` | sobe o app em `http://localhost:3000` |
| `pnpm lint` | ESLint + Prettier |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest inteiro: unit, componentes e integração (exige Docker rodando) |
| `pnpm test:e2e` | Playwright nos fluxos críticos |
| `pnpm build` | `next build`; pega erro de fronteira servidor/cliente e de env |
| `pnpm prisma migrate dev` | cria e aplica migration no banco de dev (usa `DIRECT_URL`) |
| `pnpm prisma db seed` | roda `prisma/seed.ts`, idempotente, cria o tenant `suporte_ti` |

Os scripts nascem com o scaffold do app. Quem alterar `package.json` atualiza esta tabela no mesmo PR.

Bancos, três e só três:

| Banco | Onde | Quem escreve nele |
|---|---|---|
| Produção | projeto Supabase `emprestai` | GitHub Actions, via `prisma migrate deploy` |
| Desenvolvimento | projeto Supabase de dev, separado, apontado pelo `.env.local` | `prisma migrate dev`, `prisma db seed` e a aplicação |
| Testes | Postgres efêmero do Testcontainers | o globalSetup do Vitest |

O que o agente pode e não pode fazer em cada um está em [`rules/restrictions.md`](rules/restrictions.md), seção Bancos e schema.

Notas operacionais que o ADR não cobre porque a biblioteca mudou:

- Prisma 7 removeu `directUrl` do `schema.prisma`. A URL de migration fica em `prisma.config.ts` como `datasource.url = process.env.DIRECT_URL` (sem o helper `env()`, que quebra `prisma generate` no build da Vercel). O runtime usa `@prisma/adapter-pg` com `DATABASE_URL`.
- O limite de uma conexão por function que o ADR exige é `new PrismaPg({ connectionString, max: 1 })`. O parâmetro `connection_limit` na URL não é lido pelo adapter.
- O Supabase chama hoje de *publishable key* e *secret key* o que o ADR chama de anon e `service_role`. Use só os nomes novos: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`.
- No Next 16 o arquivo `middleware.ts` chama-se `proxy.ts`. É ele que renova a sessão do Supabase em toda rota.

## 4. Estrutura de pastas

```
src/app/                         rotas e telas (App Router)
src/app/api/trpc/[trpc]/route.ts endpoint único do tRPC
src/server/api/root.ts           AppRouter
src/server/api/trpc.ts           createContext e os middlewares protected/tenant/admin
src/server/api/routers/          um arquivo por domínio
src/server/services/             regra de negócio, testável sem tRPC
src/server/db.ts                 singleton do Prisma
src/env/server.ts                schema Zod das variáveis de servidor (server-only)
src/env/client.ts                schema Zod das NEXT_PUBLIC_*
src/env/runtime.ts               valores derivados das VERCEL_* (ambiente, release, URL base)
prisma/schema.prisma             modelo
prisma/migrations/               migrations, incluindo o SQL de RLS
prisma/seed.ts                   seed idempotente
tests/                           helpers de teste, globalSetup do Testcontainers
docs/adr/                        decisões de arquitetura
```

## 5. Idioma

- Prosa em português do Brasil: este arquivo, comentários, mensagens de commit, descrições de PR, mensagens de erro exibidas ao usuário.
- Código em inglês: identificadores, nomes de arquivo, tabelas, colunas, chaves de enum, rotas de API.
- Termos de domínio têm tradução fixa para não surgirem dois nomes para a mesma coisa:

| Domínio | Código |
|---|---|
| chamado | `ticket` |
| ativo | `asset` |
| área (tenant) | `tenant` |
| membro / vínculo | `membership` |
| administrador | `admin` |

## 6. Fluxo de trabalho com git

- Branch por tarefa a partir de `main`: `feat/`, `fix/`, `chore/`, `docs/` + slug curto em inglês (ex.: `feat/ticket-create`).
- Commits em português, no imperativo, sem prefixo obrigatório e sem automação de formato. Um commit por passo lógico, não um commit por arquivo.
- O agente pode commitar e fazer push na branch da tarefa e abrir o PR com `gh pr create`. O PR diz o que muda e como testar.

O que é proibido em volta disso está em [`rules/restrictions.md`](rules/restrictions.md), seções Produção e Dados e segredos.

## 7. Definição de pronto

Uma tarefa é a unidade definida em [`rules/restrictions.md`](rules/restrictions.md), seção Ritmo. Ela só está pronta quando o procedimento de [`rules/checks.md`](rules/checks.md) passou inteiro na máquina, antes do push. Siga aquele arquivo passo a passo e cole as saídas: o resumo que existia aqui saía de sincronia com ele.

## 8. Testes: como escrever

- Procedure tRPC: `createCaller` com contexto montado à mão (sessão, tenant, role), sem subir HTTP.
- Integração: contra Postgres real via Testcontainers, usando a imagem `supabase/postgres` para o schema `auth` e os roles que as policies referenciam. As migrations reais são aplicadas com `prisma migrate deploy` no container.
- Componentes: Testing Library. E2E: Playwright só para login, abertura de chamado e cadastro de ativo.

## 9. Infraestrutura (referência, sem segredos)

| Item | Valor |
|---|---|
| GitHub | `Sofia-Bonini-wisdom62/emprestai`, privado |
| Supabase (produção) | projeto `emprestai`, ref `zawqxqukgaqjlbtwiogb`, região `sa-east-1`, plano free. Painel: https://supabase.com/dashboard/project/zawqxqukgaqjlbtwiogb |
| Supabase (dev) | projeto separado, a criar; ref registrada aqui quando existir. Até lá, `pnpm dev` não tem banco |
| Vercel | projeto `emprestai`, id `prj_ZazuIw4JaAibAjyNU49xkwo4tMr2`, plano Hobby, functions nos EUA. Produção: https://emprestai-beta.vercel.app |
| CI | GitHub Actions. Deploy de produção só via Deploy Hook depois do `prisma migrate deploy` (`vercel.json` desliga o deploy por push na `main`) |
| Variáveis | lista completa e onde cada uma vive em [`.env.example`](.env.example) |
