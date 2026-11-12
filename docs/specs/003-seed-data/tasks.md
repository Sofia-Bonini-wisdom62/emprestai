# 003 — Tarefas

Nenhuma tarefa começa antes de o plano ser aprovado. Não entra dependência nova. Cada tarefa é um PR.

- [x] T-01 — Migration `add_equipment_tables`: o enum `EquipmentStatus`, as tabelas `equipment_categories` e `equipments` com RLS e uma policy `deny_all` cada, e o glossário do `AGENTS.md` com `asset_tag` e `category`. Antes de gerar, o DDL vai para aprovação
      CA: CA-10 (a parte da RLS)
      Verifica: `pnpm test` com `ca_10`, com `SET LOCAL ROLE anon` e `authenticated`, um controle com a RLS desligada e a consulta a `pg_policies`; `pnpm prisma migrate deploy` contra o dev
      Feito: `pnpm test` com 287 de 287 em 2026-11-12. O `migrate deploy` contra o dev ficou pulado, porque a worktree não tem `.env.local`. O SQL saiu de `prisma migrate diff` entre o schema antigo e o novo, sem banco, e não de `migrate dev`, pelo mesmo motivo
- [ ] T-02 — Módulo de carregamento em `prisma/`: a validação do conjunto, as cinco categorias e criar ou atualizar os equipamentos numa transação. Reusa o formato e a conferência do manifesto da spec 002. Testes com a lista real e um manifesto fictício. Depende da T-03 e da T-06 da spec 002
      CA: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-10 (a parte do isolamento)
      Verifica: `pnpm test` com `ca_01` a `ca_06` e `ca_10`, no Testcontainers
- [ ] T-03 — Script do passo de produção em `prisma/`, com os caminhos dos arquivos como argumentos; a exceção dele em `rules/secrets.md`; a conferência de e-mail e senha nos arquivos de `prisma/`; e o texto do passo novo do `.github/workflows/production.yml`, que a pessoa aplica à mão
      CA: CA-08, CA-09
      Verifica: `pnpm test` com `ca_08` e `ca_09`. O `ca_09` roda o script por `node --import ./prisma/resolve-ts.mjs`, como o `first-admin.test.ts`, só com `DIRECT_URL` no ambiente
- [ ] T-04 — O `prisma/seed.ts` chama o módulo de carregamento. Depende da T-07 da spec 002, o manifesto aprovado
      CA: CA-07
      Verifica: `pnpm test:e2e` com `ca_07` em `e2e/seed.e2e.ts`, ao lado do `ca_13`, porque precisa do Auth; `pnpm prisma db seed` duas vezes no dev
