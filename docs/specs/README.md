# Specs

Uma spec por funcionalidade, em `docs/specs/<feature>.md`, rascunhada a partir de `docs/prd.md`. O agente pode rascunhar; o time aprova antes de qualquer código. Nenhum código de funcionalidade existe sem a spec correspondente (`rules/restrictions.md`, seção Escopo).

## Formato

```markdown
# <Nome da funcionalidade>

Status: rascunho | aprovada | implementada
Origem: docs/prd.md, seção <x>

## Objetivo
Uma frase: o que a pessoa consegue fazer depois disso que não conseguia antes.

## Fora de escopo
O que esta spec deliberadamente não cobre.

## Regras de negócio
- RN-01 ...
- RN-02 ...

## Critérios de aceitação
- CA-01: Dado <contexto>, quando <ação>, então <resultado observável>.
- CA-02: ...
- CA-xx: Tenant A não vê nem altera dado de tenant B nesta funcionalidade. (obrigatório em toda spec que toca dado de domínio)

## Perguntas em aberto
O que o PRD não responde. Enquanto houver item aqui, a spec não é aprovada.
```

Cada tarefa do plano cita o CA que atende. Cada PR fecha quando todos os CA da spec passam (`rules/checks.md`, passo 8).
