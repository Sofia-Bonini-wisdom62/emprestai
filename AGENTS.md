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
| [`docs/perguntas-prd.md`](docs/perguntas-prd.md) | Lacunas do PRD. As abertas não são suas para decidir; as já respondidas pelo time valem até virar RN-xx na spec |
| [`docs/adr/`](docs/adr/) | Decisões técnicas e o porquê de cada uma. [`001-stack.md`](docs/adr/001-stack.md) é a stack, lida junto com [`003-stack-corrections.md`](docs/adr/003-stack-corrections.md), que corrige trechos dela; [`002-design-system.md`](docs/adr/002-design-system.md) é a identidade visual, ainda com status Proposto. [`004-environments.md`](docs/adr/004-environments.md) decide os ambientes e os bancos; [`005-first-tenant-name.md`](docs/adr/005-first-tenant-name.md) dá o nome do primeiro tenant. ADR aceito não se edita: correção vira ADR novo |
| [`docs/layout.md`](docs/layout.md) | Aparência: tokens, tipografia, componentes e telas. Guarda os valores; o porquê está no ADR-002 |
| [`docs/specs/`](docs/specs/) | Spec, plano e tarefas de cada funcionalidade. Formato e critérios (CA-xx) em [`docs/specs/README.md`](docs/specs/README.md) |
| [`docs/andar-zero.md`](docs/andar-zero.md) e [`docs/plan-andar-zero.md`](docs/plan-andar-zero.md) | Os critérios (AZ-xx) do esqueleto que prova a stack, que não é spec, e o plano de tarefas dele. Nenhuma tarefa começa antes de o plano ser aprovado |
| [`rules/restrictions.md`](rules/restrictions.md) | Única fonte das proibições. Este arquivo não as repete |
| [`rules/checks.md`](rules/checks.md) | Única fonte do procedimento de fim de tarefa |
| [`rules/operacao.md`](rules/operacao.md) | Matriz de autorização: o que é livre, o que avisa, o que pede, o que só vale a pedido da pessoa, o que é proibido. Vale sempre |
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

As decisões e o porquê de cada uma estão em [`docs/adr/001-stack.md`](docs/adr/001-stack.md), com as correções de [`docs/adr/003-stack-corrections.md`](docs/adr/003-stack-corrections.md). O ADR-003 numera cada trecho pela seção do ADR-001 que ele corrige; onde os dois tratam do mesmo ponto, vale o ADR-003. Por assunto:

| Assunto | ADR-001 | ADR-003 |
|---|---|---|
| Produto e condições da decisão | 1 | 1 (substitui inteira) |
| Monolito, repositório, deploy | 2.1 | — |
| Telas, estado, formulários, estilo | 2.2 | 2.2 |
| tRPC, routers, camadas, validação | 2.3 e 2.4 | — |
| Banco, Prisma, conexões, seed | 2.5 | 2.5 |
| Multi-tenancy (decisão deliberada, pendente da pergunta 6 de `docs/perguntas-prd.md`) | 2.6 | 1 e 2.6 |
| Auth, sessão, autorização, RLS | 2.7 | 2.7 |
| Testes | 2.8 | 2.8 |
| Hospedagem, CI, log, limites | 2.9 | 2.9 |
| Segurança e segredos | 2.10 | 2.10 |

Ambientes e bancos: [ADR-004](docs/adr/004-environments.md). Nome do primeiro tenant: [ADR-005](docs/adr/005-first-tenant-name.md), que substitui as linhas do ADR-003 sobre ele.

## 6. Bancos, três e só três

| Banco | Onde | Quem escreve nele |
|---|---|---|
| Produção | projeto Supabase `emprestai`, ref `zawqxqukgaqjlbtwiogb` | schema: GitHub Actions, via `prisma migrate deploy`; dado: a aplicação na Vercel |
| Desenvolvimento | Postgres local em Docker, imagem `supabase/postgres`, subido por `docker compose` a partir do `compose.yaml` (que entra no andar zero) e apontado por `DATABASE_URL`/`DIRECT_URL` no `.env.local` | os comandos de Prisma listados em `rules/restrictions.md` e a aplicação; nenhum rodou até hoje |
| Testes | Postgres efêmero do Testcontainers, a mesma imagem `supabase/postgres` (traz o schema `auth` que as policies referenciam) | o globalSetup do Vitest, quando existir |

O Preview da Vercel não tem banco: a página mostra o estado de falha. Não existe Supabase CLI neste projeto; o banco local é só o Postgres do `compose.yaml`. A decisão e o porquê estão no [ADR-004](docs/adr/004-environments.md); o que pode e o que não pode em cada banco está em [`rules/restrictions.md`](rules/restrictions.md), seção Bancos e schema.

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
| situação do equipamento: disponível, emprestado, em manutenção, fora de uso | `available`, `loaned`, `maintenance`, `out_of_service` (em classe e variante de CSS, com hífen: `out-of-service`) |
| em atraso | `overdue` |

"Chamado" e `ticket` não existem mais neste produto: não é um sistema de suporte.

## 8. Estado atual do projeto

O andar zero está em andamento, na branch `feat/walking-skeleton`. O scaffold do Next.js existe, e `pnpm lint`, `pnpm typecheck`, `pnpm dev` e `pnpm build` já rodam. A raiz `/` é uma landing provisória. **Ainda não existe** `prisma/`, migration nem teste: `pnpm test`, `pnpm test:e2e`, `pnpm prisma migrate dev` e `pnpm prisma db seed` nunca rodaram.

Existe hoje, e só: os documentos de `docs/` (PRD, `perguntas-prd.md`, ADR-001, ADR-002 com status Proposto, ADR-003, ADR-004, ADR-005, `layout.md`, `andar-zero.md`, `plan-andar-zero.md` e `specs/README.md`), as oito rules de `rules/`, `stacks_H.md` (insumo do ADR, congelado antes de o PRD entrar: descreve um domínio e nomes de chave superados, não copie nada dele), `src/app/`, `package.json` e as configs do scaffold, `.env.example`, `.gitignore`, `.gitattributes`, `vercel.json`, `README.md`, este arquivo e `CLAUDE.md`. Confira com `git ls-files` antes de atualizar esta lista.

Pendente: o resto do andar zero (`compose.yaml` do banco de dev, `prisma/`, primeira migration, procedimento de saúde e os primeiros testes); a aprovação do ADR-002; o workflow do GitHub Actions que roda `prisma migrate deploy` e dispara o deploy. No PR do andar zero, tirar o `ignoreCommand` do `vercel.json`: com o `package.json` existindo ele vira configuração morta.

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
| Banco de dev | Postgres local em Docker ([ADR-004](docs/adr/004-environments.md)); não há projeto Supabase de dev |
| Vercel | projeto `emprestai`, id `prj_ZazuIw4JaAibAjyNU49xkwo4tMr2`, plano Hobby, functions nos EUA. URL de produção reservada: https://emprestai-beta.vercel.app, que responde 404 enquanto não houver aplicação |
| CI | GitHub Actions. `vercel.json` desliga o deploy por push na `main`; o deploy de produção sai de Deploy Hook depois do `prisma migrate deploy`. O workflow ainda não existe. Enquanto não houver `package.json`, o `ignoreCommand` do `vercel.json` faz a Vercel pular o build dos previews em vez de falhar |
| Variáveis | lista completa e onde cada uma vive em [`.env.example`](.env.example) |
