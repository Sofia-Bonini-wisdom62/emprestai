# 001 — Login

Status: rascunho
Atualizada em: 2026-11-11

## Objetivo

Quem foi convidado entra no emprestai com e-mail e senha e cai na tela do seu papel; quem não tem conta, ou teve a conta bloqueada, não entra.

## Vínculo

- PRD: `docs/PRD.md`, seção "O que precisa existir na primeira versão", item 1, com as respostas 5, 5b, 6, 15 e 22 a 29 de `docs/perguntas-prd.md`.
- Restringe: `docs/adr/001-stack.md`, seções 2.6, 2.7, 2.8 e 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/002-design-system.md`; `docs/adr/004-environments.md`; `docs/adr/005-first-tenant-name.md`; `docs/adr/006-dev-auth.md`, inclusive "Respostas e prova"; `docs/adr/007-production-deploy-cli.md`. Aparência: `docs/layout.md`, seções 5, 6 (tela 1), 8, 9 e 11.
- Assume pronto: nada. O andar zero e o ADR-006 aceito já estão na `main`.

## Regras

- RN-01 — A conta só nasce por convite, sem cadastro aberto, sem tela para convidar e sem tabela de convite no emprestai. Origem: ADR-001, 2.7; resposta 5.
- RN-02 — Em produção, o convite é feito no painel do Supabase e chega por e-mail. Origem: respostas 5 e 22.
- RN-03 — No dev, o convite sai por `auth.admin.generateLink`, sem e-mail, e o primeiro administrador vem do seed. Origem: resposta 5; ADR-006, seção 2.
- RN-04 — Entrar é por e-mail e senha, no Supabase Auth. Origem: ADR-001, 2.7.
- RN-05 — Existem dois papéis, Colaborador e Operações, e administrador é o mesmo papel que Operações. Origem: resposta 23.
- RN-06 — O papel fica no vínculo da pessoa com a área, em `memberships (tenant_id, user_id, role)`. Origem: resposta 6; ADR-001, 2.6.
- RN-07 — Na v1 só existe a área `default`, sem troca de área. Origem: resposta 29; ADR-005.
- RN-08 — O papel de Operações é dado por uma operação administrativa no servidor, sem tela na v1. Origem: resposta 23.
- RN-09 — A área e o papel saem da sessão, resolvidos no `createContext`, nunca do input. Origem: ADR-001, 2.6.
- RN-10 — A conta guarda nome, e-mail e senha, e a pessoa preenche o nome no primeiro acesso, num campo só. Origem: resposta 26.
- RN-11 — Depois de entrar, Colaborador cai em `/catalog`, e Operações em `/operations/loans`. Origem: resposta 28; `docs/layout.md`, seção 6.
- RN-12 — O erro de entrada é "E-mail ou senha incorretos.", sem dizer qual dos dois errou. Origem: `docs/layout.md`, seção 6, tela 1.
- RN-13 — O login não tem "esqueci minha senha" e mostra "Sem acesso? Fale com Operações." como texto, não como link. Origem: resposta 15; `docs/layout.md`, seção 6, tela 1.
- RN-14 — A sessão não tem limite automático de tempo. Origem: resposta 27.
- RN-15 — Operações bloqueia no painel do Supabase a conta de quem sai da empresa, e a conta bloqueada não entra. Origem: resposta 25.
- RN-16 — Sem sessão, as telas do produto levam a `/login`, e a raiz `/` e o `health.check` continuam públicos até a spec do catálogo. Origem: `docs/layout.md`, seção 6 (quem acessa cada tela); `docs/plan-andar-zero.md`, seção 5.4.

## Critérios de aceitação

Pessoas e e-mails fictícios de `docs/layout.md`, seção 10.

- CA-01 — Dado Beatriz Fontes (`beatriz.fontes@example.com`), com senha, nome e papel Colaborador na `default`, quando ela entra em `/login` com o e-mail e a senha certos, então chega em `/catalog`, e o header mostra "Beatriz Fontes" e o "Sair".
- CA-02 — Dado Flávia Rocha (`flavia.rocha@example.com`), com senha, nome e papel Operações na `default`, quando ela entra com o e-mail e a senha certos, então chega em `/operations/loans`.
- CA-03 — Dado `beatriz.fontes@example.com` com a senha errada, e dado `ninguem@example.com`, que não tem conta, quando cada um tenta entrar, então os dois ficam em `/login` com a mesma mensagem, "E-mail ou senha incorretos.", e nenhum cookie de sessão é gravado.
- CA-04 — Dado Caio Moreira (`caio.moreira@example.com`) com a conta bloqueada no Auth, quando ele tenta entrar com a senha certa, então fica em `/login` e nenhum cookie de sessão é gravado. A mensagem espera o item 11, e o bloqueio da conta de teste, o item 12.
- CA-05 — Dado uma conta convidada sem vínculo, quando ela entra pela primeira vez, então `memberships` ganha uma linha de Colaborador na `default`, e uma segunda entrada não cria outra. Espera o item 6.
- CA-06 — Dado uma conta sem nome, quando ela entra, então vai para a tela do item 7 antes de qualquer outra tela do produto. Nome vazio ou só com espaços não é salvo e mostra a mensagem do item 11; salvo o nome, ela segue para o destino do papel.
- CA-07 — Dado um convite gerado por `auth.admin.generateLink` para `enzo.paiva@example.com`, quando a pessoa abre o link, define a senha e informa "Enzo Paiva", então entra e chega em `/catalog` como Colaborador. Espera os itens 6 e 7.
- CA-08 — Sem sessão, abrir `/catalog` ou `/operations/loans` leva a `/login`. A raiz `/` continua abrindo a landing, e `GET /api/trpc/health.check` continua respondendo `{ status: "ok" }` ou `{ status: "unavailable", message }`, como no AZ-04 e no AZ-05.
- CA-09 — Sem sessão, `account.me` falha com `UNAUTHORIZED`. Pela rota HTTP (`GET /api/trpc/account.me`), a resposta é 401, e o corpo não traz nome, e-mail nem papel.
- CA-10 — Com sessão de Colaborador, um procedimento montado com `adminProcedure` falha com `FORBIDDEN` antes de chamar o service. Nesta spec esse procedimento só existe no teste; o primeiro de verdade chega com a spec da tela de Operações.
- CA-11 — Dado Beatriz Fontes com sessão, quando ela usa "Sair", então os cookies de sessão são apagados e ela vai para `/login`; abrir `/catalog` em seguida leva a `/login`.
- CA-12 — A tela `/login` não tem link de criar conta nem de recuperar senha. Ela mostra "Sem acesso? Fale com Operações." como texto, a senha com mostrar e ocultar (botão com nome acessível) e o botão "Entrar". No desktop, duas colunas; em 375px, uma só, sem rolagem lateral. O ponto da troca espera o item 11.
- CA-13 — Num banco vazio com o Auth de pé, rodar `pnpm prisma db seed` duas vezes deixa uma área `default` e a conta de Flávia Rocha, com nome (no lugar que o item 2 escolher) e papel Operações, sem duplicar nada. É essa conta que o CA-02 usa. Espera os itens 2, 6 e 12.
- CA-14 — **Isolamento:** dado as áreas A e B e uma pessoa com vínculo só em A, `account.enter`, `account.me` e `account.setName` não leem nem alteram vínculo, papel ou nome de quem está em B. A área usada é sempre a da sessão, e um `tenantId` mandado no input é recusado na validação. Os papéis `anon` e `authenticated` não leem nenhuma linha das tabelas novas.
- CA-15 — No dev, com o `compose.yaml` de pé, `GET /auth/v1/health` pelo gateway responde 200 com a chave publishable da máquina e 401 sem chave (ADR-006).
- CA-16 — A resposta de `/login` traz `Content-Security-Policy` sem `unsafe-inline`, e `/login` e o header abrem sem violação de CSP no console. Espera o item 13.
- CA-17 — Dado Beatriz Fontes com o token de acesso vencido e o refresh válido, quando ela abre `/catalog`, então o cookie de sessão é renovado e ela continua em `/catalog`, sem passar por `/login`.

## Fora de escopo / não decidido

- Fora de escopo: a metade "cada pessoa vê os próprios empréstimos" do item 1 do PRD, que é da spec de Meus empréstimos; tela e tabela de convite (resposta 5); "esqueci minha senha" dentro do emprestai (resposta 15); limite automático de sessão (resposta 27); troca de área (resposta 29); notificação por e-mail, que o PRD tira da v1 (o convite não conta, resposta 22); notificação no app e o sino no header (resposta 10); a busca do header, que é da spec do catálogo (resposta 11b); o conteúdo do catálogo e de Empréstimos em aberto, das specs do catálogo e da tela de Operações; o contador de itens e a navegação lateral, das specs de empréstimo.
- Não decidido: os itens abaixo. Enquanto houver item aqui, o status não passa de rascunho. Cada item diz quem decide; "proposta" é do agente e não vale até a pessoa aceitar.

1. **Cookie `httpOnly` e onde o login roda.** O ADR-001, 2.7, diz que o `@supabase/ssr` escreve o cookie `httpOnly`. O padrão da biblioteca é `httpOnly: false`, e a Supabase diz que não é necessário, porque o lado do navegador precisa do refresh token. A justificativa da CSP no ADR-001, 2.10, depende desse cookie (ADR-006, seção 6). A escolha decide onde o login roda, se no navegador, direto no Auth, ou no servidor, por procedimento tRPC e Route Handler. Ela decide também se o rate limit do ADR-001, 2.10, alcança o login: ele só alcança se o login passar pelo servidor. Proposta: login, aceite de convite e saída no servidor, cookie `httpOnly`, nenhum cliente Supabase no navegador. Quem decide: a pessoa; se mudar o ADR-001, vira ADR novo.
2. **Ligação com `auth.users`.** Qualquer referência a `auth` numa migration quebra o `prisma migrate dev`, porque o shadow database nasce sem o schema `auth`, e `rules/migration.md` exige esse comando (ADR-006, seção 4). Para a FK: (a) tabelas externas do Prisma 7 com `initShadowDb`, em Preview, atrás de flag experimental, o que pede aprovação; (b) `user_id` sem FK, com a coerência pela aplicação, o que pesa menos porque a v1 bloqueia contas e não as apaga (resposta 25); (c) `shadowDatabaseUrl` num banco com o schema `auth`, que é um banco a mais e esbarra no "três e só três" do `AGENTS.md`, seção 6. Com FK, a Supabase recomenda `ON DELETE CASCADE`. Falta decidir também se policy pode usar funções de `auth`, como `auth.uid()`, que no dev e nos testes leem configurações diferentes (ADR-006, seção 4). Para o nome, que o ADR-001, 2.6, só aceita fora de `tenant_id` se não for dado de domínio: (a) tabela `profiles`, sem `tenant_id`, lendo o nome como dado da pessoa; (b) coluna `name` em `memberships`; (c) metadado do usuário no Auth, fora do Prisma. Quem decide: a pessoa.
3. **Preview.** Hoje o Preview tem a URL e a chave publishable do projeto de produção (`.env.example`). Mantidas, o login no Preview fala com o Auth de produção, mas o Preview não tem banco, e a entrada falha no vínculo. Tiradas, o Preview fica sem Auth, como já fica sem banco (ADR-004). Proposta: tirar, e o `/login` do Preview mostra o estado de falha. Quem decide e tira as variáveis do painel: a pessoa.
4. **Chave de `role` e nomes novos.** O glossário do `AGENTS.md` tem `member` para colaborador e `operations`, e `admin` agora é o mesmo papel que `operations` (resposta 23); o modelo de referência usa `COLLABORATOR` e `ADMIN`. Esta spec traz ainda dois nomes sem tradução fixa: `account`, para o router, e `profiles`, se o item 2 escolher essa tabela. Proposta: `member` e `operations`; o `adminProcedure` do ADR-001 mantém o nome e exige `operations`; "conta → `account`" entra no glossário. Quem decide: a pessoa.
5. **Primeiro administrador em produção.** A resposta 5b põe um passo do workflow de produção para gravar a área `default` e o vínculo de Operações. Só que o ADR-004, seção 2, e o `AGENTS.md`, seção 6, dizem que dado de produção só a aplicação na Vercel grava, e o GitHub Actions só muda o schema. Os documentos discordam: seguir a 5b pede um ADR novo que substitua a coluna "Quem escreve" da produção. A 5b deixou para esta spec o nome do secret, como o passo grava sem SQL à mão e o que ele faz se a conta ainda não existe, e a resposta 23 não diz como outra conta recebe o papel de Operações. Proposta, se o ADR sair: secret `FIRST_ADMIN_EMAIL`; um script versionado, com o Prisma Client, cria a `default` e o vínculo por `upsert` e acha a conta pelo e-mail numa consulta parametrizada; conta inexistente gera aviso, e a rodada seguinte completa. O CA e a tarefa desse passo nascem com a decisão. Quem decide: a pessoa, pelo ADR. Mexer em `.github/workflows/` pede aprovação explícita.
6. **Quem não tem vínculo vira Colaborador na `default`.** As respostas 23 e 29 dizem isso. O ADR-005, seção 4, diz que a `default` não é um tenant de reserva para onde cai quem não tem vínculo. Os documentos discordam. Conciliação possível: a v1 cria o vínculo por regra explícita da resposta 23, e a `default` continua sem ser destino implícito no código; ou um ADR novo substitui esse trecho do ADR-005. Até a decisão, o CA-05, o CA-07, o CA-13 e o `account.enter` esperam. Quem decide: a pessoa.
7. **Tela que recebe o link do convite.** Pergunta 30 de `docs/perguntas-prd.md`, que também pergunta pelo link de redefinição, já que a resposta 24 diz que a v1 continua sem tela de recuperação. Proposta: uma tela só, na moldura do login, que pede a senha e, se faltar, o nome; se a redefinição também cair nela, a resposta 24 muda. Quem decide: a pessoa, e o `docs/layout.md` ganha a tela.
8. **Colaborador numa rota de Operações.** Pergunta 31. O servidor já nega o dado (CA-10); a dúvida é a tela. Proposta: levar ao catálogo. Quem decide: a pessoa.
9. **Sessão aberta de conta bloqueada.** Pergunta 32. O ADR-006 já justifica as chaves ES256 com o `getClaims()` no `proxy.ts`, que confere o token localmente e só percebe o bloqueio quando o token vence; o `getUser()` consulta o Auth a cada chamada. A escolha vale para o `proxy.ts`, para o `createContext` ou para os dois. Quem decide: a pessoa.
10. **Painel de produção e e-mail.** O provedor de e-mail transacional da resposta 22 vira ADR novo (ADR-001, seção 6). Os modelos de e-mail de convite e de redefinição precisam apontar para a tela do item 7, e o painel precisa da URL do site e dos redirects permitidos. A redefinição pelo painel (resposta 24) só vira regra depois de a pessoa conferi-la no painel. Convidar, redefinir e bloquear exigem acesso ao painel de produção, que hoje só a pessoa tem e que é separado do papel `operations` do app (nota da resposta 25). Nada disso trava o dev nem o E2E. Quem decide: o time, pelo ADR. Quem configura, confere e dá acesso ao painel: a pessoa.
11. **Comportamentos de tela sem fonte.** Propostas: quem abre `/login` já com sessão vai para o destino do papel; as duas colunas começam em 1024px; nome vazio mostra "Informe seu nome.", com até 80 caracteres; a conta bloqueada e qualquer falha do servidor ou do gateway (que responde `Unauthorized` em texto puro, ADR-006, "Respostas e prova") mostram a mesma mensagem genérica do RN-12; o "Sair" fica no menu do usuário, presente em toda tela, o que lê o "sempre visível" da resposta 27 contra o `docs/layout.md`, seção 5, que põe o "Sair" só nesse menu. Quem decide: a pessoa.
12. **Exceções de segredo.** O seed cria a conta de Operações pela API de admin, então usa a `SUPABASE_SECRET_KEY` da máquina num script que roda fora do Next, onde o `server-only` não funciona. `rules/secrets.md` só aceita a chave em módulo `server-only` e tem exceção apenas para o setup do E2E. Essa exceção vale para a chave "gerada para o Auth da máquina" e "para convidar", mas o E2E roda numa pilha efêmera, com chave própria, e também bloqueia conta (CA-04). Proposta: estender a exceção ao seed e ao setup do E2E, só com chaves locais e só para criar, convidar e bloquear contas de teste. Quem decide: a pessoa.
13. **O que entra nesta spec, das decisões do ADR-001 sem tarefa** (`docs/plan-andar-zero.md`, seção 5.5). Proposta:
    - entram os cabeçalhos HTTP e a CSP sem `unsafe-inline` (CA-16), porque o login é a primeira tela com shadcn/ui e o `docs/layout.md`, seção 11, pede a conferência nela;
    - entram as páginas provisórias de `/catalog` e `/operations/loans`, só com o header;
    - o rate limit entra se o item 1 levar o login ao servidor, e aí ganha CA, tarefa e a tabela do contador, com o DDL para aprovação;
    - Prettier, lint-staged e husky, que a 5.5 punha antes desta spec, seguem como tarefa própria;
    - log JSON e Sentry ficam fora.

    A auditoria pesa mais: o ADR-001, 2.10, a quer "desde o início", e `memberships` é a primeira tabela de domínio que recebe escrita. Deixá-la de fora pede ADR novo; trazê-la pede CA, tarefa e revisão humana (`rules/restrictions.md`). Quem decide: a pessoa.
14. **Dependências.** O plano lista os pacotes de cada tarefa. A pessoa decide se aprovar o plano vale como o "pedir antes" de `rules/operacao.md`, ou se cada tarefa pede de novo, com a versão exata. O `@supabase/supabase-js` não está nomeado no ADR-001, 2.7; entra por ser dependência obrigatória (peer) do `@supabase/ssr`. O shadcn/ui é instalado por CLI, que só roda depois de a lista do que ele cria ser mostrada (`rules/restrictions.md`, Escopo). Quem decide: a pessoa.

## Contrato afetado

- Endpoint: `account.enter` — novo, mutação, sem input (`z.void()`). Garante o vínculo da primeira entrada (item 6) e devolve o destino: `/catalog`, `/operations/loans` ou a tela do item 7.
- Endpoint: `account.me` — novo, consulta, sem input. Devolve nome, e-mail e papel da sessão, para o header.
- Endpoint: `account.setName` — novo, mutação. Input `{ name }`, sem espaços nas pontas, com o limite do item 11. Devolve o destino do papel.
- Endpoint: entrar e sair, se o item 1 levar o login ao servidor.
- Contexto: o `createContext` passa a montar `{ db, session, tenantId, role }` a partir do cookie, com `protectedProcedure`, `tenantProcedure` e `adminProcedure` (ADR-001, 2.7).
- Tela: `/login`, nova; a tela do item 7, nova; `/catalog` e `/operations/loans`, provisórias, só com o header (item 13); o header com o nome e o menu "Sair", novo.
- Sessão: `proxy.ts`, novo, renova a sessão em toda rota e manda a `/login` quem abre uma tela do produto sem sessão (ADR-003, 2.7).
- Tabela: `tenants (id, slug, name)`, com a linha `default`; `memberships (id, tenant_id, user_id, role, created_at)`, única por `(tenant_id, user_id)`; o lugar do nome e a FK para `auth.users`, item 2. Todas com RLS e policy explícita na mesma migration (ADR-001, 2.7; `rules/migration.md`).
- Ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e, só no servidor, `SUPABASE_SECRET_KEY`, já no `.env.example`, mas com as linhas `onde:` desatualizadas pelo ADR-006. A obrigatoriedade no Preview segue o item 3.
- **Não pode mudar:** a raiz `/` pública e o `health.check` público, com o contrato do AZ-04, do AZ-05 e do AZ-09; os casos `az_03`, `az_04` e `adr_001` dos testes; e a regra de que área e papel vêm da sessão, nunca do input.
