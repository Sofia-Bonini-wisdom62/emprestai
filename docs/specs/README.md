# Specs

Cada funcionalidade tem uma **pasta** em `docs/specs/<NNN-nome-curto>/`, com três artefatos dentro. O desenho
abaixo é o formato alvo. A primeira pasta é a `001-login`; as demais do desenho são exemplo.

```text
docs/specs/
  001-login/
    spec.md     o comportamento combinado: regras e critérios de aceitação
    plan.md     por onde a mudança entra e em que ordem
    tasks.md    as tarefas, cada uma citando um critério
  002-equipment-catalog/
  003-loan-create/
```

O `NNN` é um número de três dígitos, atribuído em ordem de criação: ele dá a ordem cronológica das
funcionalidades e um identificador estável. Referência cruzada usa o número, nunca o título — "CA-03 da 002"
continua válido depois que a pasta for renomeada. Prosa em português; o `nome-curto` em inglês, como todo
nome de arquivo (ver `AGENTS.md`, seção Idioma, para o glossário de domínio).

## `spec.md`

```markdown
# <NNN> — <Nome da funcionalidade>

Status: rascunho | aprovada | em implementação | implementada
Atualizada em: AAAA-MM-DD

## Objetivo

Uma frase: o que a pessoa consegue fazer depois disso que não conseguia antes.

## Vínculo

- PRD: `docs/PRD.md`, seção "<título>", item <n>.
- Restringe: `docs/adr/001-stack.md`, seções <x.y> — e outro ADR, se houver.
- Assume pronto: <NNN-nome-curto>, ou "nada".

## Regras

Decisões fechadas, numeradas. O que ainda não foi decidido não entra aqui; vai em Não decidido.

- RN-01 — <regra em uma frase>. Origem: PRD, "Regras que Operações já decidiu".
- RN-02 — ...

## Critérios de aceitação

Verificável = entrada concreta e saída concreta. Nada de "funciona bem" nem "rápido".

- CA-01 — Dado <estado inicial com valores>, quando <ação com valores>, então <resultado observável>.
  Ex.: dado um `member` com 3 `loans` em aberto, quando ele solicita o `equipment` EQ-014, então a
  chamada falha com `LOAN_LIMIT_REACHED` e a tela mostra o motivo, não um erro genérico.
- CA-02 — ...
- CA-xx — **Isolamento:** um `member` do tenant A não lê nem altera dado do tenant B por nenhum
  caminho desta funcionalidade. Obrigatório em toda spec que toca dado de domínio, enquanto valer a
  multi-tenancy do ADR-001 (confirmada pela resposta da pergunta 6 de `docs/perguntas-prd.md`).

## Fora de escopo / não decidido

- Fora de escopo: <o que esta spec deliberadamente não cobre, e por quê>.
- Não decidido: <pergunta + quem decide>. Enquanto houver item aqui, o status não passa de rascunho.

## Contrato afetado

- Endpoint: `<router>.<procedure>` — novo ou alterado; input e output.
- Tela: `<rota>` — o que muda nela.
- Tabela: `<table>.<column>` — o que muda no schema.
- **Não pode mudar:** <o contrato de que outra parte já depende e que esta funcionalidade preserva>.
```

## `plan.md`

```markdown
# <NNN> — Plano

## Caminho
Uma frase: por onde a mudança entra (tela, router, service, schema) e onde a regra mora.

## Ordem
1. <passo> — por que ele vem antes dos outros.
2. ...

## Risco
O que pode quebrar fora desta funcionalidade, e o que prova que não quebrou.

## Depende de
O que precisa existir antes (scaffold, migration, outra spec), ou "nada".
```

## `tasks.md`

Cada tarefa cita um CA, cabe em um commit e diz como se verifica. Tarefa que não atende nenhum CA não é desta spec.

```markdown
# <NNN> — Tarefas

- [ ] T-01 — <uma mudança só, do tamanho de um commit>
      CA: CA-01
      Verifica: <o comando, o arquivo de teste ou a saída que prova>
- [ ] T-02 — ...
```

## O que o formato exige

- O status vive no cabeçalho de `spec.md`, e só ali. `plan.md` e `tasks.md` não têm status próprio.
- Sem o CA de isolamento, uma spec que toca dado de domínio está incompleta.

## Onde está o resto

Este arquivo define só o formato. O procedimento (do PRD à spec, ao plano e às tarefas) está em
[`rules/spec-flow.md`](../../rules/spec-flow.md), inclusive o ciclo de vida da spec. Quem rascunha, quem
aprova e o que a aprovação libera estão em [`rules/restrictions.md`](../../rules/restrictions.md), seções
Autoridade, Escopo e Ritmo. O fim de tarefa está em [`rules/checks.md`](../../rules/checks.md). Nenhuma
dessas regras é repetida aqui.
