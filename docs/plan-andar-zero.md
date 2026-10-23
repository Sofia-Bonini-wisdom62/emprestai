# Plano — andar zero

Sai de [`docs/andar-zero.md`](andar-zero.md) (critérios AZ-01 a AZ-09) e é restrito por [`docs/adr/001-stack.md`](adr/001-stack.md). Não implementa nada do PRD. Nenhuma pergunta de [`docs/perguntas-prd.md`](perguntas-prd.md) é necessária aqui: a tabela técnica não tem domínio nem `tenant_id`.

## 1. Organização de pastas proposta

```
.                         raiz: configs que o Next, o Prisma, o pnpm e o Vitest procuram aqui
├── prisma/               schema.prisma e migrations/ versionadas pelo Prisma Migrate
├── prisma.config.ts      URL de migration (process.env.DIRECT_URL), caminho das migrations
├── public/               estáticos servidos na raiz; nasce vazio (só favicon, se ficar)
├── src/
│   ├── app/              rotas do App Router: layout, páginas, route handlers
│   │   ├── page.tsx      página do AZ-05, na raiz /
│   │   └── api/trpc/[trpc]/   route handler único do tRPC
│   ├── env/              server.ts, client.ts, runtime.ts: única leitura de process.env
│   ├── server/
│   │   ├── db.ts         singleton do Prisma com @prisma/adapter-pg, max: 1
│   │   ├── api/          initTRPC, createContext, procedimentos base, appRouter
│   │   │   └── routers/  um arquivo por domínio; no andar zero só health.ts
│   │   └── services/     regra de negócio; no andar zero só a consulta de saúde
│   ├── trpc/             lado cliente do tRPC: cliente, QueryClient e Provider
│   └── generated/prisma/ saída do prisma generate; fora do git
└── tests/                globalSetup do Testcontainers, helpers e testes de servidor
```

**(a) Convenção do Next.js / create-next-app — herança, não decisão:** `src/app/` e o roteamento por pasta (`page.tsx` na raiz, `api/trpc/[trpc]/route.ts`), `public/`, os arquivos de config na raiz (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`), o alias `@/*`. `pnpm-workspace.yaml`, se aparecer, é convenção do pnpm.

**(b) Já decidido pelo ADR-001 ou por rule:** route handler do tRPC em `api/trpc/[trpc]/route.ts` (2.3); `src/server/api/routers/<domínio>.ts`, um router por domínio (2.3); `prisma/` e `prisma.config.ts` (2.5, com a correção do ADR-003). O ADR fixa também a camada Service entre router e Prisma (2.3) e o singleton do Prisma (2.5), mas não o caminho deles: os caminhos estão no grupo (c). Fixado por `rules/secrets.md`, não pelo ADR: `src/env/{server,client,runtime}.ts`.

**(c) Escolha nossa, proposta aqui — só isto é decisão:**
- `src/` ligado (`--src-dir`). Por que: separa código de config na raiz, que já tem `docs/`, `rules/` e arquivos de agente; sem ele `app/` se mistura a isso.
- `src/trpc/` para o cliente. Por que: o que roda no navegador fica fora de `src/server/`, e a busca de `rules/secrets.md` (segredo em código de cliente) tem um alvo claro.
- `src/generated/prisma/`, ignorado no git e gerado no `postinstall`. Por que: o Prisma 7 exige `output`; dentro de `src/` o alias `@/` alcança, e fora do git não há código gerado para revisar em PR.
- `src/server/services/` para a camada Service. Por que: o ADR 2.3 fixa a camada, não o caminho; ao lado de `src/server/api/`, o service fica do lado do servidor, longe do código de cliente.
- `src/server/db.ts` para o singleton do Prisma. Por que: o ADR 2.5 fixa o singleton, não o caminho; um arquivo só em `src/server/` é o único lugar que instancia o client.
- A página do AZ-05 na raiz `/` (`src/app/page.tsx`), sem rota `/health` separada. Por que: é o que o preview da Vercel abre (AZ-09) e é uma peça a menos. É provisória: quando a spec do catálogo entrar, `/` passa a levar ao catálogo (`docs/layout.md`, seção 6) e a verificação de saúde fica só no procedimento tRPC.
- `tests/` na raiz, espelhando `src/`, em vez de teste ao lado do arquivo. Por que: o globalSetup e os helpers de banco não pertencem a módulo nenhum; `rules/tests.md` já prevê `tests/**`.
- `routers/health.ts` e `services/health.ts`, embora saúde não seja domínio. Por que: exercita o caminho Router → Service → Prisma que toda feature vai seguir.

**As três perguntas da aula.**
- Onde mora a regra de negócio: em `src/server/services/`, nunca no router (que cuida de entrada, contexto e permissão) nem na tela.
- Quantas pastas uma feature nova toca: quatro — `src/server/api/routers/` (+ registro no `appRouter`), `src/server/services/`, `src/app/<rota>/` e `tests/`; mais `prisma/` se tiver tabela nova. Componente de tela entra quando houver shadcn/ui, fora do andar zero.
- O que é convenção e o que é escolha: grupos (a) e (b) acima não estão em revisão; o grupo (c) está, e a pessoa aprova ou troca antes da T1.

## 2. O que o scaffold vai criar

Fonte: documentação oficial do `create-next-app` (página atualizada em 2026-09-29). Confirmei as flags abaixo e que o CLI **cria uma pasta nova** com o nome do projeto. O repositório já tem `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` e `docs/`, então a T1 roda numa pasta temporária **fora do repositório** e copia só o que está listado. Antes de rodar, a T1 executa `pnpm create next-app@<versão estável atual, conferida na tarefa> --help` e mostra a saída; se uma flag não existir, para.

```
pnpm create next-app@<versão> emprestai-scaffold --ts --eslint --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm --no-react-compiler --no-agents-md --no-agent-feedback \
  --disable-git --skip-install [--no-cache-components: ver Riscos, R3]
```

Turbopack vem ligado por padrão (doc). `--no-agents-md` porque o repositório já tem o seu `AGENTS.md`; `--no-*` nega opção padrão, pela doc.

Esperado (conferido contra o resultado real, que a T1 mostra): `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`, `README.md`, `public/*.svg`, `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}`.

O que a T1 faz logo em seguida: copia `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` e `src/app/`; **não** copia `README.md`, `.gitignore` (o do repositório já cobre o do scaffold; diferença mostrada) nem `next-env.d.ts` (ignorado); remove os SVGs de `public/`, o `next/image` e o conteúdo de exemplo de `page.tsx` (que fica como placeholder mínimo, sem conteúdo de produto, até a T8 pôr nele a página do AZ-05), mas **mantém** o `next/font` do `layout.tsx`, que já traz a Geist, a fonte proposta no ADR-002, servida pelo próprio Next a partir do build, sem CDN em tempo de execução (nada além disso do design system entra no andar zero); acrescenta o script `typecheck` (`tsc --noEmit`), exigido por `rules/checks.md`; roda `pnpm install` no repositório, o que cria `pnpm-lock.yaml` (e `pnpm-workspace.yaml`, se o pnpm criar ao aprovar builds, R11).

## 3. Tarefas

Sem banco de dev e sem Docker, depois das decisões indicadas: T1 (pastas + R3), T2, T3 (R4 e R14), T4, T6 (T4 aprovada), T8 (caminho de falha, depois da T6), T10 (R7). **Esperam:** T5 (banco de dev, ou a proposta do R5), T7 (Docker, a migration da T5 e R15), T9 (banco de dev), T11 (aprovação, painel da Vercel e banco do Preview).

Variáveis nas verificações: o agente não lê nem escreve `.env.local` (`rules/restrictions.md`, Dados e segredos). Onde a verificação pede variáveis presentes, ele passa valores fictícios na linha de comando, sem `.env.local`, por exemplo `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm dev` (porta fechada, sem usuário nem senha). Vale também para o `pnpm build` do passo 6 de `rules/checks.md` a partir da T2.

- [ ] T1 · Scaffold do Next.js na raiz do repositório
  atende: pré-requisito de T2 a T11
  adiciona dependência: next, react, react-dom, typescript, tailwindcss, eslint (as que o scaffold traz)
  depende de fora do repo: nada
  verifico assim: `pnpm dev` e abrir http://localhost:3000; `pnpm lint` e `pnpm typecheck` sem erro; `git status --short` só com a lista da seção 2 + `pnpm-lock.yaml` (+ `pnpm-workspace.yaml`, se R11)
- [ ] T2 · Validação de env com Zod em `src/env/{server,client,runtime}.ts`
  atende: AZ-07, AZ-02 (variável faltando)
  adiciona dependência: zod; server-only (exigido por `rules/secrets.md` passo 1, não pelo ADR; aprovação junto com o plano)
  schema: obrigatória no andar zero só `DATABASE_URL`; `LOG_LEVEL` tem default; `LOG_PRETTY` é opcional (só máquina de dev, ignorada na Vercel) e `PORT` é opcional (default do Next); as do Supabase, do Sentry, do rate limit e `APP_URL` entram como opcionais até a funcionalidade que as usa; `DIRECT_URL` fica fora do schema de runtime (só o `prisma.config.ts` a lê)
  depende de fora do repo: nada
  verifico assim: num clone limpo sem `.env.local` e sem variável na linha de comando, `pnpm build` e `pnpm dev` param com mensagem que cita `DATABASE_URL`; com a `DATABASE_URL` fictícia na linha de comando, os dois passam; `grep -rn "process.env" --include=*.ts --include=*.tsx --include=*.js --include=*.mjs . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=generated` só acha `src/env/` e as exceções aceitas (`prisma.config.ts`, quando existir, conforme R14); toda chave usada está no `.env.example`
- [ ] T3 · Prisma 7: `prisma.config.ts`, `schema.prisma` sem modelo, `src/server/db.ts` com `PrismaPg` e `max: 1`
  atende: pré-requisito de T4 (modelo no schema), T5 e T6
  adiciona dependência: prisma, @prisma/adapter-pg; @prisma/client: necessidade conferida na tarefa contra a documentação do Prisma 7
  altera: `.gitignore` (acrescenta `src/generated/`)
  depende de fora do repo: nada
  verifico assim: `pnpm prisma generate` passa sem `DIRECT_URL` definida (o caso da Vercel); `src/generated/` aparece em `git check-ignore -v`; `pnpm typecheck` sem erro; `grep -n "max: 1" src/server/db.ts` acha a linha
- [ ] T4 · DDL da tabela técnica: modelo Prisma + `ENABLE ROW LEVEL SECURITY` + policy, na resposta, e PARAR; aprovado o DDL, o modelo entra no `schema.prisma` e o client é gerado sem banco
  atende: AZ-03 (passo 1 de `rules/migration.md`)
  adiciona dependência: nenhuma
  depende de fora do repo: aprovação do DDL
  verifico assim: o DDL está na resposta e a pessoa aprova ou corrige; depois da aprovação, `pnpm prisma generate` passa sem banco e `pnpm typecheck` sem erro; nada em `prisma/migrations/` ainda
- [ ] T5 · Migration `add_health_checks_table` com o SQL de RLS, sem aplicar antes de o SQL entrar
  atende: AZ-03
  adiciona dependência: nenhuma
  depende de fora do repo: banco de dev (ou a proposta do R5, se a pessoa a escolher)
  passos: o modelo já está no `schema.prisma` desde a T4; a T5 só gera a migration. (1) `pnpm prisma migrate dev --create-only --name add_health_checks_table`; (2) colar no `migration.sql` gerado o SQL de RLS aprovado na T4; (3) `pnpm prisma migrate dev` para aplicar
  verifico assim: `pnpm prisma migrate status` mostra a migration aplicada; o diff do `migration.sql` contra o DDL da T4 não tem diferença; `pnpm prisma migrate reset` no dev aplica do zero
- [ ] T6 · tRPC: `initTRPC` com superjson, contexto mínimo `{ db }` sem sessão, route handler, `health.check` público e o service
  atende: AZ-04, AZ-02 (banco fora do ar)
  adiciona dependência: @trpc/server, superjson
  depende de: T4 aprovada (o modelo no client tipado); de fora do repo, nada para o caminho de falha e banco de dev para o de sucesso
  contexto: reduzido ao Prisma porque Auth e tenant estão fora do andar zero; o `createContext` do ADR 2.3 (sessão, `tenant_id`, `role`, Prisma) entra com a primeira spec
  `rules/checks.md` passo 3: não se aplica, procedimento técnico sem tenant (`andar-zero.md`, Fora de escopo); nome do caso no formato `az_04` (T7)
  verifico assim: com a `DATABASE_URL` fictícia na linha de comando e sem `.env.local`, `pnpm dev` sobe e `curl http://localhost:3000/api/trpc/health.check` devolve a falha explícita, sem connection string no corpo
- [ ] T7 · Vitest com globalSetup do Testcontainers (`supabase/postgres`, `prisma migrate deploy` do zero, URI por `provide`/`inject`) e teste de `health.check` via `createCaller`
  atende: AZ-06 (e prova AZ-03 e AZ-04)
  adiciona dependência: vitest, @testcontainers/postgresql
  depende de fora do repo: Docker (e a migration da T5; R15 decidido)
  config: alias `@/` por `resolve.alias` no `vitest.config.ts`, sem plugin; `server-only` conforme R15. O globalSetup chama o Prisma CLI com `DIRECT_URL` e `DATABASE_URL` sobrescritas pela URI do container e aborta se o host não for `localhost`/`127.0.0.1`
  nome do caso: formato `az_04`, adaptação do formato `ca_xx` de `rules/tests.md` (passo 5), sujeita a aprovação; `rules/checks.md` passo 3: não se aplica, procedimento técnico sem tenant
  verifico assim: `pnpm test` mostra no resumo os dois casos (banco de pé = ok; URL para porta fechada = falha); o log do globalSetup mostra o host do container; `docker ps` durante a execução mostra o container, e depois não; com o Docker parado, `pnpm test` falha citando o Docker
- [ ] T8 · Cliente tRPC com `@trpc/react-query` e Provider em `src/trpc/`; página da raiz `/` (`src/app/page.tsx`) mostrando o resultado
  atende: AZ-05
  adiciona dependência: @trpc/client, @trpc/react-query, @tanstack/react-query
  depende de fora do repo: nada para mostrar a falha; banco de dev para mostrar sucesso
  verifico assim: com a `DATABASE_URL` fictícia na linha de comando, abrir http://localhost:3000 e ver o estado; na aba Network, a chamada a `/api/trpc/health.check`; `grep -rn "style=" src` vazio
- [ ] T9 · Documentar os comandos (instalar, migrar o dev, rodar) no `README.md` e trocar a seção 8 do `AGENTS.md` pelas quatro seções que ela prevê: Comandos (só com o que já rodou), Mapa de diretórios, Convenções não óbvias e Como testar
  atende: AZ-01
  adiciona dependência: nenhuma
  depende de fora do repo: banco de dev
  verifico assim: verificação feita pela pessoa, que clona em pasta nova, segue só o README (preenchendo o `.env.local` a partir do `.env.example`), vê a página da raiz com o banco ok e cola o resultado; o agente não toca o `.env.local`
- [ ] T10 · Conferência do `.gitignore` e varredura de segredo no repositório e no histórico
  atende: AZ-08
  adiciona dependência: nenhuma
  depende de fora do repo: nada (decisão da pessoa sobre R7)
  verifico assim: `git ls-files | grep -E '(^|/)\.env'` só lista `.env.example`; `git log --all -p | grep -nE 'sb_secret_[A-Za-z0-9_-]{8,}' | grep -vE 'sb_secret_x+[[:space:]]*$'` e, em separado, `git log --all -p | grep -nE 'postgres(ql)?://[^<[:space:]]+:[^<@[:space:]]+@'`; o esperado das duas é vazio, depois de excluir o placeholder documentado do `.env.example`
- [ ] T11 · Tirar o `ignoreCommand` do `vercel.json` e verificar o preview
  atende: AZ-09
  adiciona dependência: nenhuma
  depende de fora do repo: aprovação explícita (`rules/restrictions.md`, Escopo); `DATABASE_URL` no ambiente Preview da Vercel, cadastrada pela pessoa (é a única obrigatória da T2; as opcionais entram com a funcionalidade que as usa, e `DIRECT_URL` não vai para a Vercel); banco de dev com a T5 aplicada, ou a decisão da pessoa de aceitar a página mostrando o estado de falha
  ponto a decidir: para qual banco aponta o `DATABASE_URL` do Preview (o ADR-001, seção 6, não decide ambientes)
  verifico assim: a pessoa lê o log do deploy de preview no painel da Vercel e cola o trecho do build (o agente só o lê com pedido explícito nesta conversa); a URL do preview, na raiz `/`, mostra o resultado

## 4. Riscos e pontos a confirmar

Consultei a documentação oficial (out/2026) e confirmei: Next.js — flags do `create-next-app`, Turbopack e Cache Components padrão, AGENTS.md padrão, `next build` não roda mais lint desde a 16, script `lint` = `eslint`, Node mínimo 20.9. tRPC (docs 11.x) — recomenda o pacote novo. Prisma — `prisma.config.ts` não carrega `.env`, `env()` lança erro com variável ausente, adapter `@prisma/adapter-pg` com `new PrismaPg({ connectionString })`. Testcontainers — pacote `@testcontainers/postgresql`, classe `PostgreSqlContainer(image)`, `getConnectionUri()`; a página não fala de imagem alternativa.

- **R1 · tRPC:** a doc atual diz sobre `@trpc/tanstack-react-query`: "recommend using this over the classic client". O ADR 2.2 diz `@trpc/react-query`. O plano segue o ADR; trocar é decisão do time, por ADR novo.
- **R2 · Nomes que o ADR cita e o scaffold muda:** ADR 2.10 diz `next.config.js`, o scaffold gera `next.config.ts`; ADR 2.3 diz `app/api/trpc/...`, com `src/` vira `src/app/api/trpc/...`. Não muda decisão, mas o ADR aceito não se edita: se o time quiser registrar, é ADR novo, como o ADR-003.
- **R3 · Cache Components** vem ligado por padrão e não está no ADR. Proposta: desligar, já que as telas são Client Components com dado via tRPC. Decisão do time antes da T1.
- **R4 · `.env.local` para o Prisma CLI:** o Prisma não lê `.env` e o Next lê `.env.local`. Caminhos: `dotenv` (fora do ADR, precisa de aprovação), `@next/env` (`loadEnvConfig`; também dependência explícita sob o pnpm, também fora do ADR) ou `node --env-file` num script, que muda os comandos que `rules/restrictions.md` lista. A pessoa decide antes da T3.
- **R5 · Migration sem banco de dev:** `rules/migration.md` exige `migrate dev` contra o dev. **Proposta, a pessoa decide:** gerar o SQL da migration sem banco nenhum, do vazio até o schema, com `pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script -o <pasta da migration>/migration.sql` (flags conferidas na referência do CLI do Prisma 7: `--from-empty`, `--to-schema`, `--script`, `-o`/`--output`); colar nele o SQL de RLS aprovado na T4; salvar como migration em `prisma/migrations/` (nome da pasta e `migration_lock.toml` no formato do Prisma, conferidos na tarefa); e aplicar depois no Testcontainers (T7). Isso tira a T5 da dependência do banco de dev. Contraria o passo 2 da rule, então só com aprovação. Sem isso, T5 e T7 esperam o banco de dev.
- **R6 · Policy da tabela técnica:** ADR 2.7 pede deny by default; `rules/migration.md` pede ao menos uma policy explícita. A T4 propõe negar `anon` e `authenticated` (papéis que existem no Supabase e na imagem `supabase/postgres`, não num Postgres puro).
- **R7 · `.gitignore` libera `.env.test`**, e o AZ-08 diz "exceto `.env.example`". A T10 não escolhe: pergunta.
- **R8 · Validar env no build × `server-only`:** importar `src/env/server.ts` no `next.config.ts` esbarra no `import 'server-only'`. A T2 mostra como resolve antes de commitar.
- **R9 · Previews passam a compilar:** com `package.json` na branch, o `ignoreCommand` deixa de pular o build; cada push depois da T1 gera preview que falha até as variáveis existirem no painel.
- **R10 · Imagem `supabase/postgres` no Testcontainers:** não confirmei que o `PostgreSqlContainer` e a espera de pronto funcionam com ela (usuário, init em duas fases, tamanho do pull). A T7 confere e mostra.
- **R11 · pnpm 11 e Vercel:** o pnpm bloqueia scripts de build de dependências até aprovação, e não confirmei o suporte da Vercel a pnpm 11 e Node 24. A T1 mostra o que foi pedido; a T11 confere no log.
- **R12 · CSP sem `unsafe-inline`** exige nonce para os scripts inline do próprio Next; não é AZ, mas a página do andar zero não usa `style=` para não criar dívida.
- **R13 · ESLint + Prettier + husky (ADR 2.11)** e shadcn/ui não estão nos AZ; ficam fora deste plano, salvo pedido da pessoa.
- **R14 · `prisma.config.ts` lê `process.env`:** por exigência do ADR-003, 2.5, `datasource.url = process.env.DIRECT_URL`; isso contraria `rules/secrets.md` ("nem leia `process.env` fora de `src/env/`"). Pela seção Precedência de `rules/restrictions.md`, paro e aviso: a pessoa decide se a rule ganha a exceção. O plano não resolve; a T3 espera a decisão.
- **R15 · Vitest × `server-only`:** `server-only` lança erro quando importado fora da condição `react-server`, e o teste da T7 via `createCaller` importa `db.ts` e `src/env/server.ts`. A T7 resolve por `resolve.conditions` com `react-server` ou por alias para módulo vazio no `vitest.config.ts`, sem dependência nova, e mostra antes de commitar.

Plano para aprovação. Nenhuma tarefa começa antes de a pessoa aprovar este plano e a proposta de pastas.
