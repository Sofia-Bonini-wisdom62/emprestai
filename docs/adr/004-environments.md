# ADR-004 — Ambientes e bancos

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-10-26, por decisão da pessoa nesta conversa, entre as opções da seção 3. O texto entra no repositório com o PR que cria este arquivo; depois do merge, só a linha de Status muda. Trecho substituído pelo [ADR-007](007-production-deploy-cli.md), em 2026-11-11: na seção 2, quem publica a produção depois do `prisma migrate deploy` passa a ser a CLI da Vercel, não o Deploy Hook; a ordem e o `vercel.json` continuam. Trechos substituídos pelo [ADR-006](006-dev-auth.md), em 2026-11-11: na seção 2, a linha Desenvolvimento e os itens "Dev local no Docker" e "Sem Supabase CLI"; na seção 4, o item "Dev e testes usam a mesma imagem". Trecho substituído pelo [ADR-009](009-production-first-admin.md), em 2026-11-11: na seção 2, a coluna "Quem escreve nele" da linha Produção (o passo do primeiro administrador no workflow também grava dado) |
| Data | 2026-10-26 |
| Turma | B |
| Vínculo | [`docs/andar-zero.md`](../andar-zero.md) (AZ-01, AZ-06 e AZ-09) |
| Substitui | Nada. Decide o que o [ADR-001](001-stack.md), seção 6, deixou de fora: "Ambientes (quantos, como são promovidos)" |
| Decide | Quantos ambientes existem, onde fica o banco de cada um, quem escreve em cada banco e como uma mudança chega à produção |

---

## 1. Contexto

O plano era ter dois projetos Supabase remotos, um de desenvolvimento e um de produção. O de desenvolvimento nunca foi criado: o plano gratuito permite dois projetos ativos somando todas as organizações em que a pessoa é dona ou administradora, e a pessoa não consegue criar o segundo. O branching do Supabase, que daria um ambiente separado dentro do mesmo projeto, exige o plano Pro, segundo a documentação.

Essa escolha morava só no `AGENTS.md` e nas rules, sem ADR, e o `docs/andar-zero.md` a atribuía ao ADR-001, que diz não decidir ambientes. Ela também se afastava das aulas: o AZ-01 da aula 8 pede que um comando suba tudo, inclusive o Postgres, numa máquina limpa, e a aula 9 parte de um banco que sobe na máquina de quem desenvolve.

O Docker já é obrigatório neste projeto: os testes sobem um Postgres efêmero pelo Testcontainers, com a imagem `supabase/postgres` (`rules/tests.md`; a imagem ainda é conferida no plano do andar zero, risco R10).

---

## 2. Decisão

| Ambiente | Banco | Quem escreve nele |
|---|---|---|
| Desenvolvimento | Postgres local em Docker, imagem `supabase/postgres`, a mesma dos testes, subido por `docker compose` a partir de um `compose.yaml` versionado | Os comandos do Prisma listados em `rules/restrictions.md` e a aplicação rodando na máquina |
| Testes | Postgres efêmero do Testcontainers, mesma imagem | O globalSetup do Vitest |
| Preview (Vercel) | Nenhum | Ninguém |
| Produção | Projeto Supabase `emprestai` | Schema: só o GitHub Actions, por `prisma migrate deploy`. Dado: a aplicação na Vercel |

- **Dev local no Docker** — sobe com um comando, como a aula pede, sem custo e sem depender de vaga no plano gratuito. É a mesma imagem dos testes, então a policy que passa no teste é a mesma que roda no dev, com os papéis `anon` e `authenticated` e o schema `auth`.
- **Sem Supabase CLI** — o `compose.yaml` sobe só o Postgres. Nada de `supabase start`, `supabase db reset` nem `supabase migration new`: o dono do schema continua sendo o Prisma Migrate (ADR-001, 2.5 e seção 3).
- **Porta só em `127.0.0.1`, senha fora do repositório** — o banco local não fica exposto na rede, e a senha local vem do `.env.local`, não do `compose.yaml`. Dado continua fictício (`rules/restrictions.md`).
- **Preview sem banco** — o preview prova que a aplicação compila e serve a página. O `DATABASE_URL` do Preview é um valor que não aponta para banco nenhum, só para passar na validação de env, e a página mostra o estado de falha do procedimento de saúde. O Preview nunca recebe a URL de produção, que é o único banco remoto que existe.
- **Produção só pelo CI** — migration em produção só pelo GitHub Actions, e o deploy de produção sai do Deploy Hook depois do `prisma migrate deploy`. A ordem existe para o código novo nunca rodar antes do schema novo; por isso o `vercel.json` desliga o deploy por push na `main`.
- **Caminho de uma mudança** — dev local → teste no Testcontainers → PR com preview que compila → merge na `main` pela pessoa → Actions roda a migration na produção → Deploy Hook publica.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Segundo projeto Supabase remoto para dev (o plano anterior) | Não cabe no plano gratuito sem pausar outro projeto da pessoa |
| Schema `dev` dentro do projeto de produção | O agente passaria a escrever no projeto de produção, que hoje é proibido; uma URL sem `?schema=dev` migraria ou apagaria a produção; as contas do Auth seriam as mesmas nos dois ambientes |
| Pausar o Finlow MVP para liberar a vaga | Tira do ar outro projeto da pessoa enquanto este existir |
| Plano Pro (projeto extra ou branching) | Cerca de US$ 25 por mês num projeto de disciplina |
| Supabase CLI local (`supabase start`) | Traz o Auth para a máquina, mas sobe a pilha inteira do Supabase e convida a usar `supabase db reset` e `supabase migration new`, que criariam um segundo dono do schema (ADR-001, seção 3) |
| Nenhum banco de dev, só Testcontainers e a migration gerada sem banco (R5 do plano do andar zero) | A aplicação nunca rodaria contra banco na máquina; o AZ-01 não fecharia |

---

## 4. Consequências

### Fica mais fácil

- O andar zero fecha inteiro na máquina, com o Docker de pé: a migration se gera e se aplica no dev local, e o R5 do plano deixa de ser necessário.
- `pnpm prisma migrate reset` só apaga o banco local. Nenhum comando do agente alcança o projeto de produção.
- Dev e testes usam a mesma imagem: o que funciona num funciona no outro.

### Fica mais difícil

- O Supabase Auth não roda no Postgres local. Enquanto não houver login, isso não pesa; a spec de login precisa decidir como o dev autentica.
- O preview não mostra dado nenhum: quem quiser ver uma tela com dado roda a aplicação na máquina.
- O dev depende do Docker de pé, como os testes já dependiam.
- O projeto de produção segue pausado por inatividade até o primeiro deploy; antes de uma apresentação, alguém precisa reativá-lo no painel.

### O que isso impede de fazer depois sem custo

- Compartilhar um banco de dev entre pessoas: cada máquina tem o seu, com o seed.
- Testar no preview uma funcionalidade que grava dado: exige um banco remoto de preview, que hoje não existe.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A spec de login precisa de Auth no desenvolvimento | Dev só com Postgres local; pode virar Auth em contêiner ou um projeto remoto de dev |
| Abre vaga no plano gratuito ou o projeto passa a ter plano pago | Dev local; preview sem banco |
| Alguém precisa testar no preview uma funcionalidade que grava dado | Preview sem banco |
| O workflow do GitHub Actions é escrito | O gatilho do deploy de produção, que este ADR não decide |

---

## 6. O que este ADR não decide

- O gatilho do workflow de produção (merge na `main` ou disparo manual). A restrição é uma só: não pode depender de proteção de branch, que o repositório privado no GitHub Free não tem. Decide-se no PR do workflow.
- Versão da imagem `supabase/postgres`, porta local e nome do volume: ficam no `compose.yaml`, conferidos na tarefa que o cria, com a mesma versão do Testcontainers.
- Como o desenvolvimento autentica quando o login existir.
- Backup, retenção e recuperação do banco de produção (ADR-001, seção 6).
