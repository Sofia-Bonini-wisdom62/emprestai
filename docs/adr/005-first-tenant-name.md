# ADR-005 — Nome do primeiro tenant

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-10-26, por decisão da pessoa, na conversa em que este ADR foi escrito |
| Data | 2026-10-26 |
| Turma | B |
| Vínculo | [`docs/perguntas-prd.md`](../perguntas-prd.md), pergunta 6, e o glossário do [`AGENTS.md`](../../AGENTS.md), seção 7 |
| Substitui | Duas linhas do [ADR-003](003-stack-corrections.md): Seed, na seção 2.5, e Primeiro tenant, na seção 2.6 |
| Decide | O nome do primeiro tenant, criado no seed; nenhuma escolha de stack |

---

## 1. Contexto

O ADR-001 chamava o primeiro tenant de `suporte_ti`, nome do domínio antigo, de suporte de TI. O ADR-003 trocou o nome para `operations`, em duas linhas: Seed (seção 2.5) e Primeiro tenant (seção 2.6).

`operations` já tinha dono. No glossário do `AGENTS.md`, seção 7, é o nome do papel Operações. Com o tenant também chamado `operations`, um nome passou a servir a duas coisas: a área e o papel.

A colisão pesa porque a pergunta 6 de `docs/perguntas-prd.md` segue aberta: Operações é papel global ou por área? Uma área chamada `operations` sugere a segunda resposta antes de o time dar qualquer uma. No seed, quem tivesse o papel `operations` no tenant `operations` pareceria ter o papel por causa da área.

Nada usa o nome ainda. Não existe `prisma/`, seed nem migration (`AGENTS.md`, seção 8). Trocar agora custa só documento.

---

## 2. Decisão

O primeiro tenant passa a se chamar `default`.

- **Diz o que ele é** — a área que existe enquanto houver uma só.
- **Não colide com papel** — `operations` volta a nomear só o papel Operações.
- **Não é dado real** — `rules/restrictions.md`, seção Dados e segredos, proíbe área real da empresa em seed.
- **Continua certo sem multi-tenancy** — se a pergunta 6 tirar a multi-tenancy, sobra uma área só para a empresa inteira, que é o que `default` já descreve. O que se escrever com esse nome até lá não fica errado.

As duas subseções abaixo levam o número da seção do ADR-001 que corrigem, como no ADR-003. Onde este ADR e o ADR-003 tratam do mesmo ponto, vale este; o resto do ADR-003 continua valendo como está.

### Seção 2.5 — Dados e persistência

Substitui a linha "Seed" da tabela do ADR-003. O resto da seção não muda.

| Item | Escolha |
|---|---|
| Seed | `prisma/seed.ts`, idempotente, cria o primeiro tenant, `default` |

### Seção 2.6 — Multi-tenancy

Substitui a linha "Primeiro tenant" da tabela do ADR-003. A abertura da seção não muda.

| Item | Escolha |
|---|---|
| Primeiro tenant | `default`, criado no seed |

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Manter `operations` | Colide com o papel Operações, que no glossário também é `operations`: um nome para a área e para o papel, com a pergunta 6 aberta |
| `main` | Se confunde com a branch `main` nos documentos e nos commits |
| `headquarters` | É fictício, mas sugere um lugar físico, e o PRD não cita nenhum |
| `suporte_ti` | Nome do domínio antigo, de suporte de TI, que não existe mais neste produto |

---

## 4. Consequências

### Fica mais fácil

- `operations` nomeia uma coisa só: o papel.
- O seed não antecipa a resposta da pergunta 6.
- A troca não toca código: nada usa o nome ainda.

### Fica mais difícil

- O nome do primeiro tenant passa por três arquivos: o ADR-001 diz `suporte_ti`, o ADR-003 diz `operations` e este diz `default`. Vale este.
- O nome pode sugerir um tenant de reserva, para onde cai quem não tem vínculo. Não é: o tenant vem da sessão, nunca do input (ADR-001, seção 2.6), e `default` é só o nome do primeiro.
- `default` é palavra reservada em SQL e em JavaScript. Como valor gravado no banco ou string no seed, funciona; como identificador de código (nome de variável ou de coluna), não.
- Procurar a palavra no repositório traz ruído: `default` também é variante de botão em `docs/layout.md` e aparece em `export default`. Quem procura o tenant procura pelo seed.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A resposta da pergunta 6 de `docs/perguntas-prd.md` diz que Operações é papel global, e a multi-tenancy sai (ADR-003, seção 5) | O tenant sai junto, e o ADR que registrar a saída substitui este |

---

## 6. O que este ADR não decide

- O resto do seed: o que ele cria além do tenant.
- Os papéis e a matriz de permissão, nem se Operações é papel global ou por área (pergunta 6 de `docs/perguntas-prd.md`).
- Quem cria tenant e como. O ADR-001, seção 6, também não decide.
- Como o nome fica no schema: coluna, formato e se aparece na tela. É modelagem de domínio, que o ADR-001, seção 6, também deixa de fora.
- Nenhuma escolha de stack.
