---
description: Procedimento para criar ou alterar schema do banco (tabela, coluna, índice, constraint, enum, policy)
globs: ["prisma/schema.prisma", "prisma/migrations/**", "prisma.config.ts"]
alwaysApply: false
---

# Mudança de schema
> leitor: agente

## Quando
Qualquer tarefa que crie, altere ou remova tabela, coluna, índice, constraint,
enum, trigger ou policy — inclusive quando parecer trivial.

## Procedimento
1. Antes de gerar qualquer coisa: escreva na resposta o DDL pretendido (modelo
   Prisma + o SQL de RLS, policy e trigger) e PARE para aprovação. Este passo é
   o que torna a mudança revisável; não o pule por parecer óbvio.
2. Uma migration por tarefa, por `pnpm prisma migrate dev --name <nome>` em
   snake_case (ex.: `add_equipment_table`), contra o banco de DEV — quem resolve
   essa URL é o `prisma.config.ts`. Enquanto o scaffold não existir, só o passo 1.
3. Tabela nova nasce com `ENABLE ROW LEVEL SECURITY` e pelo menos uma policy
   explícita na MESMA migration, em SQL bruto no `migration.sql` gerado (o
   Prisma não modela RLS). Tabela sem policy não entra no repositório. O ADR
   exige de toda tabela de domínio a coluna `tenant_id` e RLS deny by default
   (`docs/adr/001-stack.md`, seções 2.6 e 2.7); as demais colunas vêm da spec.
4. Se a tabela já tem dado, diga o que acontece com as linhas existentes. Coluna
   nova obrigatória precisa de `@default`, de default no SQL ou de um passo de
   backfill escrito na própria migration.

## Verificação
Quando o andar zero e o banco de dev existirem: `pnpm prisma migrate reset`
contra o dev aplica tudo do zero e roda o seed, e `pnpm test` sobe um Postgres
novo no Testcontainers com as mesmas migrations. As duas coisas. Até lá, a
verificação desta rule é o passo 1: o DDL na resposta, aprovado. O resto do
fim de tarefa: `rules/checks.md`.

## Não faça
- Não altere schema pelo painel ou SQL editor do Supabase, nem por SQL avulso
  fora de migration: o que não está em `prisma/migrations/` não existe.
- Proibições sobre bancos, migration aplicada e Supabase CLI:
  `rules/restrictions.md`, seção Bancos e schema.
