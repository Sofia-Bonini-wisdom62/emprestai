# Entrega da prática

> **Rascunho.** Estão pendentes as seções 3, 4, 7 e 8, a prova com erro plantado e as tabelas finais do verificador.
> Item marcado **pendente** não está pronto e não está decidido.
> As citações apontam para a `main` em `d9e87b5`, salvo quando dizem outro commit ou PR.
> O enunciado é citado pela seção, porque não está no repositório.
> Onde a evidência só existe nas conversas com o agente, o texto diz isso.

## Links
- Repositório (monolito Next.js, sem back e front separados): https://github.com/Sofia-Bonini-wisdom62/emprestai
- Produção (Vercel): https://emprestai-beta.vercel.app

## 1. Conflitos: o que foi pedido contra o que já existia

| pedido | contrariava o quê | o que você fez | por quê | onde ficou registrado | commit |
|--------|-------------------|----------------|---------|-----------------------|--------|
| Tech lead: quando a única falha for um teste quebrado, o verificador corrige o teste e verifica de novo (enunciado, seção 02) | O requisito Independência do próprio enunciado (seção 02: não corrige o que encontra) e o fluxo de SDD do repositório | Recusei. O verificador só aponta e devolve; quem corrige é o agente principal, e a correção passa por uma rodada nova | Se o verificador corrige o teste que reprova, ele aprova o próprio trabalho, e a rodada deixa de ser independente | `.claude/agents/verificador-spec.md:59-61`, `rules/spec-flow.md:41-43`; o agente também não tem ferramenta de escrita (`.claude/agents/verificador-spec.md:5-6`) | `b47711c` (PR #19) |
| Briefing da Entrega 3, item 5: deixar a senha padrão da turma escrita no arquivo que popula os dados | A regra do enunciado "nenhuma senha, token ou chave em código ou no histórico do git" (seção 01) e `rules/restrictions.md:85` (não commitar arquivo com segredo) | **Pendente.** Não há spec nem script que crie a conta do professor. O precedente já decidido é o seed da spec 001: a senha da conta do seed vem da `SEED_PASSWORD`, que fica só no `.env.local` | Senha commitada fica no histórico para sempre, mesmo que saia do arquivo depois | Precedente: `prisma/seed.ts:80`, `.env.example:73-80`; corpo do PR #29, "Duas escolhas, confirmadas pela pessoa em 2026-11-11" | `c052802` (PR #29) |
| Briefing da Entrega 3, item 5: o e-mail institucional real do professor como usuário obrigatório criado pelos dados iniciais | `rules/restrictions.md:79-80` (nada de dado real em seed, fixture, teste ou exemplo, inclusive e-mail) | **Pendente.** Não há spec de dados iniciais. Precedentes: o seed usa uma pessoa fictícia num domínio reservado (`prisma/seed.ts:11-12`), e o e-mail real do primeiro administrador fica só num secret do Actions (`.env.example:111-115`) | — | — | — |
| Entregas 2 e 3: enviar as imagens ao Storage do deploy (seção 03, "Armazenamento" e "Produção") e popular em produção os 12 equipamentos e a conta do professor (seção 04) | A regra do enunciado "o agente nunca escreve em produção" (seção 01), `rules/restrictions.md:46-48` e a resposta 5b (`docs/perguntas-prd.md:205-217`) | **Pendente.** O precedente é o ADR-009: um script versionado roda no workflow de produção, depois das migrations, e o agente não toca a produção. Esse precedente cobre só a área `default` e o vínculo do primeiro administrador (`docs/adr/009-production-first-admin.md:31`). Equipamentos, Storage e a conta do professor ficam fora | O caminho do ADR-009 já rodou em produção: na rodada 43034618148 do Actions, a tentativa 2 registrou "vínculo operations na área default garantido" | `docs/adr/009-production-first-admin.md:26-31`, `prisma/first-admin.ts`, `.github/workflows/production.yml:44-51` | `22c79c8`, `f7119b6` (PR #31) |
| Briefing da Entrega 3, item 4: instalar a biblioteca `sharp` para redimensionar | O ADR-001 fecha a stack (`docs/adr/001-stack.md:26` em diante, sem biblioteca de imagem), `docs/adr/003-stack-corrections.md:162`, `rules/restrictions.md:20-21` e o requisito "nenhuma biblioteca fora do que as suas rules e ADRs permitem" do contrato da skill (enunciado, seção 03). O `pnpm-workspace.yaml:6` bloqueia o build do `sharp` | **Pendente.** Na proposta de desenho da skill, o `sharp` ficava de fora e os 800x600 eram garantidos por verificação. Essa proposta existe só na conversa, e a skill não está no repositório. Se a verificação não bastar, o `sharp` vira ADR novo e pedido de dependência | Dependência fora da stack só entra por ADR, como as imagens Docker do ADR-006 (`docs/adr/006-dev-auth.md:81`) | — | — |
| Briefing da Entrega 4, item 4: limite de 5 empréstimos em aberto | `docs/PRD.md:27` (no máximo 3 itens ao mesmo tempo) e a resposta 2 (`docs/perguntas-prd.md:169-175`) | **Pendente**, para a spec de solicitar empréstimo | Regra de negócio é do PRD (`AGENTS.md:40`), e o enunciado diz que briefing pode estar errado (seção 01) | — | — |
| Briefing da Entrega 4, item 3: devolução prevista em 14 dias úteis | `docs/PRD.md:28` (prazo padrão de 14 dias) e a resposta 4 (`docs/perguntas-prd.md:186-194`), que fixa dias corridos | **Pendente**, para a spec de solicitar empréstimo | Mesma precedência: o PRD e a resposta 4 já decidiram a contagem | — | — |
| Briefing da Entrega 4, item 9: catálogo sem rodapé nem texto de crédito | O contrato da skill no próprio enunciado (seção 03, "Crédito na tela"): a tela que exibe as fotos mostra "Fotos: Pexels" com link, por exigência das diretrizes da API | **Pendente**, para a spec do catálogo | Conflito dentro do enunciado: um pedido tira o crédito que outro exige | — | — |
| A lista de equipamentos (seção 03) marca TI-0004, TI-0007 e TI-0010 em manutenção, e o briefing da Entrega 3, item 3, diz "TI-0004 e TI-0007 em manutenção; os outros 10 disponíveis" | O próprio enunciado, que pede que essa escolha seja decidida e registrada (seções 04 e 05) | **Pendente**, para a spec de dados iniciais. Liga-se à pergunta 7, aberta: quem põe o item em manutenção (`docs/perguntas-prd.md:48-55`) | — | — | — |
| Briefing da Entrega 3: o professor entra direto pelo login | A spec 001: em produção, a conta nasce por convite (RN-01, RN-02 e RN-05, `docs/specs/001-login/spec.md:20-21` e `:24`); a primeira entrada cria o vínculo `member` (CA-05, `:86`); conta sem nome passa antes por `/account/setup` (CA-06, `:87`) | **Pendente.** O briefing não diz o nome nem o papel da conta | — | — | — |
| O enunciado diz que o sistema "já está no ar com login, tela inicial e landing" (seção 00) | O estado real: a spec 001 está aprovada, não implementada (`docs/specs/001-login/spec.md:3`) | Registrado aqui como premissa falsa do enunciado. As entregas 3 e 4 dependem do login da spec 001 | Estão abertas as tarefas T-01, T-09, T-10, T-11 e T-12 (`docs/specs/001-login/tasks.md`). A T-01 já foi implementada no PR #24, e a caixa dela espera o "Verifica" da pessoa. A T-07 entrou pelo PR #33 | Em produção (rodada 43049793248, `d9e87b5`) estão a landing, os routers `auth` e `account` e o `proxy.ts`. Hoje, `/catalog` leva a `/login`, que ainda responde 404, porque a tela é a T-09. O `AGENTS.md:95` está desatualizado: ainda diz que a spec 001 "já pode ser rascunhada" | — |

## 1b. Lacunas: o que foi pedido de forma incompleta

**Spec 001, login.** A spec nasceu com 14 itens em "Não decidido", e o rascunho trazia uma proposta para a maioria deles (`git show 2da8400:docs/specs/001-login/spec.md`, linhas 60-82).
- A pessoa decidiu os 14 na rodada 1 (`2648943`). Sobraram seis itens, decididos na rodada 2 (`bf8cd1c`). As duas rodadas entraram pelo PR #21.
- O último ponto aberto virou o "Esqueci minha senha" no PR #22 (`0646e68`), e a spec passou a aprovada.
- As revisões das tarefas acrescentaram regras depois disso.

| spec | o que faltava | alternativas | o que decidiu | por quê | commit |
|------|---------------|--------------|---------------|---------|--------|
| 001 | Onde o login roda e o cookie `httpOnly`, que o ADR-001, 2.7, pede e o padrão do `@supabase/ssr` não dá | Login no navegador, direto no Auth; login no servidor | Login, convite, redefinição e saída no servidor, cookie `httpOnly`, nenhum cliente Supabase no navegador (RN-07 a RN-09, `spec.md:26-28`) | A CSP do ADR-001, 2.10, depende desse cookie, e o rate limit só alcança o login se ele passa pelo servidor | `2648943` |
| 001 | Como ligar ao `auth.users` e onde mora o nome. Qualquer referência a `auth` numa migration quebra o `prisma migrate dev` | FK com tabelas externas do Prisma 7, em Preview; sem FK; banco de shadow a mais. Nome em `profiles`, em `memberships` ou no metadado do Auth | Sem FK, policy sem funções de `auth`, nome em `profiles` sem `tenant_id` (RN-17 a RN-19, `spec.md:36-38`) | A v1 bloqueia contas e não as apaga, e o nome é da pessoa, não da área | `2648943` |
| 001 | Se o Preview fica com as variáveis do Supabase | Manter; tirar | Tirar, e o `/login` do Preview mostra a mensagem genérica (RN-34, `spec.md:53`; CA-23, `:104`) | O Preview já não tem banco (ADR-004) | `2648943` |
| 001 | A chave do papel e nomes que o glossário não tinha | `member`/`operations`/`admin`; o `COLLABORATOR`/`ADMIN` do modelo de referência | `member` e `operations`, com o `adminProcedure` exigindo `operations` (RN-10, `spec.md:29`; RN-16, `:35`); "conta → account" no glossário (`AGENTS.md:87`) | Segue o glossário, e a resposta 23 fez de administrador e Operações um papel só | `2648943` |
| 001 | Como nasce o primeiro administrador em produção, onde o seed não roda (resposta 5b) | SQL no painel; o primeiro que entrar vira administrador; tela de administração (`docs/adr/009-production-first-admin.md`, seção 3) | ADR-009: script idempotente no workflow, com o secret `FIRST_ADMIN_EMAIL`; conta inexistente só gera aviso (RN-04, `spec.md:23`; CA-24, `:105`) | Ninguém escreve SQL à mão em produção, e o agente não toca a produção | `2648943`; ADR aceito em `bf8cd1c` |
| 001 | Quem não tem vínculo vira Colaborador na `default`, mas o ADR-005 diz que a `default` não é destino implícito | Vínculo por regra explícita; ADR novo substituindo o trecho do ADR-005 | Regra explícita, sem ADR novo (RN-13, `spec.md:32`) | A regra fica escrita e testável, sem a `default` virar atalho no código | `2648943` |
| 001 | Tela do link do convite; o que o Colaborador vê numa rota de Operações; por quanto tempo uma conta bloqueada age com a sessão aberta (perguntas 30 a 32) | Na 32: só `getClaims`, que percebe o bloqueio quando o token vence, ou `getUser` a cada chamada | `/account/setup` na moldura do login (RN-21); Colaborador vai a `/catalog` (RN-24); `getClaims` no `proxy.ts` e `getUser` no `createContext` (RN-31, RN-32) (`spec.md:40`, `:43`, `:50-51`) | Nas 30 e 31, a proposta escrita no rascunho. Na 32, a resposta registra a proposta aceita e o custo de uma ida ao Auth por chamada (`docs/perguntas-prd.md:444-451`) | `2648943` |
| 001 | Provedor de e-mail e acesso ao painel de produção | Saída A, domínio próprio com Resend, recomendada pelo agente; saída B, SMTP do Gmail | Saída B, escolhida pela pessoa contra a recomendação, sabendo do risco da senha de app (`docs/adr/008-email-provider.md:40-47`); só a pessoa acessa o painel na v1 (RN-05, `spec.md:24`) | Sem custo de domínio. O ADR-008 continua Proposto até a conferência da seção 7 dele | `954af99`, `729d822` (PR #20) |
| 001 | Comportamentos de tela sem fonte: `/login` com sessão, colunas, tamanho do nome, mensagem para conta bloqueada, lugar do "Sair" | As propostas do rascunho | As propostas, como RN-20, RN-23, RN-25, RN-27, RN-29 e RN-30 (`spec.md:39`, `:42`, `:44`, `:46`, `:48`, `:49`) | Nenhum documento cobria esses comportamentos | `2648943` |
| 001 | O seed e o setup do E2E leem a chave secreta fora do Next. Depois, o script do ADR-009 também precisou ler o ambiente | Exceções escritas em `rules/secrets.md` | Exceções só com chaves locais, para contas de teste, e só `FIRST_ADMIN_EMAIL` e a URL do banco no script do ADR-009 (`rules/secrets.md:43-49`) | O `server-only` não funciona fora do Next | `2648943`, `bf8cd1c` |
| 001 | O que entra na spec das decisões do ADR-001 sem tarefa, como a auditoria "desde o início" | Trazer a auditoria para esta spec; ADR novo que a passe para a spec de empréstimo | CSP, telas provisórias e rate limit entram; auditoria vai para a spec de solicitar empréstimo pelo ADR-010 (`docs/adr/010-audit-from-loans.md`) | A auditoria nasce com o primeiro dado que ela audita | `2648943`; ADR aceito em `bf8cd1c` |
| 001 | Se aprovar o plano vale como o "pedir antes" de cada dependência | Vale; cada tarefa pede de novo | Vale, e o `@supabase/supabase-js` entra como dependência obrigatória do `@supabase/ssr`; as versões ficam no plano (`docs/specs/001-login/plan.md:21`, `:28-32`) | Um pedido por dependência, já com a versão exata | `2648943` |
| 001 | Rodada 2: assuntos dos e-mails, validade do link, Site URL, link vencido, senha curta, "Sair" em `/account/setup` | Link de 1 h, o padrão; link de 24 h | Link de 24 h e os textos novos (RN-35 a RN-40, `spec.md:54-59`; CA-25 a CA-27, `:106-108`) | O convite pode ser aberto no dia seguinte (`git show 2648943:docs/specs/001-login/spec.md`, linha 101) | `bf8cd1c` |
| 001 | Redefinição de senha. A resposta 24 dizia que Operações redefine pelo painel, e a conferência da pessoa no painel de produção mostrou que a opção não existe | Redefinir pelo painel, descartada | "Esqueci minha senha" em `/forgot-password`, com resposta neutra e o mesmo limite de tentativas do login (RN-41 a RN-45, `spec.md:60-64`; resposta 15 passa a "sim") | A conferência no painel deu negativa | `0646e68` (PR #22) |
| 001 | Revisão da T-05: vínculo em mais de uma área, banco fora ao ler o vínculo, tempo de uma chamada ao Auth fora do ar (25,7 s medidos) | Para o Auth fora do ar: limite por chamada; o `proxy.ts` repassar o request sem o cookie. A segunda não foi aplicada | Sessão sem área quando há mais de um vínculo (RN-46); `FORBIDDEN` nos procedimentos de área (RN-47); limite de 3 s por chamada ao Auth (RN-48) (`spec.md:65-67`) | O código não escolhe área por conta própria, e o `health.check` segue respondendo | `f1ac537` (PR #28) |
| 001 | Revisão da T-08: o RN-33 só falava das telas do produto | — | Sem sessão, toda rota fora da lista pública leva a `/login` (RN-49, `spec.md:68`) | Decidida pela pessoa na revisão da T-08, segundo o corpo do PR #30 | `fdf8872` (PR #30) |
| 001 | Revisão da T-07: o RN-09 diz "por IP e por e-mail", sem números, e oito comportamentos que a spec não cobria | Para o limite: os 300 por e-mail em 60 s do `.env.example` anterior (`c003715:.env.example:96-97`) | 5 tentativas por e-mail em 15 min e 30 por IP em 60 s (RN-50, `spec.md:69`); as outras decisões viraram as RN-51 a RN-57 (`:70-76`) | A pessoa aceitou as recomendações da revisão (mensagem de `6e1d645`) | `6e1d645`, `1411258` (PR #33) |
| 001 | T-04: o nome da área `default`; de onde vem a senha da conta do seed | Senha escrita no seed; senha no ambiente | Nome igual ao slug; senha da `SEED_PASSWORD`, só no `.env.local` (`prisma/default-tenant.ts:4`, `prisma/seed.ts:80`) | A spec não decidia nenhuma das duas. **Pendente:** registrar na spec | `c052802` (PR #29); a linha do nome passou para `default-tenant.ts` em `22c79c8` (PR #31) |
| 001 | T-13: o que fazer sem o secret `FIRST_ADMIN_EMAIL` ou com mais de uma conta com o mesmo e-mail | Sem o secret: falhar ou avisar | Sem o secret, avisa e o deploy segue; com duas contas, falha sem gravar (`prisma/first-admin.ts:25-38`) | Não travar a produção antes de o secret existir. **Pendente:** registrar na spec | `22c79c8`, `f7119b6` (PR #31) |

## 2. Onde o agente tentou decidir por você

**Caso 1: a coordenação mandou a T-12 fora da ordem do plano.**
- A sessão que coordenava as outras pediu a T-12 (cabeçalhos e CSP) antes das telas.
- O plano diz que a CSP se confere nas telas do passo 9 (`docs/specs/001-login/plan.md:17-18`). O "Verifica" da T-12 exige o console sem violação em `/login`, `/account/setup` e no header (`docs/specs/001-login/tasks.md:40`), telas que ainda não existem.
- A sessão que recebeu o pedido parou e devolveu, e a T-12 continua aberta (`tasks.md:38`).
- **Limite da evidência:** o pedido e a recusa estão só nas conversas entre as sessões. Nenhum commit nem PR os registra.
- **Ressalva:** a T-08 também saiu da ordem do plano. O plano põe os routers (passo 7) antes do `proxy.ts` (passo 8), e a T-08 entrou pelo PR #30 antes da T-07, que entrou pelo PR #33. Não há registro de aprovação dessa troca.

**Caso 2: a coordenação citou um `account.enter` que não está na spec.**
- O endpoint existiu só no rascunho da spec 001 (`git show 2da8400:docs/specs/001-login/spec.md`, linha 86) e saiu na rodada 1 (`2648943`). O contrato aprovado não tem `account.enter` (`docs/specs/001-login/spec.md:129-143`).
- A sessão da T-07 seguiu a spec: a primeira entrada é uma função de service chamada por `auth.signIn` e `account.setup`, e o PR #33 diz "Não existe procedure nova".
- **Limite da evidência:** a mensagem que citou `account.enter` está só na conversa.

**Caso 3: uma aprovação repassada valeu para mais do que cobria.**
- O PR #31 dizia que a caixa da T-13 ficaria aberta até a pessoa conferir a primeira rodada real em produção (corpo do PR #31, item 8).
- A coordenação pediu para marcá-la com a aprovação "Aprovo os dois", e o PR #32 foi aberto com o `[x]`.
- A coordenação percebeu a contradição e segurou o PR até a conferência em produção.
- **Limite da evidência:** está só na conversa o que "Aprovo os dois" cobria (o diff do workflow e o aviso sem o secret) e que a coordenação segurou o PR. O que dá para verificar:
  - o corpo do PR #32, que cita "Aprovo os dois";
  - a rodada 43034618148 do Actions: na tentativa 1, o aviso "Sem FIRST_ADMIN_EMAIL"; na tentativa 2, "vínculo operations na área default garantido", às 14:27:43Z;
  - o merge do PR #32 às 14:29:28Z, depois da tentativa 2.

**Agentes que assumiram e sinalizaram:**
- No PR #33, o agente da T-07 implementou oito comportamentos que a spec não cobria e os listou para a revisão. A revisão recomendou outra saída para quatro deles: destino com vínculo em duas áreas, "Sair" com o Auth fora do ar, o GET que gastava o link e senha igual à atual. A pessoa aceitou as oito recomendações (mensagem de `6e1d645`), e elas viraram as RN-50 a RN-57. A lista original só existe no histórico de edição do corpo do PR #33.
- No PR #28, o agente declarou que os limiares do CA-29 (4 s e 7 s) eram dele, derivados dos 3 s. Esses limiares entraram na spec (`spec.md:110`) sem outra aprovação além do merge.

## 3. Uma decisão que merece (ou não) um ADR

**Pendente.**

## 4. A skill imagens-equipamentos

**Pendente.** A skill não está no repositório. A proposta de desenho e a dúvida sobre a chave do Pexels existem só na conversa.

## 5. O subagente verificador

- **Como ele é acionado.** Há três camadas.
  - A descrição manda usá-lo depois que as tarefas de uma spec fecham e antes de o status passar a `implementada` (`.claude/agents/verificador-spec.md:3`).
  - A rule manda commitar, delegar com as duas entradas, colar a resposta inteira como `## Rodada <n>` no `verificacao.md` e só então mudar o status (`rules/spec-flow.md:27-40`).
  - Um hook do projeto (`.claude/settings.json:3-13`, `.claude/hooks/require-verification.mjs`) nega a escrita de `Status: implementada` quando falta a rodada, quando a última não é `Veredito: PRONTA` ou quando o código mudou depois dela.
- **Por que esse gatilho.** Só o hook não depende de alguém lembrar (`rules/spec-flow.md:40`). O PR #19 não registra outra alternativa considerada para o gatilho, como um check no CI. Essa comparação fica **pendente**.
- **Limites do gatilho**, declarados no corpo do PR #19, em "Limites conhecidos":
  - o hook só intercepta Edit, MultiEdit e Write (`.claude/settings.json:5`), então uma edição do status por Bash ou à mão passa;
  - ele confia no texto colado no `verificacao.md`;
  - o hook que restringe o Bash do verificador, declarado no frontmatter dele, só roda com a pasta marcada como confiável.
- **O que ele lê e por que precisa ler.** Ele não herda a conversa do agente principal. Lê o `AGENTS.md`, as rules de restrições, checks e testes e a spec, o plano e as tarefas (`.claude/agents/verificador-spec.md:26-29`), e é proibido de ler rodadas anteriores (`:30-31`). Os motivos:
  - os CAs vêm da spec;
  - a evidência de um CA se acha pelo nome `ca_NN` do teste (`rules/tests.md:26`);
  - os passos de fim de tarefa vêm de `rules/checks.md`.

  Herdar a conversa traria a narrativa de quem escreveu o código. Mesmo assim, nada impede o agente principal de escrever mais do que as duas entradas no pedido de delegação.
- **O que ele não consegue fazer.**
  - Ferramentas: só `Read`, `Grep`, `Glob` e `Bash`, com `Edit`, `Write`, `NotebookEdit` e `mcp__*` negados (`.claude/agents/verificador-spec.md:5-6`).
  - Bash: um hook só dele (`:7-12`, `.claude/hooks/verifier-bash-allowlist.mjs`) deixa passar `pnpm lint`, `typecheck`, `test` e `test:e2e` exatos, o `pnpm build` com uma URL de banco fictícia e comandos de leitura do git. Com isso, ele não publica, não migra e não escreve no banco do deploy.
  - Os testes recusam banco que não seja local (`tests/helpers/postgres.ts:55-57`).
  - Limite conhecido: `Read`, `Grep` e o `git diff --no-index` permitido leem qualquer arquivo do disco. Contra a leitura do `.env.local`, só há a instrução (`.claude/agents/verificador-spec.md:65`).
- **Monolito.** Next.js, tRPC e Prisma num pacote só. Uma rodada cobre servidor (`pnpm test`) e tela (`pnpm test:e2e`) sobre o mesmo `HEAD`, que vai no cabeçalho da resposta.
- **Comparável.** O formato da resposta é fixo e não aceita texto antes nem depois (`.claude/agents/verificador-spec.md:68-99`):
  - um cabeçalho com o `HEAD`;
  - uma tabela com uma linha por CA, na ordem da spec;
  - uma tabela com os passos de `rules/checks.md`;
  - o veredito.

## 6. O verificador em ação

- **Histórico real.** Houve pelo menos cinco rodadas, registradas só nos corpos dos PRs:
  - uma no PR #26 (T-05);
  - uma no PR #30 (T-08), sobre `fdf8872`;
  - três no PR #33 (T-07).
- **O que elas apontaram.**
  - **PR #26:** o verificador apontou um comportamento fora da spec, o vínculo em mais de uma área, que virou a RN-46 no PR #28 (`f1ac537`).
  - **PR #30:** os pontos que ele levantou viraram duas notas, e a segunda foi corrigida em `8cf5675`.
  - **PR #33:**
    - A rodada 2 reprovou o CA-30, porque nenhum teste provava a recusa do envio vindo de outra origem. O `8ccb06e` corrigiu isso, com o E2E mandando o envio de outra origem e sem `Origin`.
    - A rodada 3, sobre `8ccb06e`, dá `NÃO PRONTA` para a spec inteira só porque faltam a T-01 e as T-09 a T-12.
- **Falha do formato.** O que está nos PRs são resumos, não a resposta "inteira, sem editar" que `rules/spec-flow.md:34` pede:
  - as tabelas têm três colunas, e não as cinco de `.claude/agents/verificador-spec.md:76`;
  - nenhuma traz a tabela de checks (`:79-88`);
  - trazem só os CAs da tarefa, e não todos os da spec (`:37-38`).
- **Prova com erro plantado.** **Pendente.** O roteiro está em `docs/verificador-erro-plantado.md`, com cinco provas, mas nunca rodou: não há commit do erro plantado nem da reversão, e não existe `verificacao.md` com uma rodada normal antes.
- **Tabelas finais das duas specs.** **Pendente.** Nenhuma spec tem `verificacao.md`. As duas specs da prática, dados iniciais e solicitar empréstimo, ainda não existem em `docs/specs/`.

## 7. Uma regra sua que esta prática pôs à prova

**Pendente.**

## 8. O que ficou de fora e o que faria diferente

**Pendente.**
