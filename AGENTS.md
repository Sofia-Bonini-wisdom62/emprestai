# AGENTS.md — emprestai

Síntese operacional para qualquer agente que trabalhe neste repositório. Leia inteiro antes de mexer em qualquer coisa.

## 1. O produto

O emprestai substitui a planilha de controle de equipamentos internos (notebooks, monitores, cabos, câmeras).
Colaboradores pedem e devolvem itens; Operações cadastra equipamentos e acompanha os empréstimos em aberto. Projeto de disciplina da turma B, sem uso comercial.

| Persona | O que faz na v1 |
|---|---|
| Colaborador | Login, catálogo, solicitar empréstimo, devolver item, ver os próprios empréstimos |
| Operações | Cadastrar equipamentos, ver quem está com o quê, registrar devolução no balcão |

Critério de sucesso ([`docs/PRD.md`](docs/PRD.md)): Operações consegue abandonar a planilha depois de duas semanas de uso.

## 2. Onde olhar

| Documento | Papel |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Negócio: problema, personas, escopo da v1. Não é spec, não descreve tela nem comportamento de campo |
| [`docs/perguntas-prd.md`](docs/perguntas-prd.md) | Ambiguidades do PRD ainda não decididas pelo time. Nenhuma delas é sua para decidir |
| [`docs/adr/`](docs/adr/) | Decisões técnicas e o porquê de cada uma. [`001-stack.md`](docs/adr/001-stack.md) é a stack |
| [`docs/specs/`](docs/specs/) | Spec, plano e tarefas de cada funcionalidade. Formato e critérios (CA-xx) em [`docs/specs/README.md`](docs/specs/README.md) |
| [`rules/restrictions.md`](rules/restrictions.md) | Única fonte das proibições. Este arquivo não as repete |
| [`rules/checks.md`](rules/checks.md) | Única fonte do procedimento de fim de tarefa |
| [`rules/operacao.md`](rules/operacao.md) | Matriz de autorização: o que é livre, o que avisa, o que pede, o que é proibido. Vale sempre |
| [`.env.example`](.env.example) | Nomes exatos das variáveis e onde cada uma vive |

Demais rules de `rules/`, por gatilho:

| Rule | Dispara quando |
|---|---|
| `migration.md` | Você vai mudar `prisma/schema.prisma` ou criar migration |
| `secrets.md` | Variável de ambiente, chave ou fronteira servidor/cliente |
| `tests.md` | Você vai escrever ou alterar teste |
| `spec-flow.md` | Começo de funcionalidade: do PRD à spec, ao plano e às tarefas |
| `handoff.md` | Fim de sessão, passar o bastão para a próxima |

## 3. Precedência

Em conflito, nesta ordem:

1. Isolamento de tenant e segurança — sempre prevalece.
2. `docs/adr/` para decisão técnica.
3. `docs/PRD.md` para regra de negócio.
4. A spec da funcionalidade em `docs/specs/` para comportamento.
5. Este arquivo, como síntese operacional, por último.

Se não estiver escrito em lugar nenhum, pergunte, não decida.

## 4. Regras de negócio e escopo da v1

Estão em [`docs/PRD.md`](docs/PRD.md), nas seções "Regras que Operações já decidiu", "O que precisa existir na primeira versão" e "O que NÃO entra nesta versão". Leia de lá, não daqui: este arquivo não as copia, para não haver duas versões.

As quatro regras do PRD têm lacunas (o que conta para o limite de três itens, de quando contam os 14 dias, quem registra a devolução, quem põe um item em manutenção). Elas estão em [`docs/perguntas-prd.md`](docs/perguntas-prd.md), e nenhuma é sua para decidir.

## 5. Stack

Monolito Next.js (App Router) + TypeScript `strict` + tRPC + Prisma + PostgreSQL no Supabase + Supabase Auth via `@supabase/ssr` + Tailwind + shadcn/ui. Gerenciador de pacotes: **pnpm**.

As decisões e o porquê de cada uma estão em [`docs/adr/001-stack.md`](docs/adr/001-stack.md). Por assunto:

| Assunto | Seção do ADR-001 |
|---|---|
| Monolito, repositório, deploy | 2.1 |
| Telas, estado, formulários, estilo | 2.2 |
| tRPC, routers, camadas, validação | 2.3 e 2.4 |
| Banco, Prisma, conexões, seed | 2.5 |
| Multi-tenancy (decisão deliberada, pendente da pergunta 6 de `docs/perguntas-prd.md`) | 1 e 2.6 |
| Auth, sessão, autorização, RLS | 2.7 |
| Testes | 2.8 |
| Hospedagem, CI, log, limites | 2.9 |
| Segurança e segredos | 2.10 |

## 6. Bancos, três e só três

| Banco | Onde | Quem escreve nele |
|---|---|---|
| Produção | projeto Supabase `emprestai`, ref `zawqxqukgaqjlbtwiogb` | GitHub Actions, via `prisma migrate deploy` |
| Desenvolvimento | **ainda não existe.** Quando for criado: segundo projeto Supabase, remoto e separado, apontado por `DATABASE_URL`/`DIRECT_URL` no `.env.local` | os comandos de Prisma listados em `rules/restrictions.md` e a aplicação; nenhum rodou até hoje |
| Testes | Postgres efêmero do Testcontainers, imagem `supabase/postgres` (traz o schema `auth` que as policies referenciam) | o globalSetup do Vitest, quando existir |

Não existe banco local do Supabase CLI neste projeto. O que pode e o que não pode em cada banco, inclusive enquanto o de dev não existir, está em [`rules/restrictions.md`](rules/restrictions.md), seção Bancos e schema.

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

"Chamado" e `ticket` não existem mais neste produto: não é um sistema de suporte.

## 8. Estado atual do projeto

**Não existe** código de aplicação, `package.json`, script de `pnpm`, pasta de código (`src/`, `app/`), `prisma/`, migration nem teste. Nenhum comando (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm prisma migrate dev`, `pnpm prisma db seed`) jamais foi executado neste repositório. Quando falar de qualquer um deles, diga "quando o scaffold existir".

Existe hoje, e só: os documentos de `docs/` (PRD, ADR-001, `perguntas-prd.md` e `specs/README.md`), as oito rules de `rules/`, `stacks_H.md` (insumo do ADR, congelado antes de o PRD entrar: descreve um domínio e nomes de chave superados, não copie nada dele), `.env.example`, `.gitignore`, `.gitattributes`, `vercel.json`, `README.md`, este arquivo e `CLAUDE.md`. Confira com `git ls-files` antes de atualizar esta lista.

Pendente: o andar zero (scaffold do app, `package.json`, `prisma/`, primeira migration, seed e os primeiros testes); o segundo projeto Supabase de dev; o workflow do GitHub Actions que roda `prisma migrate deploy` e dispara o deploy.

Esta seção é provisória. Quando o andar zero rodar, ela dá lugar a **Comandos** (a tabela com o que cada script faz, só depois de rodar), **Mapa de diretórios**, **Convenções não obvias** e **Como testar**.

## 9. Fluxo de trabalho com git

- Branch por tarefa a partir de `main`: `feat/`, `fix/`, `chore/`, `docs/` + slug curto em inglês (ex.: `feat/loan-create`).
- Commits em português, no imperativo, sem prefixo obrigatório e sem automação de formato. Um commit por passo lógico, não um por arquivo.
- O PR diz o que muda e como testar, e é aberto com `gh pr create`.

Quem autoriza commit, push e PR está em [`rules/operacao.md`](rules/operacao.md). O que é proibido está em [`rules/restrictions.md`](rules/restrictions.md), seção Produção.

## 10. Definição de pronto

Siga [`rules/checks.md`](rules/checks.md) antes do push. Ele diz o que fazer com os passos que ainda não dá para rodar. Este arquivo não resume aquele procedimento, de propósito.

## 11. Infraestrutura (referência, sem segredos)

| Item | Valor |
|---|---|
| GitHub | `Sofia-Bonini-wisdom62/emprestai`, privado |
| Supabase (produção) | projeto `emprestai`, ref `zawqxqukgaqjlbtwiogb`, região `sa-east-1`, plano free. **Pausado por inatividade**: a reativação é manual, no painel, por uma pessoa — https://supabase.com/dashboard/project/zawqxqukgaqjlbtwiogb |
| Supabase (dev) | segundo projeto, ainda não existe. Enquanto não existir, não há banco de desenvolvimento; a ref entra aqui quando for criado |
| Vercel | projeto `emprestai`, id `prj_ZazuIw4JaAibAjyNU49xkwo4tMr2`, plano Hobby, functions nos EUA. URL de produção reservada: https://emprestai-beta.vercel.app, que responde 404 enquanto não houver aplicação |
| CI | GitHub Actions. `vercel.json` desliga o deploy por push na `main`; o deploy de produção sai de Deploy Hook depois do `prisma migrate deploy`. O workflow ainda não existe |
| Variáveis | lista completa e onde cada uma vive em [`.env.example`](.env.example) |
