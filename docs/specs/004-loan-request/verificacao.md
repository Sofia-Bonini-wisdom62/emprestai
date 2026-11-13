# 004 — Verificação

## Rodada 1 — 2026-11-13

HEAD verificado: `210b2db`, na branch `feat/004-t07-my-loans`.

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-01 | src/server/api/routers/loan.test.ts:178, :183, :190; e2e/loan-request.e2e.ts:114, :147; e2e/my-loans.e2e.ts:95 | ATENDIDO | O relógio fixo em 12/11 às 22h30 de São Paulo, que dá 26/11, só é testado na API. O E2E usa o relógio real e um equipamento criado no teste, não o TI-0001. Achado: o aviso de /my-loans vem só do parâmetro `?confirmado=AAAA-MM-DD` (src/app/(product)/my-loans/page.tsx:197). Qualquer data na URL mostra "Empréstimo confirmado" sem empréstimo nenhum. Não contraria o CA, mas registro. |
| CA-02 | loan.test.ts:210 (maintenance e out_of_service), :224 (loaned); e2e/loan-request.e2e.ts:160 | ATENDIDO | Os três casos dão EQUIPMENT_UNAVAILABLE sem gravar empréstimo nem auditoria. A tela mostra o texto de manutenção no lugar do botão. |
| CA-03 | loan.test.ts:235, :249; e2e/loan-request.e2e.ts:170 | ATENDIDO | |
| CA-04 | loan.test.ts:259, :567; e2e/loan-request.e2e.ts:196 | ATENDIDO | O texto completo do bloqueio é conferido no catálogo. No detalhe, o teste só confere que o alerta com "em atraso" aparece e que o botão fica desabilitado. |
| CA-05 | loan.test.ts:391 | ATENDIDO | Duas conexões, com uma trava e uma barreira em pg_stat_activity, sem sleep, contra o Testcontainers. |
| CA-06 | loan.test.ts:418 | ATENDIDO | Trava no vínculo da pessoa e barreira. Ela termina com 3 em aberto. |
| CA-07 | prisma/loan-tables.test.ts:83, :97; loan.test.ts:278 | ATENDIDO | |
| CA-08 | src/server/api/routers/equipment.test.ts:107, :127, :135, :145, :151, :183; src/server/csp.test.ts:35, :40; e2e/catalog.e2e.ts:96; e2e/loan-request.e2e.ts:214 | ATENDIDO | O E2E cria 12 equipamentos próprios, porque o seed da spec 003 ainda não tem equipamentos (T-02 a T-04 da 003 abertas). O teste não confere que a página tem exatamente 12 cards. No detalhe, só o link "Pixabay" é conferido, não o texto "Fotos:". |
| CA-09 | equipment.test.ts:159, :192; e2e/catalog.e2e.ts:128; e2e/loan-request.e2e.ts:228 | ATENDIDO | No E2E, quem vê não é o Enzo: no catálogo é outra conta Beatriz, e no detalhe é a própria pessoa que pegou o item. |
| CA-10 | loan.test.ts:523, :556; e2e/loan-header.e2e.ts:30; e2e/my-loans.e2e.ts:123, :151 | ATENDIDO | |
| CA-11 | loan.test.ts:295; e2e/loan-header.e2e.ts:65; e2e/loan-request.e2e.ts:237 | ATENDIDO | O E2E usa um equipamento criado no teste, não o TI-0002. O limite de Operações é provado na API. |
| CA-12 | loan.test.ts:308; prisma/loan-tables.test.ts:115 (UPDATE, DELETE e TRUNCATE falham como dono), :125 | SEM TESTE | A parte "pedido recusado não grava linha de auditoria" está coberta para CA-02, CA-03 e CA-05 (loan.test.ts:220, :232, :246, :415). Para CA-04 (loan.test.ts:259) e CA-06 (loan.test.ts:418), nenhum teste confere o número de linhas em `audit_events` depois da recusa. |
| CA-13 | equipment.test.ts:216, :222; loan.test.ts:329, :582; e2e/catalog.e2e.ts:139; e2e/loan-request.e2e.ts:254; e2e/my-loans.e2e.ts:163 | ATENDIDO | A parte "/ continua mostrando a landing" tem prova só em e2e/landing.e2e.ts:6, cujo nome cita o ca_08 da spec 001. Nenhum teste com ca_13 desta spec cobre `/`. |
| CA-14 | loan.test.ts:335 (tenantId, userId e dueOn), :349 (equipmentId que não é UUID) | ATENDIDO | O input usa `z.strictObject`, em src/server/api/routers/loan.ts. |
| CA-15 | equipment.test.ts:230, :241, :247, :254; loan.test.ts:451, :465, :485, :588; prisma/loan-tables.test.ts:158, :170, :184, :206, :220 | ATENDIDO | Cobre o SET LOCAL ROLE, o controle com a RLS desligada, o catálogo de pg_policies e as FKs compostas. |

Checks: `pnpm lint` → passou (saída do eslint vazia, exit 0)
Checks: `pnpm typecheck` → passou (tsc --noEmit, exit 0)
Checks: `pnpm test` → passou (Test Files 30 passed (30), Tests 674 passed (674))
Checks: teste de isolamento entre áreas dos procedures novos (passo 3) → passou (equipment.test.ts e loan.test.ts, casos ca_15)
Checks: `pnpm prisma migrate deploy` no banco de dev → pulado: minhas instruções proíbem rodar migration, e a migration da T-01 já foi aprovada e mesclada (PR #49)
Checks: `pnpm test:e2e` → passou (75 passed (7.7m), e o preview com 1 passed (17.2s))
Checks: `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build` → passou (exit 0; a worktree não tem .env.local)
Checks: `git status --short` → passou (vazio)

Fora de escopo:
- No detalhe, o item `out_of_service` mostra "Este equipamento não está disponível." no lugar do botão, e há o mapeamento da pill `out-of-service` (src/app/(product)/catalog/[equipmentId]/page.tsx:121-123 e :26). A spec diz que "a tela não trata o caso". É uma proteção pequena, mas é tratamento que não foi pedido.
- Em /my-loans, cada linha atrasada ganha a pill "Em atraso" (src/app/(product)/my-loans/page.tsx:254). O RN-18 pede só o nome, o patrimônio e a data prevista.
- Os arquivos da skill do Pexels, em `.claude/skills/...`, e os de docs/specs/002 entraram no intervalo pelo PR #51, que é da spec 002, não desta. Não contei como achado da 004.
- Não encontrei nenhum dos itens que a spec lista como fora de escopo: devolução, "Já devolvidos", histórico, busca, chips, navegação lateral, redirecionar `/`.

Veredito: NÃO PRONTA — falta, no CA-12, um teste que prove que as recusas por atraso (CA-04) e por limite em pedidos simultâneos (CA-06) não gravam linha em `audit_events`.

Os arquivos citados ficam todos na worktree C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\wt-004-t01. As saídas completas dos checks estão em C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-lint.txt, v-tc.txt, v-test.txt e v-e2e.txt, na mesma pasta.
