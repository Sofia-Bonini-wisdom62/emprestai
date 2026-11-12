# ADR-013 — Equipamentos iniciais em produção

| Campo | Valor |
|---|---|
| Status | Proposto |
| Data | 2026-11-12 |
| Turma | B |
| Vínculo | [`docs/perguntas-prd.md`](../perguntas-prd.md), resposta 34; [`docs/specs/003-seed-data/spec.md`](../specs/003-seed-data/spec.md), RN-07 e RN-12; [ADR-009](009-production-first-admin.md); [ADR-011](011-equipment-images.md) |
| Substitui | Do [ADR-009](009-production-first-admin.md), seção 2, a linha "Escopo" da tabela e a linha Produção da tabela "Quem escreve nele". Ao aceitar, a linha de Status do ADR-009 aponta para este ADR, e o `AGENTS.md`, seção 6, e o comentário do `.env.example` sobre quem grava dado de produção passam a dizer o mesmo |
| Decide | Quem grava, na produção, as categorias e os equipamentos dos dados iniciais, e o que uma rodada nova faz com o que já existe |

---

## 1. Contexto

A Entrega 3 da prática pede que os 12 equipamentos da lista, cada um com a sua foto, existam no banco de produção. O enunciado diz que o agente nunca escreve em produção, e o seed recusa banco fora da máquina.

O ADR-009 já pôs um passo idempotente no workflow de produção, depois do `prisma migrate deploy`. Mas ele limita esse passo à área `default` e ao vínculo do primeiro administrador ("Nenhum outro dado, nenhuma outra conta"). Gravar equipamentos nesse lugar contraria aquela linha, e por isso pede este ADR.

O passo roda a cada deploy. Se regravasse a situação, um equipamento emprestado na Entrega 4 voltaria a disponível no deploy seguinte.

Em 2026-11-12, a pessoa respondeu à pergunta 34 aceitando a proposta do agente: um passo novo no workflow, que cria o que falta e, no que já existe, só atualiza a imagem.

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Onde roda | No workflow de produção, depois do `prisma migrate deploy` e do passo do ADR-009, e antes do deploy (ADR-007) |
| O que roda | Um script versionado no repositório, com o Prisma Client, o mesmo que o seed do dev usa para os equipamentos |
| De onde vêm os dados | De `prisma/data/equipment.json` e do manifesto aprovado `prisma/data/equipment-images.json` (spec 002, RN-10), versionados. Nenhum secret novo |
| Ambiente | O script roda fora do Next e lê só a URL do banco do ambiente do workflow, pela exceção de `rules/secrets.md`, como o do ADR-009 |
| O que grava | Na área `default`, as categorias e os equipamentos que faltam. No equipamento que já existe, só o objeto da imagem |
| O que nunca grava | A situação, o nome ou a categoria de um equipamento que já existe; empréstimo; conta, vínculo ou perfil |
| Dado inválido | Patrimônio repetido, sem foto aprovada, ou com categoria ou situação fora das chaves recusa o conjunto inteiro antes de gravar, e o passo falha |
| `default` inexistente | Não acontece: o passo do ADR-009 roda antes e a cria |

A linha "Escopo" da tabela do ADR-009, seção 2, passa a ser:

| Item | Escolha |
|---|---|
| Escopo | Só a área `default` e o vínculo dessa conta. Os dados iniciais de equipamento são do passo do ADR-013 |

A linha Produção da tabela "Quem escreve nele", que o ADR-009 deu ao ADR-004, seção 2, passa a ser:

| Ambiente | Quem escreve nele |
|---|---|
| Produção | Schema: só o GitHub Actions, por `prisma migrate deploy`. Dado: a aplicação na Vercel; a área `default` e o vínculo do primeiro administrador, pelo passo do ADR-009; as categorias e os equipamentos iniciais, pelo passo do ADR-013 |

- **Por que no workflow**: é o mesmo argumento do ADR-009. É o único lugar que já tem a credencial e roda na ordem certa, e o agente continua sem tocar na produção.
- **Por que criar e não regravar**: o passo roda a cada deploy. Depois da primeira rodada, a situação e o nome são da aplicação, que muda a situação ao emprestar.
- **Por que a imagem é exceção**: trocar uma foto é previsto na spec 002 (RN-06). Sem atualizar o objeto, o equipamento apontaria para um objeto que a pessoa apagou.
- **Por que falhar, e não avisar**: diferente da conta do ADR-009, que pode chegar depois, um dado inválido no arquivo não se corrige sozinho na rodada seguinte. Gravar metade deixaria o catálogo com buracos.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Os 12 como dado numa migration nova | Põe dado da prática no histórico do schema, grava os 12 em todo banco de teste e pede migration nova a cada troca de foto |
| A pessoa roda o seed da máquina dela contra a produção | Pede tirar a trava do seed e ter a URL do banco de produção na máquina onde o agente roda |
| SQL no editor do painel | `rules/restrictions.md` proíbe SQL à mão na produção (ADR-009, seção 3) |
| Regravar tudo a cada rodada | Desfaria, a cada deploy, os empréstimos da Entrega 4 |
| Operações cadastra pela tela | O cadastro pela interface está fora do escopo do briefing |

---

## 4. Consequências

### Fica mais fácil

- A produção recebe os 12 equipamentos sem ninguém tocar no banco, e o deploy seguinte não desfaz nada.
- O mesmo script serve ao seed do dev e ao passo, e é testável no Testcontainers.

### Fica mais difícil

- O workflow de produção ganha mais um passo que grava dado. A mudança em `.github/workflows/` é da pessoa, à mão (`rules/restrictions.md`, Escopo; ADR-011).
- Corrigir a situação ou o nome de um equipamento que já está no banco não se faz mais pelo arquivo: fica para a tela de cadastro.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A tela de cadastro de equipamento entra | Se o passo continua, ou se os dados iniciais param de ser carregados |
| A v1 ganha mais de uma área | A área em que o passo grava |
| Os dados iniciais ganham campo que precisa ser corrigido pelo arquivo | O que o passo atualiza no que já existe |

---

## 6. O que este ADR não decide

- O nome e o caminho do script, que ficam com a tarefa que implementa.
- A conta do professor, que nasce no painel pela pessoa (resposta 35), sem passo do workflow.
