# 004 — Tarefas

O plano e as cinco propostas foram aprovados pela pessoa em 2026-11-12. Nenhuma tarefa começa antes de a migration da spec 003 estar na `main`, e cada "Pode implementar" libera uma tarefa só. Cada tarefa é um commit e um PR, e para em `rules/checks.md` (`rules/restrictions.md`, Ritmo). Nenhuma acrescenta dependência.

- [x] T-01 — Migration `add_loans_and_audit_events`: `loans` com o índice único parcial, `audit_events` com o trigger que recusa `UPDATE` e `DELETE`, RLS e as policies `deny_all`. O DDL vai à pessoa antes do `migrate dev`
      CA: CA-07, CA-12 (a parte do banco), CA-15 (a parte da RLS)
      Verifica: `pnpm test` com `ca_07` (o `INSERT` duplicado recusado), `ca_12` (`UPDATE` e `DELETE` em `audit_events` falham como `postgres`) e `ca_15` (`SET LOCAL ROLE anon` e `authenticated` leem zero linhas, um controle com a RLS desligada e a conferência em `pg_policies`); `pnpm prisma migrate deploy` no banco de dev
- [x] T-02 — `equipment.list`, com cursor, e `equipment.byId`, em `src/server/services/equipment.ts` e `src/server/api/routers/equipment.ts`; `EQUIPMENT_IMAGES_BASE_URL` em `src/env/` e no `.env.example`
      CA: CA-08 (a parte da API), CA-09 (a parte da API), CA-13 (os dois procedimentos), CA-15
      Verifica: `pnpm test` com `ca_08` (`imageUrl` montada com a variável, e `null` sem ela; a segunda página pelo cursor), `ca_09` (o nome de quem pegou e a data), `ca_13` (`UNAUTHORIZED` sem sessão) e `ca_15` (o equipamento de B não aparece e responde `NOT_FOUND`), por `createCaller`
- [x] T-03 — `loan.create`, em `src/server/services/loan.ts` e `src/server/api/routers/loan.ts`: a transação do RN-09, os códigos do RN-10, a auditoria do RN-22 e o relógio injetado
      CA: CA-01 (a parte da API), CA-02, CA-03, CA-04, CA-05, CA-06, CA-11 (a parte da API), CA-12, CA-13 (o procedimento), CA-14, CA-15
      Verifica: `pnpm test` com `ca_01` (relógio em 12/11/2026 às 22h30 de São Paulo, data prevista 26/11/2026), `ca_02` a `ca_06`, `ca_11` (Flávia, `operations`, cria o empréstimo e recebe `LOAN_LIMIT_REACHED` com 3 em aberto), `ca_12`, `ca_13` (`UNAUTHORIZED` sem sessão), `ca_14` e `ca_15`, contra o Postgres do Testcontainers; o `ca_05` e o `ca_06` com duas conexões e uma barreira
- [ ] T-04 — `loan.listMine` e o header com o contador e os links "Catálogo" e "Meus empréstimos"
      CA: CA-10 (a parte da API e do header), CA-13 (o procedimento), CA-15
      Verifica: `pnpm test` com `ca_10`, `ca_13` (`UNAUTHORIZED` sem sessão) e `ca_15` por `createCaller`; `pnpm test:e2e` com `ca_10` (o contador "Você está com 2 de 3 itens" no header)
- [ ] T-05 — `/catalog` com os cards, `card.tsx` e `badge.tsx` do shadcn/ui, o `<img>` com a exceção de lint, a origem do bucket no `img-src`, o crédito do Pexels e o servidor de imagem fictícia do E2E em `tests/e2e/`; `docs/layout.md` com a foto e o limite de 3
      CA: CA-08, CA-09, CA-13 (a tela)
      Verifica: `pnpm test:e2e` com `ca_08` (12 cards, cada `<img>` carregada, e o link "Fotos: Pexels"), `ca_09` e `ca_13` (`/catalog` sem sessão vai para `/login`); `e2e/csp.e2e.ts` sem bloqueio no catálogo com foto e sem a variável; `pnpm lint` com a exceção restrita aos arquivos do card e do detalhe
- [ ] T-06 — `/catalog/[equipmentId]` com a foto, a ficha, o card "Solicitar empréstimo", `alert-dialog.tsx` do shadcn/ui, o quadro de bloqueio e o destino `/my-loans` com o aviso
      CA: CA-01, CA-02, CA-03, CA-04, CA-08 (o detalhe), CA-09, CA-11, CA-13 (a tela)
      Verifica: `pnpm test:e2e` com `ca_01` (confirmar leva a `/my-loans` com o aviso), `ca_02` (o texto de manutenção no lugar do botão), `ca_03` (o motivo ao lado do botão desabilitado e o aviso de completar o limite), `ca_04` (o quadro de bloqueio), `ca_08` (a foto e o crédito no detalhe), `ca_09`, `ca_11` (Flávia cai em `/operations/loans`, chega ao catálogo pelo header e solicita o TI-0002) e `ca_13` (o detalhe sem sessão vai para `/login`); `e2e/csp.e2e.ts` sem bloqueio no detalhe
- [ ] T-07 — `/my-loans` com "Itens com você", sem "Devolver", e o estado vazio
      CA: CA-10, CA-13 (a tela)
      Verifica: `pnpm test:e2e` com `ca_10` (só os empréstimos de Beatriz, com nome, patrimônio e data, e o estado vazio) e `ca_13` (`/my-loans` sem sessão vai para `/login`)
