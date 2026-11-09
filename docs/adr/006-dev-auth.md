# ADR-006 — Como o desenvolvimento autentica

| Campo | Valor |
|---|---|
| Status | Proposto em 2026-11-09. Quem aceita é o time ([`rules/restrictions.md`](../../rules/restrictions.md), seção Autoridade), depois de responder aos itens de "Antes de aceitar", na seção 2 |
| Data | 2026-11-09 |
| Turma | B |
| Vínculo | [`docs/plan-andar-zero.md`](../plan-andar-zero.md), seção 5.2, item 3; [ADR-004](004-environments.md), seções 4 a 6. Escrito sobre a branch `feat/walking-skeleton` (PR #11), que traz o `compose.yaml`, os testes e a seção 5.2 do plano citados aqui |
| Substitui | Do [ADR-004](004-environments.md): na seção 2, a linha Desenvolvimento e os itens "Dev local no Docker" e "Sem Supabase CLI"; na seção 4, o item "Dev e testes usam a mesma imagem". Do [ADR-001](001-stack.md): a linha "Dono do schema", na seção 2.5. Ao aceitar, a linha de Status dos dois aponta para este ADR |
| Decide | Onde o Supabase Auth roda na máquina, como a aplicação chega a ele, com que chaves, e o que isso muda no banco de dev e nos testes. É o que o ADR-004, seção 6, deixou de fora |

---

## 1. Contexto

O Supabase Auth não roda no Postgres local do `compose.yaml` (ADR-004, seção 4). Enquanto não havia login, isso não pesava; a spec 001, de login, precisa dele. O ADR-004 deixava a escolha para a spec de login; o plano do andar zero, seção 5.2, item 3, passou a decisão para um ADR. Não há vaga para um projeto remoto de dev: o plano gratuito permite dois projetos ativos, somando as organizações em que a pessoa é dona ou administradora (ADR-004, seção 1). O Supabase CLI é proibido (`rules/restrictions.md`, Bancos e schema). O ADR-001, 2.7, fixa e-mail e senha, cadastro fechado por convite, `@supabase/ssr` e renovação de sessão em toda rota, que no Next 16 é o `proxy.ts` (ADR-003, 2.7). O ADR-003, 2.8, exige E2E de login no Playwright.

O que a pesquisa achou na documentação oficial e no código dos repositórios da Supabase, em 2026-11-09 (fontes na seção 7), mais uma sondagem da imagem `supabase/postgres:17.11.0.018` num contêiner descartável:

- **O Auth roda sozinho.** É o servidor `supabase/auth`, publicado como imagem `supabase/gotrue`. O `docker-compose.yml` oficial de self-hosting (versão 0.8.4, de 2026-11-05) fixa `supabase/gotrue:v2.197.0`. As variáveis obrigatórias são o driver e a URL do banco, o segredo do JWT, `API_EXTERNAL_URL` e `SITE_URL`. Ao subir, ele aplica as próprias migrations no schema `auth`.
- **O cliente sempre chama `/auth/v1`.** O `supabase-js`, e por ele o `@supabase/ssr`, monta a URL do Auth como `<SUPABASE_URL>/auth/v1`, sem opção para trocá-la. O Auth responde na raiz (`/token`, `/invite`). No self-hosting oficial, quem tira o prefixo é o gateway. O padrão é o Envoy desde a versão 0.8.0; o Kong ficou opcional e vai sair.
- **O gateway também cuida das chaves.** O Auth não lê o header `apikey`: lê só o JWT do `Authorization`. Nas rotas abertas (login por senha, renovação, verificação), ele não exige chave; nas de admin (`/invite`, `/admin`), exige um JWT com papel `service_role`. As chaves novas (`sb_publishable_`, `sb_secret_`) não são JWT. No self-hosting, é o gateway que as valida e as troca por um JWT assinado. A Supabase aposenta as chaves legadas `anon` e `service_role` na plataforma até o fim de 2026, em data ainda não fechada.
- **A imagem já traz o papel do Auth, sem senha.** `supabase_auth_admin` existe, com LOGIN e sem senha. O `pg_hba` da imagem só dispensa senha no loopback; vinda de outro contêiner, a conexão pede senha. No self-hosting oficial, a senha vem de um script SQL de inicialização (`roles.sql`), que só roda com o volume vazio.
- **O schema `auth` da imagem é o inicial, de 2018.** Cinco tabelas, `auth.users` entre elas, e as funções `uid()`, `role()` e `email()`, que leem só `request.jwt.claim.*`. Não tem `auth.jwt()`, `auth.identities` nem `auth.sessions`: isso vem das 75 migrations que o Auth v2.197.0 aplica ao subir, que também redefinem `uid()`, `role()` e `email()` para ler `request.jwt.claims`. O papel `postgres`, dono das nossas tabelas, pode criar FK para `auth.users`, mas não pode criar objeto em `auth`.
- **Convite sem servidor de e-mail.** Pelo código do Auth, com `SMTP_HOST` vazio ele usa um mailer que descarta a mensagem, e o convite não falha. `auth.admin.generateLink`, com tipo `invite`, cria o usuário convidado e devolve o link sem enviar nada. Toda chamada de admin exige credencial de admin.
- **Assinatura e `getClaims`.** Com chave assimétrica (ES256), o `getClaims()` verifica o token localmente, pelo JWKS; com segredo HS256, chama o Auth a cada vez. Segundo o anúncio da Supabase, projetos hospedados novos usam chave assimétrica por padrão desde 2025-10-01, e projeto restaurado depois de 2025-11-01 já não tem as chaves legadas. Como o projeto de produção está, não foi verificado: o agente não acessa o painel.

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Onde o Auth roda no dev | Contêiner `supabase/gotrue`, na tag do self-hosting oficial (hoje `v2.197.0`), no `compose.yaml`, ao lado do `db` e apontado para ele |
| Caminho `/auth/v1` | Gateway Envoy (`envoyproxy/envoy`, na tag do self-hosting oficial, hoje `v1.39.6`), com a configuração oficial reduzida à rota do Auth. Porta só em `127.0.0.1`, como a do banco; o Auth não publica porta |
| Chaves e assinatura | Chaves novas (`sb_publishable_`, `sb_secret_`) e assinatura ES256, geradas para a máquina, no formato que o ADR-003, 2.10, e o `.env.example` já fixam |
| Dono de cada schema | Prisma Migrate: `public`. Supabase Auth: `auth`, como na produção |
| Senha de `supabase_auth_admin` | Script de inicialização versionado, montado no `compose.yaml`, que só define essa senha, a partir da `POSTGRES_PASSWORD` |
| E-mail no dev | Nenhum servidor de e-mail. Convite por `auth.admin.generateLink`, que devolve o link sem enviar |
| Teste de procedimento (`createCaller`) | Sem Auth: a sessão (usuário, tenant e papel) entra no contexto como dado |
| Banco dos testes (Testcontainers) | Continua sem Auth. A imagem já traz `auth.users`; o que uma migration pode referenciar em `auth` decide a spec 001 (seção 4) |
| E2E de login (Playwright) | Numa pilha efêmera (Postgres, Auth e gateway), que sobe com o teste e some depois. Nunca no banco de dev |

- **Auth em contêiner** — é o único caminho que traz o Auth para a máquina sem CLI, sem vaga nova no plano gratuito e sem custo. É o servidor que a produção roda, então convite, senha, cookie e renovação de sessão rodam de verdade no dev e no E2E. Versão e tipo de chave conferem depois do item 8 de "Antes de aceitar".
- **Envoy, e não rewrite do Next** — o cliente sempre chama `/auth/v1`, e o gateway é o caminho documentado para servir esse prefixo. Ele também valida a `apikey` e traduz as chaves novas. Sem ele, não há checagem de `apikey`, e o servidor chamaria o admin com um JWT de `service_role`, não com a `sb_secret_`.
- **Chaves novas e ES256** — são o formato que o ADR-003 e o `.env.example` fixam, as legadas saem da plataforma, e com ES256 o `getClaims()` do `proxy.ts` segue no dev o caminho da produção.
- **Um dono por schema** — o ADR-001 fixa o Prisma Migrate como dono único e diz que dois donos de schema no mesmo banco se sobrescrevem. Este ADR lê "único" por schema: o Prisma não toca `auth`, e o `postgres` nem tem permissão para criar objetos lá. Na produção, o Auth hospedado já é dono de `auth`, no mesmo banco das nossas tabelas.
- **Script só para a senha** — é o que o self-hosting oficial faz. Copiar o `roles.sql` oficial inteiro quebraria a inicialização da nossa imagem, porque ele altera um papel que ela não cria (`supabase_functions_admin`). O script roda uma vez, na criação do volume.
- **Convite sem e-mail** — nenhuma imagem a mais: o link sai da própria API de admin.
- **Testes sem Auth** — o teste de procedimento recebe a sessão pronta e não depende de rede.
- **E2E efêmero** — `rules/restrictions.md` proíbe teste no banco de dev. A pilha do E2E nasce e morre com o teste, com os mesmos serviços do dev.

### Trechos substituídos

**ADR-004, seção 2.** A linha Desenvolvimento da tabela passa a ser:

| Ambiente | Banco | Quem escreve nele |
|---|---|---|
| Desenvolvimento | Postgres local em Docker, imagem `supabase/postgres`, a mesma dos testes, subido por `docker compose` a partir de um `compose.yaml` versionado, com o Supabase Auth e o gateway ao lado (ADR-006) | Os comandos do Prisma listados em `rules/restrictions.md`, a aplicação rodando na máquina e, só no schema `auth`, o servidor de Auth |

- **Dev local no Docker** — sobe com um comando, sem custo e sem depender de vaga no plano gratuito. É a mesma imagem dos testes, com os papéis `anon` e `authenticated`. O schema `public` é o mesmo nos dois; o `auth` do dev é o migrado pelo Auth, e o dos testes é o inicial da imagem (ADR-006, seção 4).
- **Sem Supabase CLI** — o `compose.yaml` sobe o Postgres, o Supabase Auth e o gateway. Nada de `supabase start`, `supabase db reset` nem `supabase migration new`: o Prisma Migrate continua dono do `public`, e o Auth, do `auth` (ADR-006).

**ADR-004, seção 4.** O item "Dev e testes usam a mesma imagem" passa a ser: dev e testes usam a mesma imagem; o schema `public` é o mesmo nos dois, e o `auth` não (ADR-006, seção 4).

**ADR-001, seção 2.5.** A linha "Dono do schema" passa a ser:

| Item | Escolha |
|---|---|
| Dono do schema | Prisma Migrate, único dono do `public`. O schema `auth` é do Supabase Auth, na produção e no dev |

### Antes de aceitar: o que o time decide

Esta decisão esbarra em regras e depende de verificações que só a pessoa faz. Sem resposta para cada item, ela não vira Aceito.

1. **Um dono por schema.** Confirmar a leitura do ADR-001, 2.5, como um dono por schema, e não um por banco, que é como a produção já funciona com o Auth hospedado.
2. **Quem escreve no banco de dev.** O Auth aplica as próprias migrations em `auth` (DDL e funções SQL) e grava usuários. `rules/restrictions.md` (Bancos e schema) e o `AGENTS.md`, seção 6, só listam os comandos do Prisma e a aplicação. Aceitar pede acrescentar "e o servidor de Auth, só no schema `auth`" e dizer se a revisão humana de função SQL vale para as migrations do Auth. Proposta: não vale, porque são o schema do fornecedor, o mesmo da produção.
3. **SQL de inicialização.** A regra diz "nada de SQL à mão" no banco de dev. O script de senha é SQL, versionado, e roda sozinho na criação do volume: aceitá-lo pede escrever a exceção. Como ele só roda com o volume vazio, a pessoa recria o volume de dev, que só tem dado fictício (`docker compose --env-file .env.local down -v`), e migra de novo. Há duas saídas sem SQL, nenhuma documentada nem testada: o Auth entrar pela rede do contêiner do banco (`network_mode`), onde o loopback dispensa senha; ou conectar como `supabase_admin`, o superusuário, o que muda o dono dos objetos de `auth` em relação à produção.
4. **Chave secreta local.** A regra proíbe a `SUPABASE_SECRET_KEY` no `.env.local`, e o convite exige uma credencial de admin no dev. O setup do E2E também precisa dela, e `rules/secrets.md` só deixa ler `process.env` fora de `src/env/` em duas exceções. Proposta: a regra passa a proibir a chave *de produção*; o `.env.local` recebe só a chave gerada para o Auth da máquina; e o setup do E2E vira a terceira exceção de `rules/secrets.md`, só com essa chave.
5. **Pilha do E2E.** Pelo Testcontainers, que a regra já permite, o E2E pede o pacote `testcontainers` como dependência direta (hoje ele só vem com o `@testcontainers/postgresql`), para subir o Auth e o gateway na mesma rede do Postgres. Por um projeto compose descartável (`docker compose -p <nome>`, removido com `down -v`), pede exceção escrita à regra "Testes: só Testcontainers". Proposta: Testcontainers.
6. **Imagens novas.** `supabase/gotrue` e `envoyproxy/envoy` contam como dependência nova (`rules/operacao.md`). Aprovar as duas, nas tags acima.
7. **Prova antes ou depois de aceitar.** O self-hosting oficial testa o Auth com `supabase/postgres:17.6.1.136`, e o projeto usa `17.11.0.018`. A configuração do Envoy reduzida à rota do Auth também não foi testada. O time escolhe: autorizar uma prova descartável antes de aceitar, com as duas imagens aprovadas só para ela; ou aceitar com o gatilho da seção 5, e, se a prova falhar depois, a correção vira ADR novo.
8. **Conferir a produção.** No painel, se o projeto `emprestai` assina com chave assimétrica e tem as chaves novas; por `GET /auth/v1/health`, a versão do Auth. Só a pessoa faz isso. O projeto está pausado e, ao ser restaurado, já não terá as chaves legadas. Se mesmo assim a produção estiver em HS256 com chaves legadas, a linha "Chaves e assinatura" volta para decisão, porque o modo legado contraria o ADR-003, 2.10.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Supabase CLI (`supabase start`) | Proibido. Sobe a pilha inteira, com um Postgres próprio que a opção de exclusão não tira: seria um quarto banco. Aplica as próprias migrations e o seed, e o `supabase db reset` recria o banco só com as migrations dele, sem as do Prisma. A documentação recomenda 7 GB de RAM |
| Projeto remoto de dev no plano gratuito | Sem vaga: dois projetos ativos por pessoa, somando as organizações em que ela é dona ou administradora. Pausa depois de uma semana sem uso e seria um banco remoto a mais |
| Plano Pro com projeto de dev | Cerca de US$ 35 por mês (US$ 25 do Pro mais cerca de US$ 10 de um projeto Micro), ou cerca de US$ 25 com o dev num projeto gratuito de outra organização. Custo recorrente num projeto de disciplina |
| Branching do Supabase | Exige o Pro e custa US$ 0,01344 por hora por branch, fora dos créditos. Roda as migrations da pasta do CLI, não as do Prisma, e liga o projeto de produção ao fluxo |
| Auth do projeto de produção no dev | O agente nunca toca a produção, e as contas de dev e de produção seriam as mesmas. É o motivo pelo qual o ADR-004 já descartou um schema `dev` no projeto de produção |
| Pilha completa do self-hosting | Onze serviços, com mínimo documentado de 4 GB de RAM e 40 GB de disco, e um Postgres próprio, em outra tag. Do conjunto, o projeto só usa o Auth e o gateway |
| Auth em contêiner sem gateway, com rewrite do Next para `/auth/v1` | Uma imagem a menos, mas é um caminho que a Supabase não documenta. O `proxy.ts` roda antes dos rewrites e precisaria excluir a rota. Sem gateway não há checagem de `apikey`, e o servidor chamaria o admin com um JWT de `service_role`, não com a `sb_secret_` |
| Sessão falsa só no dev | O ramo de atalho fica no código que vai para a produção. Se a variável que o liga chegar ao Preview ou à produção, vira atalho de login e de isolamento de tenant, a primeira regra de precedência do `AGENTS.md`. Não exercita cookie, renovação nem convite, e o primeiro login de verdade aconteceria na produção |

---

## 4. Consequências

### Fica mais fácil

- O login roda inteiro na máquina e no E2E: convite, senha, cookie, renovação no `proxy.ts` e saída.
- O dev roda o servidor de Auth que a produção roda; versão, chave e assinatura conferem depois do item 8 de "Antes de aceitar".
- O teste de procedimento continua rápido e sem rede: a sessão entra no contexto como dado.

### Fica mais difícil

- O `compose.yaml` passa de um serviço para três, com a configuração do Envoy copiada do repositório oficial e mantida na mesma versão.
- O `.env.local` ganha variáveis: as chaves geradas, o segredo e as chaves de assinatura. A geração usa o script oficial `add-new-auth-keys.sh` numa cópia fora do repositório, e quem preenche o `.env.local` é a pessoa. Numa máquina limpa, é um passo a mais além do que o AZ-01 promete, fora dos comandos do repositório.
- O schema `auth` do dev, migrado pelo Auth, fica diferente do dos testes, que é o inicial da imagem. `auth.jwt()`, `auth.identities` e `auth.sessions` só existem no dev. `auth.uid()`, `auth.role()` e `auth.email()` existem nos dois, mas nos testes leem só `request.jwt.claim.*`, e no dev também `request.jwt.claims`, a configuração que o ADR-001, 2.7, cita. Policy ou migration que use essas peças passa no dev e quebra ou muda de resultado nos testes. O que uma migration pode referenciar em `auth` decide a spec 001; para a FK para `auth.users`, a Supabase recomenda `ON DELETE CASCADE`.
- Qualquer referência ao schema `auth` numa migration, seja FK ou função em policy, quebra o `prisma migrate dev`: o shadow database nasce vazio, clonado do `template1`, sem o schema `auth`. `rules/migration.md` exige o `migrate dev`. A saída do Prisma 7 (tabelas externas com `initShadowDb`) está em Preview, atrás de flag experimental, e pede aprovação. A spec 001 resolve.
- A versão do Auth da máquina precisa acompanhar a da produção. Pelo versionamento do Auth, só as versões patch garantem os objetos do banco.
- Qualquer tela com login depende de mais dois contêineres de pé.

### O que isso impede de fazer depois sem custo

- Trocar de gateway: a configuração do Envoy entra no repositório.
- Ler o e-mail de convite de verdade na máquina: exige um servidor de e-mail de teste, que é outra imagem.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| O Auth na tag do self-hosting não sobe sobre `supabase/postgres:17.11.0.018`, ou o Envoy não funciona só com a rota do Auth | O ADR inteiro; a correção vira ADR novo |
| A produção não usa chave assimétrica nem as chaves novas ("Antes de aceitar", item 8) | Chaves e assinatura, que volta para decisão por contrariar o ADR-003, 2.10 |
| Abre vaga no plano gratuito ou o projeto passa a ter plano pago | Auth em contêiner, contra um projeto remoto de dev |
| A Supabase documenta um modo oficial de rodar só o Auth na máquina, sem CLI | Auth e gateway no `compose.yaml` |
| Um teste precisa do schema `auth` completo | Banco dos testes sem Auth |
| O self-hosting troca de gateway de novo ou deixa de traduzir as chaves novas | Caminho `/auth/v1` |

---

## 6. O que este ADR não decide

- A tela e o fluxo de login, quem cria as contas e se há tela de convite na v1 (pergunta 5 de `docs/perguntas-prd.md`). É a spec 001.
- Como o usuário do Auth se liga ao tenant (`memberships`), a modelagem da FK para `auth.users` e o que mais uma migration pode referenciar em `auth`. É a spec 001.
- O Preview. Hoje ele tem a URL e a chave publishable do projeto de produção, e o `.env.example` deixa para a spec de login decidir se continua assim. Tirar as variáveis do Preview é passo da pessoa no painel.
- O cookie `httpOnly`. O ADR-001, 2.7, diz que o `@supabase/ssr` escreve o cookie `httpOnly`. O padrão da biblioteca é `httpOnly: false`, que dá para mudar, e a Supabase diz que `HttpOnly` não é necessário, porque o lado do navegador precisa do refresh token. Os dois documentos discordam, e a justificativa da CSP no ADR-001, 2.10, depende desse cookie. Este ADR não escolhe: a divergência fica como pendência da spec 001.
- O job de CI que roda o E2E. Decide-se no PR do workflow.
- Os valores das variáveis e o texto do `.env.example`, inclusive os comentários que hoje dizem que a spec de login decide como o dev autentica. Ficam com a tarefa que implementa. As mudanças em `rules/` e no `AGENTS.md` dependem das respostas de "Antes de aceitar".

---

## 7. Fontes

Consultadas em 2026-11-09. A maioria das páginas da Supabase não mostra data.

- Self-hosting com Docker: https://supabase.com/docs/guides/self-hosting/docker
- `docker-compose.yml`, `.env.example`, `volumes/` e CHANGELOG do self-hosting: https://github.com/supabase/supabase/tree/master/docker
- Chaves no self-hosting: https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys
- Gateway Envoy no self-hosting: https://supabase.com/docs/guides/self-hosting/self-hosted-envoy
- Servidor de Auth (README, rotas, configuração, mailer e migrations): https://github.com/supabase/auth
- Imagem do Postgres (scripts de inicialização e `pg_hba`): https://github.com/supabase/postgres
- `supabase-js` (montagem da URL do Auth): https://github.com/supabase/supabase-js
- Chaves de API: https://supabase.com/docs/guides/api/api-keys
- Chaves de assinatura, cronograma e `getClaims`: https://supabase.com/docs/guides/auth/signing-keys, https://supabase.com/blog/jwt-signing-keys e https://supabase.com/docs/reference/javascript/auth-getclaims
- SSR no Next.js e cookies: https://supabase.com/docs/guides/auth/server-side/nextjs e https://supabase.com/docs/guides/auth/server-side/advanced-guide
- API de admin: https://supabase.com/docs/reference/javascript/admin-api
- Dados de usuário e FK para `auth.users`: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase CLI: https://supabase.com/docs/reference/cli/supabase-start e https://supabase.com/docs/guides/local-development/cli-workflows
- Preços, limite de projetos e branching: https://supabase.com/pricing, https://supabase.com/docs/guides/platform/billing-on-supabase e https://supabase.com/docs/guides/deployment
- Prisma 7, shadow database e tabelas externas: https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database e https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/externally-managed-tables
- Testcontainers, redes: https://node.testcontainers.org/features/networking/
- Next.js, `proxy.ts`: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
