---
description: Como abrir uma funcionalidade nova, do PRD até a primeira tarefa
globs: []
alwaysApply: false
---

# Abertura de funcionalidade
> leitor: agente

## Quando
Ao iniciar uma funcionalidade que ainda não tem pasta em `docs/specs/`.

## Procedimento
1. Antes de escrever a spec, liste em `docs/perguntas-prd.md` o que o PRD não
   responde sobre esta funcionalidade e PARE. Com pergunta aberta, a spec não
   passa de rascunho.
2. Crie `docs/specs/<NNN-nome-curto>/spec.md`: o **quê** — regras RN-xx e
   critérios CA-xx. `NNN` é o próximo livre; formato em `docs/specs/README.md`.
3. `plan.md`, na mesma pasta, sai da spec: o **como** desta funcionalidade —
   caminho, ordem, risco — citando a seção dos ADRs que a restringem, sem
   recopiar a decisão.
4. `tasks.md`, na mesma pasta, sai do plano: uma linha `[ ]` por tarefa, cada
   uma citando um CA-xx e do tamanho de um commit.
5. Marque `[x]` em `tasks.md` só depois de `rules/checks.md` passar. O ritmo
   de execução é o de `rules/restrictions.md`, seção Ritmo.

## Antes de declarar uma spec pronta
Quando `tasks.md` fechar todo em `[x]`, e antes de o status da spec
passar a `implementada`:
1. Commite tudo. O verificador confere o código do HEAD.
2. Delegue ao subagente `verificador-spec`
   (`.claude/agents/verificador-spec.md`), passando as duas entradas que
   o arquivo dele pede: o caminho da spec e o que verificar.
3. Cole a resposta dele inteira, sem editar, como uma nova
   `## Rodada <n> — AAAA-MM-DD` no fim de `verificacao.md`, na pasta da
   spec. É o registro que deixa comparar uma rodada com a outra.
4. A spec só passa a `implementada` com `Veredito: PRONTA` na última
   rodada, sobre o código que está no disco. O hook
   `.claude/hooks/require-verification.mjs` nega a edição do status em
   qualquer outro caso, para isso não depender de alguém lembrar.
5. Qualquer outro resultado volta para as tarefas: quem corrige é o
   agente principal, nunca o verificador, nem quando a única falha é um
   teste quebrado. Depois, rodada nova, com janela limpa.

## Ciclo de vida
`tasks.md` fecha todo em `[x]` e para de mudar; `plan.md` fica preservado como
registro do caminho escolhido. A `spec.md` continua vigente: descreve o
comportamento atual e é o ponto de entrada da próxima mudança — que entra pela
spec (nova RN, novo CA) e só depois no código, nunca ao contrário.

## Verificação
`docs/specs/<NNN-nome-curto>/` com os três arquivos; cada `[x]` cita um CA-xx.
Spec `implementada` tem também o `verificacao.md`, com a última rodada PRONTA.

## Não faça
- Não crie spec como arquivo plano, nem pasta fora de `<NNN-nome-curto>`, nem
  plano e tarefas com a spec ainda vazia.
- Não decida sozinho pergunta de `docs/perguntas-prd.md` nem escreva código
  antes do plano aprovado: `rules/restrictions.md`, seções Autoridade e Ritmo.
