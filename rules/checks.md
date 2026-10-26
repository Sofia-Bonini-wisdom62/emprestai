---
description: O que precisa passar antes de declarar uma tarefa pronta
globs: []
alwaysApply: true
---

# Verificação de fim de tarefa
> leitor: agente

## Quando
Sempre que você for dizer "pronto", "implementado" ou "funcionando".
A unidade de tarefa é a de `rules/restrictions.md`, seção Ritmo.

Execute na ordem abaixo **o que existir no repositório**. Hoje não há
`package.json`, scaffold nem o `compose.yaml` do banco de dev (`AGENTS.md`,
seção Estado atual): os passos de comando são especificação até o andar zero rodar.
Passo que ainda não dá para rodar entra na resposta como **pulado, com
o motivo**. Nunca como passou.

## Procedimento
1. `pnpm lint` e `pnpm typecheck`. Cole a última linha de cada saída.
2. `pnpm test`. Cole a linha de resumo do Vitest. Exige Docker de pé
   para o Testcontainers; se ele não estiver rodando, não tente subi-lo:
   diga que o check está bloqueado e peça para a pessoa abrir o Docker.
3. Se a tarefa criou ou alterou um procedure tRPC: confirme que existe
   o teste de isolamento entre tenants e que ele passou. Cite o arquivo.
4. Se a tarefa tocou em migration: o passo 2 já provou que o banco sobe
   do zero. Com o banco de dev local de pé (ADR-004), rode também
   `pnpm prisma migrate deploy` contra ele e cole a saída.
5. Se a tarefa tocou num fluxo crítico de interface (ADR-003, seção
   2.8, que corrige a lista do ADR-001): `pnpm test:e2e` e cole a última linha. Fora disso, fica no CI.
6. `pnpm build` antes de qualquer push. Build que quebra na Vercel é o
   feedback mais lento e mais caro deste projeto.
7. `git status --short`. Só podem aparecer arquivos do escopo da tarefa.
8. Diga qual critério de aceitação (CA-xx) da spec a tarefa atende.
   Tarefa anterior à primeira spec (documento, regra, andar zero) diz
   isso com essas palavras, em vez de inventar um CA.

## Verificação
Pronto = todo passo aplicável que dá para rodar terminou sem falha, todo
passo pulado foi declarado com o motivo, E o `git status` não trouxe
surpresa. As três coisas, não uma.

Tarefa só de documento ou regra: valide a coerência com PRD, ADR e
specs e diga quais checks foram pulados e por quê.

## Não faça
- Não tente consertar a mesma falha duas vezes seguidas sem me mostrar
  a saída do erro.
- Não pule um passo **que dá para rodar** porque "não mudou nada nessa
  área". Rode e cole.

Tudo em `rules/restrictions.md` vale neste momento, sem exceção. Ele é
a lista das proibições; esta é a do procedimento.
