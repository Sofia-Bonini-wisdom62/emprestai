# ADR-009 — Primeiro administrador em produção

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-11-11, pela pessoa, que responde pelo time ([`rules/restrictions.md`](../../rules/restrictions.md), seção Autoridade), na revisão da spec 001. Trecho substituído pelo [ADR-013](013-production-equipment-data.md), em 2026-11-12: da seção 2, a linha "Escopo" e a linha Produção da tabela "Quem escreve nele" (as categorias e os equipamentos iniciais vêm do passo daquele ADR) |
| Data | 2026-11-11 |
| Turma | B |
| Vínculo | [`docs/perguntas-prd.md`](../perguntas-prd.md), resposta 5b; [`docs/specs/001-login/spec.md`](../specs/001-login/spec.md), RN-04 e CA-24; [ADR-007](007-production-deploy-cli.md) |
| Substitui | Do [ADR-004](004-environments.md), seção 2, a coluna "Quem escreve nele" da linha Produção. Do [ADR-005](005-first-tenant-name.md), seção 2.6, a linha "Primeiro tenant", no que vale para a produção: lá a `default` nasce deste passo, e não do seed. Ao aceitar, a linha de Status dos dois aponta para este ADR, e o `AGENTS.md`, seção 6, e o comentário do `.env.example` sobre quem grava dado de produção passam a dizer o mesmo |
| Decide | Quem grava, na produção, a área `default` e o vínculo do primeiro administrador |

---

## 1. Contexto

Na produção, o seed não roda. A conta do primeiro administrador nasce do convite que a pessoa faz no painel do Supabase para o próprio e-mail, mas a área `default` e o papel de Operações dessa conta não têm de onde nascer. A resposta 5b põe um passo idempotente do workflow de produção para gravá-los, sem SQL à mão.

O ADR-004, seção 2, diz que, na produção, o GitHub Actions só muda o schema, por `prisma migrate deploy`, e que dado só a aplicação na Vercel grava. A resposta 5b contraria esse trecho, e por isso o passo pede este ADR. Na revisão da spec 001, em 2026-11-11, a pessoa aceitou a proposta e, na mesma revisão, este ADR.

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Onde roda | No workflow de produção, depois do `prisma migrate deploy` e antes do deploy (ADR-007) |
| O que roda | Um script versionado no repositório, com o Prisma Client, que faz `upsert` da área `default` e do vínculo `operations` da conta |
| De onde vem a conta | Do secret `FIRST_ADMIN_EMAIL` do Actions. O script acha a conta em `auth.users` pelo e-mail, numa consulta parametrizada |
| Ambiente | O script roda fora do Next e lê `FIRST_ADMIN_EMAIL` e a URL do banco direto do ambiente do workflow, pela exceção de `rules/secrets.md` |
| Conta inexistente | O script cria a `default`, como a resposta 5b pede, avisa no log, termina com sucesso e não grava vínculo. A rodada seguinte completa |
| Escopo | Só a área `default` e o vínculo dessa conta. Nenhum outro dado, nenhuma outra conta |

A coluna "Quem escreve nele" da linha Produção do ADR-004, seção 2, passa a ser:

| Ambiente | Quem escreve nele |
|---|---|
| Produção | Schema: só o GitHub Actions, por `prisma migrate deploy`. Dado: a aplicação na Vercel e, só a área `default` e o vínculo do primeiro administrador, o passo deste ADR |

- **Por que no workflow** — é o único lugar que já tem a credencial de migration e roda na ordem certa, depois do schema. Ninguém escreve SQL à mão na produção, e o agente continua sem tocar nela.
- **Por que `upsert`** — o passo roda a cada deploy. Rodar de novo não muda nada.
- **Por que avisar, e não falhar** — o convite pode chegar depois da primeira rodada. Falhar travaria o deploy por um passo que a rodada seguinte completa sozinha.
- **Por que só isso** — qualquer outro dado continua sendo da aplicação, como o ADR-004 quer.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| SQL no painel do Supabase | `rules/restrictions.md` proíbe SQL à mão na produção |
| A aplicação dar o papel de Operações ao primeiro que entrar | Quem entrasse primeiro, por convite errado ou por engano, viraria administrador |
| Tela de administração no emprestai | A v1 não tem tela para dar papel (resposta 23) |

---

## 4. Consequências

### Fica mais fácil

- A produção nasce com um administrador sem ninguém tocar no banco.
- O passo é testável no Testcontainers, com uma linha fictícia em `auth.users`.

### Fica mais difícil

- O workflow de produção ganha um segredo a mais (`FIRST_ADMIN_EMAIL`) e um passo que grava dado.
- Mexer em `.github/workflows/` pede aprovação explícita (`rules/restrictions.md`, Escopo), na tarefa que implementa.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A v1 precisa dar o papel de Operações a outra conta | O escopo do passo |
| A aplicação ganha uma tela de administração | O passo inteiro |

---

## 6. O que este ADR não decide

- Como outra conta, além do primeiro administrador, recebe o papel de Operações. A resposta 23 não diz como.
- O nome e o caminho do script, que ficam com a tarefa que implementa.
