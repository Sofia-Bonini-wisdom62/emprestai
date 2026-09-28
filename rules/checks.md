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

## Procedimento
1. Rode `pnpm lint` e `pnpm typecheck`. Cole a última linha de cada
   saída na resposta.
2. Rode `pnpm test`. Cole a linha de resumo do Vitest. Exige Docker
   rodando: o globalSetup sobe um Postgres novo com Testcontainers e
   aplica todas as migrations do zero.
3. Se a tarefa criou ou alterou um procedure tRPC: confirme que existe
   o teste de isolamento (tenant A não vê nem altera dado de tenant B)
   e que ele passou. Cite o arquivo de teste.
4. Se a tarefa tocou em migration: o passo 2 já provou que o banco sobe
   do zero. Além disso, rode `pnpm prisma migrate deploy` contra o
   banco de dev e cole a saída. Nunca contra produção.
5. Se a tarefa tocou em login, abertura de chamado ou cadastro de
   ativo: rode `pnpm test:e2e` e cole a última linha. Fora disso, o
   E2E fica para o CI.
6. Rode `pnpm build` antes de qualquer push. Build que quebra na
   Vercel é o feedback mais lento e mais caro deste projeto.
7. Rode `git status --short`. Só podem aparecer arquivos do escopo
   da tarefa.
8. Diga qual critério de aceitação (CA-xx) da spec esta tarefa atende.

## Verificação
Pronto = todos os passos que se aplicam terminaram sem falha E o
`git status` não trouxe surpresa. As duas coisas, não uma.

## Não faça
- Não tente consertar a mesma falha duas vezes seguidas sem me mostrar
  a saída do erro.
- Não pule um passo porque "não mudou nada nessa área". Rode e cole.

Tudo em `rules/restrictions.md` vale neste momento, sem exceção. Ele é
a lista das proibições; esta é a do procedimento.
