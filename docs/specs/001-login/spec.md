# 001 — Login

Status: rascunho
Atualizada em: 2026-11-11

## Objetivo

Quem foi convidado entra no emprestai com e-mail e senha e cai na tela do seu papel; quem não tem conta, ou teve a conta bloqueada, não entra.

## Vínculo

- PRD: `docs/PRD.md`, seção "O que precisa existir na primeira versão", item 1, com as respostas 5, 5b, 6, 15 e 22 a 32 de `docs/perguntas-prd.md`.
- Restringe: `docs/adr/001-stack.md`, seções 2.6, 2.7, 2.8 e 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/002-design-system.md`; `docs/adr/004-environments.md`; `docs/adr/005-first-tenant-name.md`; `docs/adr/006-dev-auth.md`; `docs/adr/007-production-deploy-cli.md`; e, ainda como Proposto, o ADR-008 (PR #20), o `docs/adr/009-production-first-admin.md` e o `docs/adr/010-audit-from-loans.md`. Aparência: `docs/layout.md`, seções 5, 6 (telas 1 e 7), 8, 9 e 11.
- Assume pronto: nada. O andar zero e o ADR-006 aceito já estão na `main`.

## Regras

"Decisão de 2026-11-11" é a resposta da pessoa às propostas do rascunho desta spec.

- RN-01 — A conta só nasce por convite, sem cadastro aberto, sem tela para convidar e sem tabela de convite no emprestai. Origem: ADR-001, 2.7; resposta 5.
- RN-02 — Em produção, o convite é feito no painel do Supabase e chega por e-mail, pelo SMTP do ADR-008. Origem: respostas 5 e 22; ADR-008.
- RN-03 — No dev, o convite sai por `auth.admin.generateLink`, sem e-mail, e o primeiro administrador vem do seed. Origem: resposta 5; ADR-006, seção 2.
- RN-04 — Em produção, um passo do workflow, depois do `prisma migrate deploy`, cria a `default` e dá o papel de Operações à conta do secret `FIRST_ADMIN_EMAIL`, sem SQL à mão. Origem: resposta 5b; ADR-009.
- RN-05 — Na v1, só a pessoa que conduz o projeto acessa o painel do Supabase de produção, onde se convida, se redefine a senha e se bloqueia a conta. Origem: nota da resposta 25; decisão de 2026-11-11.
- RN-06 — Entrar é por e-mail e senha, no Supabase Auth. Origem: ADR-001, 2.7.
- RN-07 — Entrar, aceitar o convite, redefinir a senha e sair rodam no servidor, e o navegador não tem cliente Supabase. Origem: ADR-001, 2.7; decisão de 2026-11-11.
- RN-08 — O cookie de sessão é `httpOnly`. Origem: ADR-001, 2.7; decisão de 2026-11-11.
- RN-09 — O login é limitado por IP e por e-mail, com contador no Postgres. Origem: ADR-001, 2.10; decisão de 2026-11-11.
- RN-10 — Existem dois papéis, `member` (Colaborador) e `operations` (Operações), e administrador é o mesmo papel que Operações. Origem: resposta 23; decisão de 2026-11-11.
- RN-11 — O papel fica no vínculo da pessoa com a área, em `memberships (tenant_id, user_id, role)`. Origem: resposta 6; ADR-001, 2.6.
- RN-12 — Na v1 só existe a área `default`, sem troca de área. Origem: resposta 29; ADR-005.
- RN-13 — Na primeira entrada, quem não tem vínculo ganha o de Colaborador na `default` por regra explícita, e o código não trata a `default` como destino implícito. Origem: respostas 23 e 29; ADR-005, seção 4; decisão de 2026-11-11.
- RN-14 — O papel de Operações é dado por uma operação administrativa no servidor, sem tela na v1. Origem: resposta 23.
- RN-15 — A área e o papel saem da sessão, resolvidos no `createContext`, nunca do input. Origem: ADR-001, 2.6.
- RN-16 — O `adminProcedure` exige o papel `operations`. Origem: ADR-001, 2.7; decisão de 2026-11-11.
- RN-17 — O nome mora em `profiles`, sem `tenant_id`, porque é dado da pessoa e não da área. Origem: resposta 26; decisão de 2026-11-11.
- RN-18 — `memberships` e `profiles` guardam o id do Auth sem FK para `auth.users`, e a coerência fica com a aplicação, porque a v1 bloqueia contas e não as apaga. Origem: resposta 25; decisão de 2026-11-11.
- RN-19 — Nenhuma policy usa funções do schema `auth`. Origem: ADR-006, seção 4; decisão de 2026-11-11.
- RN-20 — A pessoa preenche o nome no primeiro acesso, num campo só, com até 80 caracteres. Origem: resposta 26; decisão de 2026-11-11.
- RN-21 — O link do convite e o da redefinição caem em `/account/setup`, na moldura do login, que pede senha e nome no convite e só a senha na redefinição. Origem: respostas 24 e 30.
- RN-22 — Depois de entrar, Colaborador cai em `/catalog`, e Operações em `/operations/loans`. Origem: resposta 28; `docs/layout.md`, seção 6.
- RN-23 — Quem abre `/login` já com sessão vai para o destino do papel. Origem: decisão de 2026-11-11.
- RN-24 — Colaborador que abre uma tela de Operações vai para `/catalog`. Origem: resposta 31.
- RN-25 — O erro de entrada é "E-mail ou senha incorretos.", também para conta bloqueada e para qualquer falha do servidor ou do gateway, menos o limite de tentativas. Origem: `docs/layout.md`, seção 6, tela 1; decisão de 2026-11-11.
- RN-26 — Quem passa do limite de tentativas vê "Muitas tentativas. Tente de novo em alguns minutos.". Origem: ADR-001, 2.10; texto desta spec.
- RN-27 — Nome vazio ou só com espaços mostra "Informe seu nome.". Origem: decisão de 2026-11-11.
- RN-28 — O login não tem "esqueci minha senha" e mostra "Sem acesso? Fale com Operações." como texto, não como link. Origem: resposta 15; `docs/layout.md`, seção 6, tela 1.
- RN-29 — A tela de login tem duas colunas a partir de 1024px e uma abaixo disso. Origem: `docs/layout.md`, seção 6, tela 1; decisão de 2026-11-11.
- RN-30 — A sessão não tem limite automático de tempo, e o "Sair" fica no menu do usuário, presente em toda tela com header. Origem: resposta 27; `docs/layout.md`, seção 5; decisão de 2026-11-11.
- RN-31 — O `proxy.ts` confere a sessão com `getClaims()`, e o `createContext` de toda chamada tRPC confere com `getUser()`. Origem: resposta 32.
- RN-32 — A conta bloqueada no painel não entra e perde o acesso aos dados na chamada seguinte ao servidor. Origem: respostas 25 e 32.
- RN-33 — Sem sessão, as telas do produto levam a `/login`, e a raiz `/` e o `health.check` continuam públicos até a spec do catálogo. Origem: `docs/layout.md`, seção 6; `docs/plan-andar-zero.md`, seção 5.4.
- RN-34 — O Preview não tem as variáveis do Supabase, e o `/login` dele mostra a mensagem genérica de RN-25 ao entrar. Origem: ADR-004; decisão de 2026-11-11.

## Critérios de aceitação

Pessoas e e-mails fictícios de `docs/layout.md`, seção 10.

- CA-01 — Dado Beatriz Fontes (`beatriz.fontes@example.com`), com senha, nome e papel `member` na `default`, quando ela entra em `/login` com o e-mail e a senha certos, então chega em `/catalog`, e o header mostra "Beatriz Fontes" e o menu com "Sair".
- CA-02 — Dado Flávia Rocha (`flavia.rocha@example.com`), a conta do seed, quando ela entra com o e-mail e a senha certos, então chega em `/operations/loans`.
- CA-03 — Dado `beatriz.fontes@example.com` com a senha errada, e dado `ninguem@example.com`, que não tem conta, quando cada um tenta entrar, então os dois ficam em `/login` com "E-mail ou senha incorretos.", e nenhum cookie de sessão é gravado.
- CA-04 — Dado Caio Moreira (`caio.moreira@example.com`) com a conta bloqueada no Auth, quando ele tenta entrar com a senha certa, então fica em `/login` com "E-mail ou senha incorretos.", sem cookie de sessão.
- CA-05 — Dado uma conta convidada sem vínculo, quando ela entra pela primeira vez, por `auth.signIn` ou por `account.setup` depois do link do convite, então `memberships` ganha uma linha `member` na `default`; uma segunda entrada não cria outra.
- CA-06 — Dado uma conta sem nome, quando ela entra, então vai para `/account/setup` antes de qualquer outra tela do produto. Nome vazio ou só com espaços não é salvo e mostra "Informe seu nome."; um nome de 81 caracteres é recusado por `account.setup`; salvo o nome, ela segue para o destino do papel.
- CA-07 — Dado um convite gerado por `auth.admin.generateLink` para `enzo.paiva@example.com`, quando a pessoa abre o link, cai em `/account/setup`, define a senha e informa "Enzo Paiva", então chega em `/catalog` com o papel `member`.
- CA-08 — Sem sessão, abrir `/catalog` ou `/operations/loans` leva a `/login`. A raiz `/` continua abrindo a landing, e `GET /api/trpc/health.check` continua respondendo `{ status: "ok" }` ou `{ status: "unavailable", message }`, como no AZ-04 e no AZ-05.
- CA-09 — Sem sessão, `account.me` falha com `UNAUTHORIZED`. Pela rota HTTP (`GET /api/trpc/account.me`), a resposta é 401, e o corpo não traz nome, e-mail nem papel.
- CA-10 — Com sessão `member`, um procedimento montado com `adminProcedure` falha com `FORBIDDEN` antes de chamar o service. Nesta spec esse procedimento só existe no teste; o primeiro de verdade chega com a spec da tela de Operações.
- CA-11 — Dado Beatriz Fontes com sessão, quando ela usa "Sair", então o cookie de sessão é apagado e ela vai para `/login`; abrir `/catalog` em seguida leva a `/login`.
- CA-12 — A tela `/login` não tem link de criar conta nem de recuperar senha. Ela mostra "Sem acesso? Fale com Operações." como texto, a senha com mostrar e ocultar (botão com nome acessível) e o botão "Entrar". Em 1024px, são duas colunas; em 375px, uma só, sem rolagem lateral.
- CA-13 — Num banco vazio com o Auth de pé, rodar `pnpm prisma db seed` duas vezes deixa uma área `default` e a conta de Flávia Rocha com nome em `profiles` e papel `operations`, sem duplicar nada.
- CA-14 — **Isolamento:** dado as áreas A e B e uma pessoa com vínculo só em A, `auth.signIn`, `auth.signOut`, `account.me` e `account.setup` não leem nem alteram vínculo, papel ou nome de quem está em B. A área usada é sempre a da sessão, e um `tenantId` mandado no input é recusado na validação. Os papéis `anon` e `authenticated` não leem nenhuma linha de `tenants`, `memberships`, `profiles` e `rate_limits`.
- CA-15 — No dev, com o `compose.yaml` de pé, `GET /auth/v1/health` pelo gateway responde 200 com a chave publishable da máquina e 401 sem chave (ADR-006).
- CA-16 — A resposta de `/login` traz `Content-Security-Policy` sem `unsafe-inline`, e `/login`, `/account/setup` e o header abrem sem violação de CSP no console.
- CA-17 — Dado Beatriz Fontes com o token de acesso vencido e o refresh válido, quando ela abre `/catalog`, então o cookie de sessão é renovado e ela continua em `/catalog`, sem passar por `/login`.
- CA-18 — Dado Beatriz Fontes, com papel `member`, quando ela abre `/operations/loans`, então vai para `/catalog`.
- CA-19 — Dado Beatriz Fontes com sessão, quando ela abre `/login`, então vai para `/catalog`.
- CA-20 — Dado um link de redefinição gerado para Beatriz Fontes, quando ela o abre, então cai em `/account/setup`, que pede só a senha; com a senha nova salva, ela entra com essa senha e não com a antiga.
- CA-21 — Dado Beatriz Fontes com sessão aberta, quando a conta dela é bloqueada no Auth, então a chamada seguinte a `account.me` falha com `UNAUTHORIZED`, e a tela vai para `/login`.
- CA-22 — Com `RATE_LIMIT_USER_MAX=3` e janela de 60 s no teste, a quarta tentativa de entrar com `beatriz.fontes@example.com` dentro da janela falha com "Muitas tentativas. Tente de novo em alguns minutos.", sem consultar o Auth. Com `RATE_LIMIT_IP_MAX=3`, o mesmo vale para quatro e-mails diferentes vindos do mesmo IP.
- CA-23 — Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, como no Preview, `pnpm build` passa, `/login` abre, e entrar mostra "E-mail ou senha incorretos.", sem erro 500.
- CA-24 — Com `FIRST_ADMIN_EMAIL` de uma conta que existe no Auth, o passo do ADR-009, rodado depois das migrations, deixa a `default` e o vínculo `operations` dessa conta; rodado de novo, não muda nada. Com o e-mail de uma conta que não existe, ele cria a `default`, avisa no log, termina com sucesso e não grava vínculo.

## Fora de escopo / não decidido

- Fora de escopo:
  - a metade "cada pessoa vê os próprios empréstimos" do item 1 do PRD, que é da spec de Meus empréstimos;
  - tela e tabela de convite (resposta 5), "esqueci minha senha" dentro do emprestai (resposta 15), limite automático de sessão (resposta 27) e troca de área (resposta 29);
  - notificação por e-mail, que o PRD tira da v1 (o convite não conta, resposta 22); notificação no app e o sino no header (resposta 10);
  - a busca do header, que é da spec do catálogo (resposta 11b);
  - o conteúdo do catálogo e de Empréstimos em aberto, das specs do catálogo e da tela de Operações, e o contador de itens e a navegação lateral, das specs de empréstimo;
  - a auditoria, que entra com a spec de solicitar empréstimo (ADR-010);
  - log JSON e Sentry; Prettier, lint-staged e husky, que viram tarefa própria;
  - dar o papel de Operações a outra conta além do primeiro administrador: a resposta 23 não diz como, e esta spec só entrega o seed e o passo do ADR-009.
- Não decidido: as propostas do rascunho anterior foram aceitas pela pessoa em 2026-11-11. Ficam os itens abaixo, que a aprovação final resolve; enquanto houver item aqui, o status não passa de rascunho.

1. **Aceite dos ADRs de que a spec depende.** O ADR-008 (PR #20) sustenta o RN-02; o ADR-009, o RN-04 e o CA-24; o ADR-010, a auditoria fora desta spec. Os três estão como Proposto, e, até serem aceitos, o RN-04 contraria o ADR-004 e a auditoria fora contraria o ADR-001, 2.10. Quem decide: o time.
2. **Conferência da redefinição no painel** (resposta 24, que só vira regra depois dela). Dela dependem a parte de redefinir do RN-05 e do RN-21, e o CA-20. Quem confere: a pessoa, no painel de produção.
3. **O que o ADR-008, seção 6, deixou para esta spec.** Propostas:
    - assunto "Seu acesso ao emprestai" no convite e "Redefina sua senha do emprestai" na redefinição, com um parágrafo e o link para `/auth/confirm` com `token_hash` e `type`;
    - validade do link de 24 horas, em vez do padrão de 1 hora, porque o convite pode ser aberto no dia seguinte;
    - Site URL `https://emprestai-beta.vercel.app`, e Redirect URLs com ela e `http://localhost:3000`;
    - link vencido ou já usado leva a `/login` com "Este link venceu ou já foi usado. Fale com Operações.";
    - senha recusada pelo Auth mostra "Use pelo menos 6 caracteres.", o mínimo padrão do painel.

    Quem decide: a pessoa, que também configura o painel.
4. **Textos novos desta spec**, sem fonte anterior: o RN-26 (limite de tentativas) e os da tela 7 do `docs/layout.md` ("Defina sua senha", "Seu nome", "Continuar"). Entra aqui também a leitura do "estado de falha" do Preview (RN-34) como a mensagem genérica ao entrar. Quem decide: a pessoa.
5. **"Sair" em `/account/setup`.** A tela tem sessão e não tem header, então quem abre o link e desiste não tem como sair. Proposta: um link "Sair" abaixo do botão. Quem decide: a pessoa.
6. **Como o script do ADR-009 lê o ambiente.** Ele roda fora do Next e precisa de `FIRST_ADMIN_EMAIL` e da URL do banco, e `rules/secrets.md` não tem exceção para ele. Proposta: a mesma exceção do seed. Quem decide: a pessoa.

## Contrato afetado

- Endpoint: `auth.signIn` — novo, mutação pública. Input `{ email, password }`. Confere o limite (RN-09), entra no Auth pelo servidor, grava o cookie, cria o vínculo da primeira entrada (RN-13) e devolve o destino: `/catalog`, `/operations/loans` ou `/account/setup`.
- Endpoint: `auth.signOut` — novo, mutação protegida, sem input. Apaga o cookie e devolve `/login`.
- Endpoint: `account.setup` — novo, mutação protegida. Input `{ password?, name? }`: a senha no convite e na redefinição, o nome quando falta, sem espaços nas pontas e com até 80 caracteres. Cria o vínculo da primeira entrada pela mesma regra do `auth.signIn` (RN-13) e devolve o destino do papel.
- Endpoint: `account.me` — novo, consulta, sem input. Devolve nome, e-mail e papel da sessão, para o header.
- Rota: `GET /auth/confirm` — novo Route Handler. Recebe `token_hash` e `type` (`invite` ou `recovery`) do link do e-mail, valida no Auth, grava o cookie e leva a `/account/setup`.
- Contexto: o `createContext` passa a montar `{ db, session, tenantId, role }`, conferindo o cookie com `getUser()` (RN-31), com `protectedProcedure`, `tenantProcedure` e `adminProcedure` (ADR-001, 2.7).
- Tela: `/login` e `/account/setup`, novas; `/catalog` e `/operations/loans`, provisórias, só com o header, até as specs do catálogo e da tela de Operações; o header com o nome e o menu "Sair", novo.
- Sessão: `proxy.ts`, novo, renova a sessão em toda rota, menos os estáticos, confere com `getClaims()` e manda a `/login` quem abre uma tela do produto sem sessão (ADR-003, 2.7).
- Tabela: `tenants (id, slug, name)`, com a linha `default`; `memberships (id, tenant_id, user_id, role, created_at)`, única por `(tenant_id, user_id)`, com `role` em `member` ou `operations`; `profiles (id, name)`, com `id` igual ao id do Auth; `rate_limits`, o contador do RN-09. Sem FK para `auth.users`. Todas com RLS e policy explícita na mesma migration (ADR-001, 2.7; `rules/migration.md`).
- Ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` passam a ser usadas no servidor, e as linhas `onde:` do `.env.example` mudam (ADR-006; RN-34). A aplicação não usa a `SUPABASE_SECRET_KEY` nesta spec: só o seed e o setup do E2E, com chaves locais. `RATE_LIMIT_*` deixam de ser só reserva; `FIRST_ADMIN_EMAIL` vive só nos secrets do Actions (ADR-009).
- **Não pode mudar:** a raiz `/` pública e o `health.check` público, com o contrato do AZ-04, do AZ-05 e do AZ-09; os casos `az_03`, `az_04` e `adr_001` dos testes; e a regra de que área e papel vêm da sessão, nunca do input.
