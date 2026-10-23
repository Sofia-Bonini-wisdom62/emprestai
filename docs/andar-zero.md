# Andar zero — prova do ADR-001

Isto **não é uma spec**. Não há comportamento de produto aqui, nem regra RN-xx, nem
critério CA-xx: nada do [`docs/PRD.md`](PRD.md) é implementado. O andar zero é a
verificação de que a stack de [`docs/adr/001-stack.md`](adr/001-stack.md) funciona
junta — tela, servidor, banco, testes e deploy — antes da primeira funcionalidade.
Os critérios usam o prefixo AZ para não se confundirem com os CA-xx das specs.

## Critérios de aceitação

- **AZ-01** · Numa máquina limpa com Node 24 e pnpm, a aplicação sobe só com os comandos documentados (instalar, migrar o banco de dev, rodar); o único passo fora deles é preencher o `.env.local` a partir do `.env.example`. O banco de dev é remoto (ADR-001); quem sobe Postgres sozinho é o AZ-06.
- **AZ-02** · Sem uma variável obrigatória, a aplicação não sobe nem compila, e a mensagem cita a variável. Com as variáveis presentes, a aplicação sobe com o banco fora do ar.
- **AZ-03** · Existe uma migration versionada pelo Prisma Migrate que cria uma única tabela técnica, fora do domínio, já com RLS habilitada (ADR-001, 2.7) e ao menos uma policy explícita ([`rules/migration.md`](../rules/migration.md)), e ela se aplica do zero sem passo manual.
- **AZ-04** · Um procedimento tRPC público de saúde responde com o status da conexão com o banco, a partir de uma consulta trivial à tabela do AZ-03. Banco fora do ar = resposta de falha explícita, sem erro genérico.
- **AZ-05** · A página raiz (`/`) da aplicação chama esse procedimento pelo cliente tRPC com TanStack Query e mostra o resultado, provando que tela, servidor e banco se falam.
- **AZ-06** · `pnpm test` roda a suíte: sobe um Postgres efêmero pelo Testcontainers, aplica as migrations do zero e tem pelo menos um teste do procedimento de saúde via `createCaller`, contra banco real.
- **AZ-07** · Toda configuração vem de variável de ambiente, validada com Zod e dividida entre servidor e cliente, e o `.env.example` versionado lista todas, sem valor real.
- **AZ-08** · `.env*` (exceto `.env.example`) está no `.gitignore`, e nenhum segredo está no repositório nem no histórico.
- **AZ-09** · O preview da Vercel compila a aplicação e serve a página do AZ-05.

Nota sobre o AZ-09: ele vai além do critério da aula porque o deploy faz parte do
ADR-001.

## Fora de escopo

- Qualquer funcionalidade do PRD: login, catálogo, empréstimo, devolução, tela de Operações.
- Supabase Auth e `@supabase/ssr`.
- Tabelas de domínio e de tenant (inclusive `memberships` e o tenant do seed).
- Seed (`prisma/seed.ts`): ele cria o tenant, que está fora.
- Cabeçalhos HTTP e CSP (ADR-001, 2.10). A primeira tela com componentes do shadcn/ui
  tem que conferir a CSP, porque o [`docs/layout.md`](layout.md) registrou que alguns
  primitivos escrevem `style`.
- Design system: a página do AZ-05 é propositalmente simples.
- Sentry, rate limit e auditoria.
- Playwright.
- O workflow do GitHub Actions com `prisma migrate deploy` e o Deploy Hook, que vem logo depois do andar zero.

## Não decidido ainda

- A organização de pastas além do que o ADR-001 já fixa (`app/api/trpc/[trpc]/route.ts`,
  `src/server/api/routers/<dominio>.ts`, `prisma.config.ts`, `prisma/`) e do que
  [`rules/secrets.md`](../rules/secrets.md) já especifica para `src/env/`. O plano
  propõe; a pessoa revisa antes de qualquer arquivo ser criado.

## Depende de coisa fora do repositório

| Critério | Do que depende | Quem resolve |
|---|---|---|
| AZ-01 a AZ-05, contra banco de verdade | Banco de dev: o segundo projeto Supabase ainda não existe | A pessoa: decisão e painel do Supabase |
| AZ-06 (e AZ-03 e AZ-04 provados por ele) | Docker Desktop com o daemon de pé (hoje está instalado, mas parado) e a migration gerada (banco de dev ou R5 do plano) | A pessoa abre o Docker, e o agente não tenta subi-lo (`rules/checks.md`); a pessoa decide entre o banco de dev e o R5 |
| AZ-09 | `DATABASE_URL` no ambiente Preview da Vercel, a única variável obrigatória no andar zero (T2 do plano), onde hoje só existem as públicas; `DIRECT_URL` não vai para a Vercel | A pessoa, no painel da Vercel |
| AZ-09 | Aprovação explícita para editar o `vercel.json` (`rules/restrictions.md`, seção Escopo) | A pessoa, nesta conversa |

O que dá para provar sem essas dependências, e como:

- **Sem banco de dev:** o Testcontainers cobre AZ-03 (a migration se aplica do zero
  num Postgres novo), AZ-04 (o procedimento de saúde lê a tabela) e AZ-06 (a suíte
  inteira) — todos com o Docker de pé e a migration já gerada, o que exige o banco de
  dev ou a aprovação da alternativa sem banco ([plano](plan-andar-zero.md), R5).
- **Banco ausente:** com as variáveis preenchidas e nenhum banco respondendo, a
  segunda metade do AZ-02 (a aplicação sobe) e a resposta de falha do AZ-04 são
  provadas de propósito, e o AZ-05 mostra essa falha na página. A primeira metade do AZ-02
  (variável faltando) não depende de nada.
- **Só o repositório:** AZ-07 e AZ-08 se verificam por leitura do código, do
  `.env.example`, do `.gitignore` e do histórico do git.
- **Sem a Vercel:** `pnpm build` local antecipa a parte de compilação do AZ-09, mas
  não o substitui; o critério só fecha com o preview servindo a página.
