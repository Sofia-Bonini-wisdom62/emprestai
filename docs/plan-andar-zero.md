# Plano — andar zero

Sai de [`docs/andar-zero.md`](andar-zero.md) (critérios AZ-01 a AZ-09) e é restrito por [`docs/adr/001-stack.md`](adr/001-stack.md) e pelos ambientes de [`docs/adr/004-environments.md`](adr/004-environments.md). Não implementa nada do PRD. Nenhuma pergunta de [`docs/perguntas-prd.md`](perguntas-prd.md) é necessária aqui: a tabela técnica não tem domínio nem `tenant_id`.

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
│   │   │   └── routers/  um arquivo por domínio; no andar zero só health.ts e health.test.ts
│   │   └── services/     regra de negócio; no andar zero só health.ts e health.test.ts
│   ├── trpc/             lado cliente do tRPC: cliente, QueryClient e Provider
│   └── generated/prisma/ saída do prisma generate; fora do git
└── tests/                só infraestrutura de teste: globalSetup do Testcontainers e helpers de banco
```

**(a) Convenção do Next.js / create-next-app — herança, não decisão:** `src/app/` e o roteamento por pasta (`page.tsx` na raiz, `api/trpc/[trpc]/route.ts`), `public/`, os arquivos de config na raiz (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`), o alias `@/*`. `pnpm-workspace.yaml`, se aparecer, é convenção do pnpm.

**(b) Já decidido pelo ADR-001 ou por rule:** route handler do tRPC em `api/trpc/[trpc]/route.ts` (2.3); `src/server/api/routers/<domínio>.ts`, um router por domínio (2.3); `prisma/` e `prisma.config.ts` (2.5, com a correção do ADR-003). O ADR fixa também a camada Service entre router e Prisma (2.3) e o singleton do Prisma (2.5), mas não o caminho deles: os caminhos estão no grupo (c). Fixado por `rules/secrets.md`, não pelo ADR: `src/env/{server,client,runtime}.ts`.

**(c) Escolha nossa, proposta aqui — só isto é decisão:**
- `src/` ligado (`--src-dir`). Por que: separa código de config na raiz, que já tem `docs/`, `rules/` e arquivos de agente; sem ele `app/` se mistura a isso.
- `src/trpc/` para o cliente. Por que: o que roda no navegador fica fora de `src/server/`, e a busca de `rules/secrets.md` (segredo em código de cliente) tem um alvo claro.
- `src/generated/prisma/`, ignorado no git e gerado no `postinstall`. Por que: o Prisma 7 exige `output`; dentro de `src/` o alias `@/` alcança, e fora do git não há código gerado para revisar em PR.
- `src/server/services/` para a camada Service. Por que: o ADR 2.3 fixa a camada, não o caminho; ao lado de `src/server/api/`, o service fica do lado do servidor, longe do código de cliente.
- `src/server/db.ts` para o singleton do Prisma. Por que: o ADR 2.5 fixa o singleton, não o caminho; um arquivo só em `src/server/` é o único lugar que instancia o client.
- A página do AZ-05 na raiz `/` (`src/app/page.tsx`), sem rota `/health` separada. Por que: é o que o preview da Vercel abre (AZ-09) e é uma peça a menos. É provisória: quando a spec do catálogo entrar, `/` passa a levar ao catálogo (`docs/layout.md`, seção 6) e a verificação de saúde fica só no procedimento tRPC.
- Teste ao lado do arquivo que testa (`routers/health.test.ts` junto de `routers/health.ts`), e `tests/` na raiz só com a infraestrutura de teste: o globalSetup do Testcontainers e os helpers de banco. Por que: a aula 8 considera boa a feature que toca duas ou três pastas, e uma `tests/` espelhando `src/` seria a quarta; o ADR-001, 2.3, organiza por domínio porque "por domínio, a feature inteira fica junta", e o teste é parte da feature. O globalSetup e os helpers não pertencem a módulo nenhum, por isso ficam em `tests/`. `rules/tests.md` já cobre os dois lugares: `**/*.test.ts` e `tests/**`.
- O teste da policy da tabela técnica (casos `az_03`, T8) em `services/health.test.ts`, junto do service que lê a tabela. Por que: a policy mora na migration, `prisma/migrations/` só guarda o que o Prisma Migrate gera, e o teste fica com o domínio da tabela. Alternativa: um arquivo de teste em `prisma/`. A pessoa escolhe junto com as pastas.
- `routers/health.ts` e `services/health.ts`, embora saúde não seja domínio. Por que: exercita o caminho Router → Service → Prisma que toda feature vai seguir.

**As três perguntas da aula.**
- Onde mora a regra de negócio: em `src/server/services/`, nunca no router (que cuida de entrada, contexto e permissão) nem na tela.
- Quantas pastas uma feature nova toca: três — `src/server/api/routers/` (+ registro no `appRouter`), `src/server/services/` e `src/app/<rota>/`, cada teste ao lado do arquivo que ele testa; mais `prisma/` se tiver tabela nova. Componente de tela entra quando houver shadcn/ui, fora do andar zero.
- O que é convenção e o que é escolha: grupos (a) e (b) acima não estão em revisão; o grupo (c) está, e a pessoa aprova ou troca antes da T1.

## 2. O que o scaffold vai criar

Fonte: documentação oficial do `create-next-app` (página atualizada em 2026-09-29). Confirmei as flags abaixo e que o CLI **cria uma pasta nova** com o nome do projeto. O repositório já tem `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` e `docs/`, então a T1 roda numa pasta temporária **fora do repositório** e copia só o que está listado. Antes de rodar, a T1 executa `pnpm create next-app@<versão estável atual, conferida na tarefa> --help` e mostra a saída; se uma flag não existir, para.

```
pnpm create next-app@<versão> emprestai-scaffold --ts --eslint --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm --no-react-compiler --no-agents-md --no-agent-feedback \
  --disable-git --skip-install [--no-cache-components: ver Riscos, R3]
```

Turbopack vem ligado por padrão (doc). `--no-agents-md` porque o repositório já tem o seu `AGENTS.md`; `--no-*` nega opção padrão, pela doc.

Esperado (conferido contra o resultado real, que a T1 mostra): `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `pnpm-workspace.yaml`, `.gitignore`, `README.md`, `public/*.svg`, `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}`.

O que a T1 faz logo em seguida: copia `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `pnpm-workspace.yaml` e `src/app/`; **não** copia `README.md`, `.gitignore` (o do repositório já cobre o do scaffold; diferença mostrada) nem `next-env.d.ts` (ignorado); remove os SVGs de `public/`, o `next/image` e o conteúdo de exemplo de `page.tsx` (que fica como placeholder mínimo, sem conteúdo de produto, até a T9 pôr nele a página do AZ-05), mas **mantém** o `next/font` do `layout.tsx`, que já traz a Geist, a fonte proposta no ADR-002, servida pelo próprio Next a partir do build, sem CDN em tempo de execução (nada além disso do design system entra no andar zero); acrescenta o script `typecheck` (`tsc --noEmit`), exigido por `rules/checks.md`; acrescenta ao `eslint.config.mjs` as regras descritas na T1; roda `pnpm install` no repositório, o que cria `pnpm-lock.yaml` (e `pnpm-workspace.yaml`, se o pnpm criar ao aprovar builds, R11).

## 3. Tarefas

Sem Docker, depois das decisões indicadas: T1 (pastas + R3), T2, T3, T4, T7 (T4 aprovada; caminho de falha), T9 (caminho de falha, depois da T7). **Esperam o Docker:** T5 (banco de dev local), T6 (a migration, no banco de dev), T8 (testes; também R15), T9 (caminho de sucesso, depois da T6), T10 (AZ-01, com o banco de dev). **Depois da T5 e da T10:** T11 (R7), para a varredura pegar o `compose.yaml` e os comandos. **Espera a pessoa:** T12 (aprovação e painel da Vercel).

Decisões sem documento: o relato de cada tarefa termina com a lista do que o agente precisou decidir sozinho, porque nem os ADRs, nem o `AGENTS.md`, nem as rules diziam (aula 8). A T10 junta essas listas para escrever as Convenções não óbvias e não acrescenta nada que não esteja nelas.

Variáveis nas verificações: o agente não lê nem escreve `.env.local` (`rules/restrictions.md`, Dados e segredos). Onde a verificação pede variáveis presentes, ele passa valores fictícios na linha de comando, sem `.env.local`, por exemplo `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm dev` (porta fechada, sem usuário nem senha). Vale também para o `pnpm build` do passo 6 de `rules/checks.md` a partir da T2.

- [x] T1 · Scaffold do Next.js na raiz do repositório, com o lint da seção Ferramentas de `rules/restrictions.md`
  atende: pré-requisito de T2 a T12
  adiciona dependência: next, react, react-dom, typescript, tailwindcss, eslint (as que o scaffold traz); nenhuma para o lint
  depende de fora do repo: nada
  lint: o `eslint.config.mjs` do scaffold ganha regras que tornam parte da seção Ferramentas de `rules/restrictions.md` garantia em vez de pedido ("Rule é pedido; lint é garantia", aula 9). `linterOptions` com `noInlineConfig: true` (nenhum `eslint-disable` vale) e `reportUnusedDisableDirectives: "error"`; `@typescript-eslint/ban-ts-comment` com `ts-expect-error` e `ts-ignore` em `true`, sem a exceção com descrição que o `recommended` aceita; `no-restricted-syntax` com o seletor `JSXAttribute[name.name='style']`, por causa da CSP sem `unsafe-inline` (ADR-001, 2.10; o ADR-002 já sugeria essa regra); `no-restricted-properties` para `it.only`, `test.only`, `describe.only`, `it.skip`, `test.skip` e `describe.skip`; `@typescript-eslint/no-explicit-any` como erro, o que cobre `as any` (o `recommended` já liga; a T1 confere o nível no config real). Tudo é do ESLint ou do typescript-eslint que o `eslint-config-next/typescript` já traz (ele parte do `recommended` do typescript-eslint); a T1 confere no config real e para se alguma regra ou opção não existir. Continua só como regra: afrouxar `tsconfig`. Exceção inevitável deixa de caber num comentário na linha: vira mudança no `eslint.config.mjs`, que já pede aprovação
  verifico assim: `pnpm dev` e abrir http://localhost:3000; `pnpm lint` e `pnpm typecheck` sem erro; um arquivo temporário em `src/` (ex.: `src/lint-check.tsx`) com uma violação de cada regra (`style=` com um `eslint-disable-next-line` em cima, `@ts-ignore`, `@ts-expect-error` com descrição, um `as any` e os seis `.only`/`.skip`) faz `pnpm lint` falhar com um erro por violação, inclusive a que está sob o `eslint-disable`; o arquivo é removido e `pnpm lint` volta a passar; `git status --short` só com a lista da seção 2 + `pnpm-lock.yaml` (+ `pnpm-workspace.yaml`, se R11), sem o arquivo temporário
- [x] Fora da numeração · Landing provisória em `src/app/page.tsx`, com os tokens de `docs/layout.md` em `src/app/globals.css`
  atende: nenhum AZ; pedido direto da pessoa em 2026-11-05, para o deploy não ficar vazio
  adiciona dependência: nenhuma
  depende de fora do repo: nada
  verifico assim: `pnpm lint`, `pnpm typecheck` e `pnpm build` sem erro; a página abre em 1024px e em 375px sem rolagem lateral
- [x] T2 · Validação de env com Zod em `src/env/{server,client,runtime}.ts`
  atende: AZ-07, AZ-02 (variável faltando)
  adiciona dependência: zod; server-only (exigido por `rules/secrets.md` passo 1, não pelo ADR; aprovação junto com o plano)
  schema: obrigatória no andar zero só `DATABASE_URL`; `LOG_LEVEL` tem default; `LOG_PRETTY` é opcional (só máquina de dev, ignorada na Vercel) e `PORT` é opcional (default do Next); as do Supabase, do Sentry, do rate limit e `APP_URL` entram como opcionais até a funcionalidade que as usa; `DIRECT_URL` fica fora do schema de runtime (só o `prisma.config.ts` a lê)
  depende de fora do repo: nada
  verifico assim: num clone limpo sem `.env.local` e sem variável na linha de comando, `pnpm build` e `pnpm dev` param com mensagem que cita `DATABASE_URL`; com a `DATABASE_URL` fictícia na linha de comando, os dois passam; `grep -rn "process.env" --include=*.ts --include=*.tsx --include=*.js --include=*.mjs . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=generated` só acha `src/env/` e as exceções aceitas (`prisma.config.ts`, quando existir, conforme R14); toda chave usada está no `.env.example`
- [x] T3 · Prisma 7: `prisma.config.ts`, `schema.prisma` sem modelo, `src/server/db.ts` com `PrismaPg` e `max: 1`
  atende: pré-requisito de T4 (modelo no schema), T5 (verificação pelo Prisma CLI), T6 e T7
  adiciona dependência: prisma 7.10.1 (versão exata: o `latest` do npm aponta para o 8.0.0-rc, fora do ADR), @prisma/adapter-pg, @prisma/client; `pnpm-workspace.yaml` libera os scripts de build de `prisma` e `@prisma/engines`
  altera: `.gitignore` e `eslint.config.mjs`, os dois passam a ignorar `src/generated/`. O client gerado do Prisma 7 abre com `/* eslint-disable */` e `// @ts-nocheck`, que o `noInlineConfig` da T1 deixa de respeitar; no ESLint em flat config, o `.gitignore` não vale, então a exceção entra por `globalIgnores(["src/generated/**"])`, de `eslint/config`, sem dependência nova. É a única exceção do lint neste plano e é aprovada junto com ele
  depende de fora do repo: nada
  verifico assim: `pnpm prisma generate` passa sem `DIRECT_URL` definida (o caso da Vercel); `src/generated/` aparece em `git check-ignore -v`; `pnpm typecheck` sem erro; `grep -n "max: 1" src/server/db.ts` acha a linha; `pnpm lint` sem erro com o client gerado presente
- [ ] T4 · DDL da tabela técnica: modelo Prisma + `ENABLE ROW LEVEL SECURITY` + policy, na resposta, e PARAR; aprovado o DDL, o modelo entra no `schema.prisma` e o client é gerado sem banco
  atende: AZ-03 (passo 1 de `rules/migration.md`)
  adiciona dependência: nenhuma
  depende de fora do repo: aprovação do DDL
  verifico assim: o DDL está na resposta e a pessoa aprova ou corrige; depois da aprovação, `pnpm prisma generate` passa sem banco e `pnpm typecheck` sem erro; nada em `prisma/migrations/` ainda
- [ ] T5 · Banco de dev local: `compose.yaml` com a imagem `supabase/postgres`
  atende: AZ-01 (o banco de dev sobe com um comando); pré-requisito da T6 e da T10
  adiciona dependência: nenhuma de pacote; usa o Docker Compose do Docker Desktop (ADR-004)
  altera: cria `compose.yaml` na raiz; acrescenta ao `.env.example` a variável da senha local, com placeholder e a indicação de que ela só vive no `.env.local` (`rules/secrets.md`, passo 3), e avisa que o valor falta lá
  depende de: T3 (Prisma CLI, para a verificação); de fora do repo, o Docker de pé
  detalhes: a T5 escolhe a tag da imagem e confere que ela sobe; a T8 reaproveita a mesma tag no Testcontainers (R10); porta ligada só a `127.0.0.1`; volume nomeado, para o dado sobreviver a `docker compose down`; senha lida do `.env.local`, nunca escrita no `compose.yaml`; nada de Supabase CLI (`rules/restrictions.md`, Bancos e schema). Antes de commitar, a tarefa mostra como o compose recebe a senha: do `.env.local`, para a pessoa, e por variável na linha de comando, para a verificação do agente, que não abre o `.env.local`
  verifico assim: com a senha fictícia na linha de comando, `docker compose up -d` e `docker compose ps` mostram o serviço saudável; `docker compose port` mostra só `127.0.0.1`; `pnpm prisma migrate status`, com a URL fictícia do banco local na linha de comando, conecta e não acha migration; `docker compose down` seguido de `up -d` mantém o volume; `grep -n -i password compose.yaml` só mostra a referência à variável (`${...}`), sem valor
- [ ] T6 · Migration `add_health_checks_table` com o SQL de RLS, sem aplicar antes de o SQL entrar
  atende: AZ-03
  adiciona dependência: nenhuma
  depende de: T5 (banco de dev local de pé); de fora do repo, o Docker
  teste da policy: o caso que prova o bloqueio (`rules/tests.md`, passo 3) entra na T8, no mesmo PR do andar zero; a migration não chega à `main` sem ele
  passos: o modelo já está no `schema.prisma` desde a T4; a T6 só gera a migration. (1) `pnpm prisma migrate dev --create-only --name add_health_checks_table`; (2) colar no `migration.sql` gerado o SQL de RLS aprovado na T4; (3) `pnpm prisma migrate dev` para aplicar
  verifico assim: `pnpm prisma migrate status` mostra a migration aplicada; o diff do `migration.sql` contra o DDL da T4 não tem diferença; `pnpm prisma migrate reset` no dev local aplica do zero
- [ ] T7 · tRPC: `initTRPC` com superjson, contexto mínimo `{ db }` sem sessão, route handler, `health.check` público e o service
  atende: AZ-04, AZ-02 (banco fora do ar)
  adiciona dependência: @trpc/server, superjson
  depende de: T4 aprovada (o modelo no client tipado); de fora do repo, nada para o caminho de falha e banco de dev para o de sucesso
  contexto: reduzido ao Prisma porque Auth e tenant estão fora do andar zero; o `createContext` do ADR 2.3 (sessão, `tenant_id`, `role`, Prisma) entra com a primeira spec
  `rules/checks.md` passo 3: não se aplica, procedimento técnico sem tenant (`andar-zero.md`, Fora de escopo); nome do caso no formato `az_04` (T8)
  verifico assim: com a `DATABASE_URL` fictícia na linha de comando e sem `.env.local`, `pnpm dev` sobe e `curl http://localhost:3000/api/trpc/health.check` devolve a falha explícita, sem connection string no corpo
- [ ] T8 · Vitest com globalSetup do Testcontainers (`supabase/postgres`, `prisma migrate deploy` do zero, URI por `provide`/`inject`), teste de `health.check` via `createCaller` e teste da policy da tabela técnica
  atende: AZ-06 e AZ-03 pela policy (casos `az_03`); prova também o AZ-04 e a migration do AZ-03 aplicada do zero
  adiciona dependência: vitest, @testcontainers/postgresql
  depende de fora do repo: Docker (e a migration da T6; R15 decidido)
  config: alias `@/` por `resolve.alias` no `vitest.config.ts`, sem plugin; `server-only` conforme R15; sem `include` próprio, porque o padrão do Vitest (`**/*.{test,spec}.?(c|m)[jt]s?(x)`, conferido na doc em 2026-10-26) acha o teste ao lado do código, e o globalSetup em `tests/` não casa com ele (quando o Playwright entrar, fora do andar zero, os `*.spec.ts` dele também casam e vão pedir `exclude`). O globalSetup chama o Prisma CLI com `DIRECT_URL` e `DATABASE_URL` sobrescritas pela URI do container e aborta se o host não for `localhost`/`127.0.0.1`
  arquivos: `src/server/api/routers/health.test.ts` (casos `az_04`) e `src/server/services/health.test.ts` (casos `az_03`), cada um ao lado do que testa; em `tests/`, só o globalSetup e os helpers de banco
  caso da policy: o Prisma da aplicação conecta como dono da tabela e passa por cima da RLS (ADR-001, 2.7), por isso o caso troca de papel. Numa transação: insere uma linha como dono e confere que o dono a lê; `SET LOCAL ROLE authenticated`; consulta a tabela técnica. Passa com erro de permissão (SQLSTATE `42501`; outro erro falha o caso) ou zero linhas, e falha com qualquer linha. O mesmo, em outra transação, com `anon`. Nenhuma das duas é confirmada. Cumpre o passo 3 de `rules/tests.md`: tabela com policy chega com o teste que prova o bloqueio
  nome do caso: formato `az_03` e `az_04`, adaptação do formato `ca_xx` de `rules/tests.md` (passo 5), sujeita a aprovação; `rules/checks.md` passo 3: não se aplica, procedimento técnico sem tenant
  verifico assim: `pnpm test` lista os dois arquivos de `src/` e mostra no resumo os casos `az_04` (banco de pé = ok; URL para porta fechada = falha) e os dois `az_03` (`authenticated` e `anon` não leem a linha que o dono lê); o log do globalSetup mostra o host do container; `docker ps` durante a execução mostra o container, e depois não; com o Docker parado, `pnpm test` falha citando o Docker
- [ ] T9 · Cliente tRPC com `@trpc/react-query` e Provider em `src/trpc/`; a landing da raiz `/` (`src/app/page.tsx`) passa a mostrar o resultado
  atende: AZ-05
  adiciona dependência: @trpc/client, @trpc/react-query, @tanstack/react-query
  depende de fora do repo: nada para mostrar a falha; banco de dev para mostrar sucesso
  verifico assim: com a `DATABASE_URL` fictícia na linha de comando, abrir http://localhost:3000 e ver o estado de falha; na aba Network, a chamada a `/api/trpc/health.check`; `grep -rn "style=" src` vazio. Com o banco de dev de pé e a T6 aplicada, a mesma página mostra o banco ok: é o que prova que tela, servidor e banco se falam (AZ-05)
- [ ] T10 · Trocar a seção 8 do `AGENTS.md` pelas quatro seções que ela prevê: Comandos (só com o que já rodou), Mapa de diretórios, Convenções não óbvias e Como testar; documentar os comandos (instalar, subir e derrubar o banco de dev, migrar, rodar) só na seção Comandos, com um link para ela no `README.md`; enxugar o que o `CLAUDE.md` carrega em toda mensagem
  atende: AZ-01; confirma o AZ-05 com o banco ok
  adiciona dependência: nenhuma
  depende de: T5 a T9 (os comandos, a página e os testes que as seções novas descrevem); de fora do repo, o Docker
  convenções: as Convenções não óbvias saem só das listas de decisões que cada tarefa anotou no relato (seção 3, abertura); o Mapa de diretórios sai da seção 1 aprovada
  altera: `AGENTS.md`, `README.md`, `rules/checks.md`
  comandos num lugar só: o `README.md` não repete comando, só aponta a seção Comandos do `AGENTS.md` ("a mesma instrução nunca vai para dois lugares", aula 9)
  enxugamento: o `CLAUDE.md` carrega `AGENTS.md`, `rules/restrictions.md`, `rules/checks.md` e `rules/operacao.md` em toda mensagem, hoje mais de 340 linhas (a T10 mede de novo antes de começar, com `wc -l`), e a aula 9 pede curto o que paga pedágio em toda mensagem. (1) a tabela de infraestrutura do `AGENTS.md` (seção 11) sai para o `README.md`, juntada à que ele já tem, sem linha repetida, e o `AGENTS.md` aponta para lá; (2) a seção 8 provisória dá lugar às quatro seções acima; (3) o texto de `rules/checks.md` sobre passos que ainda não dá para rodar encolhe, porque os comandos passam a existir. Meta: abaixo de 250 linhas, sem perder regra. As três mudanças tiram cerca de 20 linhas e as quatro seções novas devolvem parte delas; o resto do corte não está decidido: a T10 mede, lista o que mais sairia ou encurtaria e para antes de cortar
  verifico assim: verificação feita pela pessoa, que clona em pasta nova, segue só a seção Comandos do `AGENTS.md` (pode chegar a ela pelo link do `README.md`), preenchendo o `.env.local` a partir do `.env.example`, vê a página da raiz com o banco ok e cola o resultado; o agente não toca o `.env.local`. Enxugamento: `wc -l AGENTS.md rules/restrictions.md rules/checks.md rules/operacao.md` antes e depois, com o total abaixo de 250; no diff, cada linha que sai de um dos quatro arquivos tem destino (o `README.md` ou a forma curta no mesmo arquivo), e nenhuma regra é removida
- [ ] T11 · Conferência do `.gitignore` e varredura de segredo no repositório e no histórico
  atende: AZ-08
  adiciona dependência: nenhuma
  depende de: T5 e T10, para a varredura pegar o `compose.yaml` e os comandos documentados; de fora do repo, nada (decisão da pessoa sobre R7)
  verifico assim: `git ls-files | grep -E '(^|/)\.env'` só lista `.env.example`; `git log --all -p | grep -nE 'sb_secret_[A-Za-z0-9_-]{8,}' | grep -vE 'sb_secret_x+[[:space:]]*$'` e, em separado, `git log --all -p | grep -nE 'postgres(ql)?://[^<[:space:]]+:[^<@$[:space:]]+@'` e `git log --all -p | grep -nE '(^|[^{A-Za-z_])[A-Z_]*PASSWORD[A-Z_]*[=:][[:space:]]*["]?[^<$[:space:]{"]'` (as duas ignoram referência a variável, como `${POSTGRES_PASSWORD}`, e placeholder entre `< >`); o esperado das três é vazio, depois de excluir o placeholder documentado do `.env.example`
- [ ] T12 · Tirar o `ignoreCommand` do `vercel.json` e verificar o preview
  atende: AZ-09
  adiciona dependência: nenhuma
  depende de fora do repo: aprovação explícita (`rules/restrictions.md`, Escopo); `DATABASE_URL` no ambiente Preview da Vercel, cadastrada pela pessoa com um valor que não aponta para banco nenhum (ADR-004; nunca a URL de produção) (é a única obrigatória da T2; as opcionais entram com a funcionalidade que as usa, e `DIRECT_URL` não vai para a Vercel)
  banco do Preview: nenhum (ADR-004); a página mostra o estado de falha do procedimento de saúde, e é isso que o AZ-09 espera
  verifico assim: a pessoa lê o log do deploy de preview no painel da Vercel e cola o trecho do build (o agente só o lê com pedido explícito nesta conversa); a URL do preview, na raiz `/`, mostra o estado de falha

## 4. Riscos e pontos a confirmar

Consultei a documentação oficial (out/2026) e confirmei: Next.js — flags do `create-next-app`, Turbopack e Cache Components padrão, AGENTS.md padrão, `next build` não roda mais lint desde a 16, script `lint` = `eslint`, Node mínimo 20.9. tRPC (docs 11.x) — recomenda o pacote novo. Prisma — `prisma.config.ts` não carrega `.env`, `env()` lança erro com variável ausente, adapter `@prisma/adapter-pg` com `new PrismaPg({ connectionString })`. Testcontainers — pacote `@testcontainers/postgresql`, classe `PostgreSqlContainer(image)`, `getConnectionUri()`; a página não fala de imagem alternativa. Vitest — `include` padrão `**/*.{test,spec}.?(c|m)[jt]s?(x)`, `exclude` padrão só `node_modules` e `.git`. ESLint — com `linterOptions.noInlineConfig`, toda configuração inline é ignorada; `reportUnusedDisableDirectives` recebe severidade. typescript-eslint — o `recommended` liga `ban-ts-comment` aceitando `@ts-expect-error` com descrição; o `eslint-config-next/typescript` parte do `recommended`.

- **R1 · tRPC:** a doc atual diz sobre `@trpc/tanstack-react-query`: "recommend using this over the classic client". O ADR 2.2 diz `@trpc/react-query`. O plano segue o ADR; trocar é decisão do time, por ADR novo.
- **R2 · Nomes que o ADR cita e o scaffold muda:** ADR 2.10 diz `next.config.js`, o scaffold gera `next.config.ts`; ADR 2.3 diz `app/api/trpc/...`, com `src/` vira `src/app/api/trpc/...`. Não muda decisão, mas o ADR aceito não se edita: se o time quiser registrar, é ADR novo, como o ADR-003.
- **R3 · Cache Components** vem ligado por padrão e não está no ADR. Proposta: desligar, já que as telas são Client Components com dado via tRPC. Decisão do time antes da T1.
- **R4 · `.env.local` para o Prisma CLI:** decidido pela pessoa em 2026-11-05. O `prisma.config.ts` carrega o `.env.local` com `process.loadEnvFile`, do Node 24, quando o arquivo existir. Não pede dependência nova nem muda os comandos que `rules/restrictions.md` lista.
- **R5 · Migration sem banco de dev:** superado pelo ADR-004. Com o banco de dev local da T5, a T6 gera e aplica a migration por `migrate dev`, como `rules/migration.md` pede. A alternativa de gerar o SQL sem banco (`prisma migrate diff --from-empty`) não é mais necessária e não entra no plano.
- **R6 · Policy da tabela técnica:** ADR 2.7 pede deny by default; `rules/migration.md` pede ao menos uma policy explícita. A T4 propõe negar `anon` e `authenticated` (papéis que existem no Supabase e na imagem `supabase/postgres`, não num Postgres puro).
- **R7 · `.gitignore` libera `.env.test`**, e o AZ-08 diz "exceto `.env.example`". A T11 não escolhe: pergunta.
- **R8 · Validar env no build × `server-only`:** resolvido na T2. O schema fica em `src/env/schema.ts`, sem `server-only`; o `src/env/server.ts` e o `next.config.ts` usam esse arquivo.
- **R9 · Previews passam a compilar:** com `package.json` na branch, o `ignoreCommand` deixa de pular o build; cada push depois da T1 gera preview que falha até as variáveis existirem no painel; no Preview, o `DATABASE_URL` é o valor sem banco do ADR-004.
- **R10 · Imagem `supabase/postgres` no Testcontainers:** não confirmei que o `PostgreSqlContainer` e a espera de pronto funcionam com ela (usuário, init em duas fases, tamanho do pull), nem que o usuário da conexão consegue `SET ROLE` para `anon` e `authenticated` (precisa ser superusuário ou membro desses papéis; casos `az_03`). A T5 escolhe a tag e confere que a imagem sobe; a T8 usa a mesma tag e confere o resto (`PostgreSqlContainer`, espera de pronto e `SET ROLE`).
- **R11 · pnpm 11 e Vercel:** o pnpm bloqueia scripts de build de dependências até aprovação, e não confirmei o suporte da Vercel a pnpm 11 e Node 24. A T1 mostra o que foi pedido; a T12 confere no log.
- **R12 · CSP sem `unsafe-inline`** exige nonce para os scripts inline do próprio Next; não é AZ, mas a página do andar zero não usa `style=` para não criar dívida, e o lint da T1 passa a barrar o atributo.
- **R13 · Qualidade de código (ADR 2.11):** o ESLint entra na T1, com as regras de lint de lá. Prettier, o pré-commit com lint-staged + husky e o shadcn/ui não estão nos AZ; ficam fora deste plano, salvo pedido da pessoa.
- **R14 · `prisma.config.ts` lê `process.env`:** decidido pela pessoa em 2026-11-05. O ADR-003, 2.5, exige `datasource.url = process.env.DIRECT_URL`, e `rules/secrets.md` ganha a exceção para esse arquivo na T3.
- **R15 · Vitest × `server-only`:** `server-only` lança erro quando importado fora da condição `react-server`, e o teste da T8 via `createCaller` importa `db.ts` e `src/env/server.ts`. A T8 resolve por `resolve.conditions` com `react-server` ou por alias para módulo vazio no `vitest.config.ts`, sem dependência nova, e mostra antes de commitar.

## 5. Depois do andar zero

Não são tarefas deste plano: são os passos da aula 8 que vêm em seguida.

- **O que o agente decidiu sozinho.** A aula 8 faz essa pergunta logo depois do esqueleto, porque a lista só existe enquanto a sessão está viva. Aqui cada tarefa é uma rodada, então cada relato já traz a sua lista (seção 3, abertura), e a T10 junta as listas nas Convenções não óbvias. Depois do merge, a conferência final: o que dessa lista é decisão cara de mudar vira candidato a ADR, e o que é comportamento vira pergunta para a spec.
- **O porquê das pastas.** Registrar a razão da estrutura da seção 1 num ADR novo de organização do código (o próximo número livre em `docs/adr/`; o ADR-002 da aula aqui já é o design system) ou só no Mapa de diretórios do `AGENTS.md`. Decisão do time, pela régua da aula 8: se mudar é caro ou alguém vai perguntar o porquê, ADR; se é só onde as coisas estão, `AGENTS.md`.
- **A tag `andar-zero`**, criada pela pessoa no `main`, depois do merge do PR do andar zero. Marca o ponto de partida da primeira funcionalidade.
- **O workflow do GitHub Actions** com `prisma migrate deploy` e o Deploy Hook (`docs/andar-zero.md`, Fora de escopo). Mexer em `.github/workflows/` pede aprovação explícita (`rules/restrictions.md`, Escopo).
- **A spec 001**: uma funcionalidade do PRD que atravesse banco, servidor e tela (aula 9). Começa pelo passo 1 de `rules/spec-flow.md`: as perguntas que o PRD não responde sobre ela vão para `docs/perguntas-prd.md`, e PARA.

Plano para aprovação. Nenhuma tarefa começa antes de a pessoa aprovar este plano e a proposta de pastas.
