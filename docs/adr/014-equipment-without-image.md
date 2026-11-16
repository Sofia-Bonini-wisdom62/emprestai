# ADR-014 — Equipamentos iniciais sem imagem

| Campo | Valor |
|---|---|
| Status | Proposto |
| Data | 2026-11-16 |
| Turma | B |
| Vínculo | [`docs/specs/003-seed-data/spec.md`](../specs/003-seed-data/spec.md), proposta de 2026-11-16 (RN-04, RN-07, RN-08 e RN-17); [ADR-013](013-production-equipment-data.md); [ADR-011](011-equipment-images.md) |
| Substitui | Do [ADR-013](013-production-equipment-data.md), seção 2, duas linhas da tabela: "O que grava" e "Dado inválido", no que tratam da foto. Ao aceitar, a linha de Status do ADR-013 aponta para este ADR |
| Decide | O que o carregamento dos equipamentos iniciais faz quando o patrimônio não tem foto aprovada |

---

## 1. Contexto

O ADR-013 manda o passo de produção recusar o conjunto inteiro quando um patrimônio não tem foto aprovada no manifesto. Quando ele foi aceito, o manifesto aprovado da spec 002 (T-07) parecia vir antes do carregamento.

Em 2026-11-16, a pessoa decidiu, nestas palavras, "segue sem imagem por enquanto... retome tudo". A rodada real das fotos fica para depois, e os equipamentos precisam chegar ao banco antes dela, porque a spec 004 (solicitar empréstimo) depende deles. Com a regra do ADR-013, o carregamento não grava nada até a T-07.

A coluna `equipments.image_object`, da T-01 da spec 003, é obrigatória. A spec 004 já mostra o ícone da categoria quando não há URL de foto (RN-12 e RN-24 da 004).

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Sem manifesto | O carregamento grava os equipamentos com `image_object` nulo e escreve no log quantos ficaram sem foto |
| Manifesto com parte dos patrimônios | Os patrimônios sem foto aprovada ficam com `image_object` nulo |
| Manifesto inválido | Continua recusando o conjunto inteiro antes de gravar: o manifesto que existe passa pela conferência da spec 002 |
| Rodada nova com foto | No equipamento que já existe, a imagem passa de nula para a foto, ou de uma foto para outra |
| Rodada nova sem foto | A imagem que o equipamento já tem não muda. Ela nunca volta a nula |
| Coluna | `image_object` passa a aceitar nulo, por uma migration nova |

A linha "O que grava" da tabela do ADR-013, seção 2, passa a ser:

| Item | Escolha |
|---|---|
| O que grava | Na área `default`, as categorias e os equipamentos que faltam, com a imagem do manifesto aprovado ou nula. No equipamento que já existe, só o objeto da imagem, e só quando o manifesto traz uma foto para ele |

A linha "Dado inválido" passa a ser:

| Item | Escolha |
|---|---|
| Dado inválido | Patrimônio repetido, categoria ou situação fora das chaves, ou um manifesto que existe e não passa na conferência da spec 002, recusa o conjunto inteiro antes de gravar, e o passo falha. Patrimônio sem foto aprovada não é dado inválido |

- **Por que nulo, e não uma imagem de reserva**: nenhuma imagem pode vir de fora da skill (spec 002, RN-01), e a tela da 004 já sabe mostrar o ícone.
- **Por que a imagem nunca volta a nula**: um manifesto aprovado que perde um patrimônio por engano não pode apagar a foto que já está no ar.
- **Por que o manifesto inválido continua recusando**: a decisão tira a exigência da foto, não a conferência dela.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Esperar a T-07 da spec 002, como o ADR-013 manda | A pessoa decidiu seguir sem imagem |
| Uma imagem de reserva, a mesma para os 12 | Imagem de fora da skill, contra a spec 002, RN-01, e repetida, contra o RN-04 da 002 |
| Texto vazio no lugar de nulo, sem migration | O banco não distingue "sem foto" de um nome de objeto errado, e a 004 montaria uma URL quebrada |
| Gravar sem imagem e nunca preencher depois | A Entrega 3 pede cada equipamento com a sua imagem em produção |

---

## 4. Consequências

### Fica mais fácil

- A spec 003 e a 004 andam sem esperar a chave do Pexels.
- Quando o manifesto aprovado entrar no repositório, o deploy seguinte preenche as fotos, sem ninguém tocar no banco.

### Fica mais difícil

- Uma migration a mais, e `imageUrlFor`, da spec 004, passa a receber a imagem nula.
- Até a T-07 da spec 002, a produção mostra ícones, e o "Ao final, em produção" da Entrega 3 fica incompleto.
- O manifesto aprovado só pode entrar no repositório depois de as fotos estarem no bucket: senão, o deploy grava objetos que não abrem.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| Os 12 equipamentos têm foto aprovada | Se `image_object` volta a ser obrigatória, por migration nova |
| A tela de cadastro de equipamento entra | Se o cadastro aceita equipamento sem foto |

---

## 6. O que este ADR não decide

- Quando a T-07 da spec 002 acontece, que depende da chave do Pexels da pessoa.
- A ordem entre enviar as fotos ao bucket e fazer o merge do manifesto, que fica no roteiro da spec 002 (`references/manual-upload.md`).
