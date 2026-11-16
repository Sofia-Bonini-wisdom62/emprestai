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

## Rodada 2 — 2026-11-16

HEAD verificado: `ff404b4`, na branch `feat/004-t07-my-loans`.

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-01 | src/server/api/routers/loan.test.ts:178, :183, :190; e2e/loan-request.e2e.ts:114, :147; e2e/my-loans.e2e.ts:95 | REPROVADO | A API passa: relógio fixo em 12/11 às 22h30 de SP, data prevista 26/11, item vai a `loaned`. Mas o caso E2E que prova o aviso (`e2e/my-loans.e2e.ts:95`) falhou na rodada completa do `pnpm test:e2e`: o clique em "Solicitar empréstimo" não terminou dentro dos 30 s (`locator.click: Test timeout of 30000ms exceeded`). Rodando o arquivo sozinho, passou em 21,0 s, perto do limite de 30 s com `retries: 0`. O E2E usa o relógio real e um equipamento criado no teste, não o TI-0001. |
| CA-02 | loan.test.ts:213 (maintenance e out_of_service), :224 (loaned); e2e/loan-request.e2e.ts:160 | ATENDIDO | Recusa com EQUIPMENT_UNAVAILABLE, sem empréstimo e sem auditoria. A tela do item loaned está em loan-request.e2e.ts:239 e a do out_of_service em :170. |
| CA-03 | loan.test.ts:235, :249; e2e/loan-request.e2e.ts:181 | ATENDIDO | |
| CA-04 | loan.test.ts:259, :571; e2e/loan-request.e2e.ts:207 | ATENDIDO | O texto completo do bloqueio só é conferido no catálogo. No detalhe, o teste confere o alerta com "em atraso" e o botão desabilitado. É o mesmo componente, `src/components/equipment/blocked-notice.tsx`. |
| CA-05 | loan.test.ts:393 | ATENDIDO | Duas conexões, uma trava e uma barreira em pg_stat_activity, no Testcontainers. |
| CA-06 | loan.test.ts:420 | ATENDIDO | Ela termina com 3 em aberto e 1 linha de auditoria. |
| CA-07 | prisma/loan-tables.test.ts:83, :97; loan.test.ts:280 | ATENDIDO | |
| CA-08 | equipment.test.ts:107, :127, :135, :145, :151, :183; src/server/csp.test.ts:35, :40; e2e/catalog.e2e.ts:96; e2e/loan-request.e2e.ts:225 | ATENDIDO | O E2E cria 12 equipamentos próprios, porque a carga da spec 003 ainda não existe (T-02 a T-04 da 003 estão `[ ]`). Ele não conta exatamente 12 cards na página. No detalhe, só confere o link "Pixabay", não o texto "Fotos:". |
| CA-09 | equipment.test.ts:159 (quem vê é Enzo), :192; e2e/catalog.e2e.ts:128; e2e/loan-request.e2e.ts:239 | ATENDIDO | No E2E, quem vê não é o Enzo: é outra conta Beatriz, ou a própria pessoa que pegou o item. |
| CA-10 | loan.test.ts:527, :560; e2e/loan-header.e2e.ts:30; e2e/my-loans.e2e.ts:123, :151 | ATENDIDO | |
| CA-11 | loan.test.ts:297; e2e/loan-header.e2e.ts:65; e2e/loan-request.e2e.ts:248 | ATENDIDO | O E2E usa um equipamento criado no teste, não o TI-0002. O limite de Operações só é provado na API. |
| CA-12 | loan.test.ts:310; recusas sem auditoria em :220, :232, :246, :277 (CA-04), :417, :450 (CA-06); prisma/loan-tables.test.ts:115, :125 | ATENDIDO | A falha da rodada 1 foi corrigida: o ca_04 e o ca_06 agora conferem que a recusa não grava em `audit_events`. |
| CA-13 | equipment.test.ts:216, :222; loan.test.ts:331, :586; e2e/catalog.e2e.ts:139; e2e/loan-request.e2e.ts:265; e2e/my-loans.e2e.ts:185 | ATENDIDO | A parte "`/` continua mostrando a landing sem sessão" só tem prova em e2e/landing.e2e.ts:6, cujo nome cita o ca_08 da spec 001, não esta spec. |
| CA-14 | loan.test.ts:341 (tenantId, userId, dueOn), :351 (equipmentId que não é UUID) | ATENDIDO | O input é `z.strictObject` (src/server/api/routers/loan.ts). |
| CA-15 | equipment.test.ts:230, :241, :247, :254; loan.test.ts:455, :469, :489, :592; prisma/loan-tables.test.ts:158, :170, :184, :206, :220 | ATENDIDO | Tem SET LOCAL ROLE, um controle com a RLS desligada, o catálogo de pg_policies e as FKs compostas. O nome de quem pegou o item de B é conferido no JSON da API, não na tela. |
| CA-16 | e2e/my-loans.e2e.ts:163 | ATENDIDO | O código confere a data da URL contra os empréstimos em aberto (src/app/(product)/my-loans/page.tsx). |
| CA-17 | e2e/my-loans.e2e.ts:172; e2e/loan-request.e2e.ts:170 | ATENDIDO | Usa um equipamento criado como out_of_service, não o TI-0007. |
| CA-18 | src/components/equipment/equipment-card.test.ts:32, :43, :53, :60, :69 | ATENDIDO | O crédito é provado pela função `showsPhotoCredit` e pelo componente isolado, não pela página montada. Quem liga essa função às páginas: catalog-grid.tsx e catalog/[equipmentId]/page.tsx. |

Checks: `pnpm lint` → passou (exit 0, sem achados)
Checks: `pnpm typecheck` → passou (`tsc --noEmit`, exit 0)
Checks: `pnpm test` → passou (Test Files 31 passed (31), Tests 679 passed (679))
Checks: teste de isolamento entre áreas dos procedures novos (passo 3) → passou (casos ca_15 de equipment.test.ts e loan.test.ts)
Checks: `pnpm prisma migrate deploy` no banco de dev → pulado: minhas instruções proíbem rodar migration; a migration já está mesclada desde a T-01 (PR #49)
Checks: `pnpm test:e2e` → falhou (1 failed, 77 passed (11.8m); falhou e2e/my-loans.e2e.ts:95 ca_01 por timeout de 30 s no clique; o `&&` impediu a config de preview). Rodadas separadas: `playwright test e2e/my-loans.e2e.ts` → 6 passed (2.8m), com o ca_01 em 21,0 s; `playwright test -c playwright.preview.config.ts` → 1 passed (31.3s)
Checks: `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build` → passou (exit 0; a worktree não tem .env.local)
Checks: `git status --short` → passou (vazio)

Fora de escopo: nada encontrado. Não há devolução, "Já devolvidos", histórico, busca, chips, navegação lateral nem redirecionamento de `/`. Os textos a mais do detalhe ("Prazo padrão de 14 dias corridos", "O prazo conta a partir da confirmação, não da retirada") e o "Limite atingido" do header vêm do docs/layout.md (linhas 150 e 202). Os arquivos da skill de imagens e de docs/specs/002 entraram no intervalo pelos merges da spec 002 e não contei como achado desta spec.

Veredito: NÃO PRONTA — o `pnpm test:e2e` completo falhou no ca_01 de e2e/my-loans.e2e.ts:95 por timeout; ele só passa isolado, em 21 s de um limite de 30 s, e o CA-01 fica sem prova estável na tela.

Todos os arquivos citados ficam na worktree C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\wt-004-t01.

Saídas completas dos checks:
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-lint.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-tc.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-test.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-e2e.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-e2e-rerun.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-e2e-preview.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\verif-build.log

O trace da falha está em C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\wt-004-t01\test-results\my-loans.e2e.ts-ca-01-depo-79900-resultado-e-o-item-na-lista-chromium\trace.zip. A segunda rodada pode ter sobrescrito esse trace.

## Rodada 3 — 2026-11-16

HEAD verificado: `5691596`, na branch `feat/004-t07-my-loans`.

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-01 | src/server/api/routers/loan.test.ts:178, :183, :190; e2e/loan-request.e2e.ts:114, :147; e2e/my-loans.e2e.ts:95 | ATENDIDO | Na API, o relógio fica fixo em 12/11 às 22h30 de São Paulo e dá 26/11. O E2E usa o relógio real e um equipamento criado no próprio teste, não o TI-0001. O ca_01 de my-loans, com limite de 60 s, passou na rodada completa. |
| CA-02 | loan.test.ts:210 (maintenance e out_of_service), :224 (loaned); e2e/loan-request.e2e.ts:160 | ATENDIDO | Recusa com EQUIPMENT_UNAVAILABLE, sem gravar empréstimo nem auditoria. |
| CA-03 | loan.test.ts:235, :249; e2e/loan-request.e2e.ts:181 | ATENDIDO | |
| CA-04 | loan.test.ts:259, :571; e2e/loan-request.e2e.ts:207 | ATENDIDO | O texto completo do bloqueio só é conferido no catálogo. No detalhe, o teste confere o alerta "em atraso" e o botão desabilitado; o componente é o mesmo, src/components/equipment/blocked-notice.tsx. |
| CA-05 | loan.test.ts:393 | ATENDIDO | Duas conexões, uma trava e uma barreira em pg_stat_activity, no Testcontainers. |
| CA-06 | loan.test.ts:420 | ATENDIDO | Ela termina com 3 em aberto e 1 linha de auditoria. |
| CA-07 | prisma/loan-tables.test.ts:83, :97; loan.test.ts:280 | ATENDIDO | |
| CA-08 | src/server/api/routers/equipment.test.ts:107, :127, :135, :145, :151, :183; src/server/csp.test.ts:35, :40; e2e/catalog.e2e.ts:96; e2e/loan-request.e2e.ts:225 | ATENDIDO | O E2E cria 12 equipamentos próprios em vez de usar os da spec 003, e não conta exatamente 12 cards na página. No detalhe, confere só o link "Pixabay", não o texto "Fotos:". |
| CA-09 | equipment.test.ts:159 (quem vê é o Enzo), :192; e2e/catalog.e2e.ts:128; e2e/loan-request.e2e.ts:239 | ATENDIDO | No E2E, quem vê o item não é o Enzo: é outra conta Beatriz, ou a própria pessoa que pegou o item. |
| CA-10 | loan.test.ts:527, :560; e2e/loan-header.e2e.ts:30; e2e/my-loans.e2e.ts:126, :154 | ATENDIDO | |
| CA-11 | loan.test.ts:297; e2e/loan-header.e2e.ts:65; e2e/loan-request.e2e.ts:248 | ATENDIDO | O E2E usa um equipamento criado no teste, não o TI-0002. O limite de Operações só é provado na API. |
| CA-12 | loan.test.ts:310; recusas sem auditoria em :220, :232, :246, :277, :294, :417, :450; prisma/loan-tables.test.ts:115 (UPDATE, DELETE e TRUNCATE como dono), :125 | ATENDIDO | |
| CA-13 | equipment.test.ts:216, :222; loan.test.ts:331, :586; e2e/catalog.e2e.ts:139; e2e/loan-request.e2e.ts:265; e2e/my-loans.e2e.ts:188 | ATENDIDO | A parte "`/` continua mostrando a landing sem sessão" só tem prova em e2e/landing.e2e.ts:6, cujo nome cita o ca_08 da spec 001, não um CA desta spec. |
| CA-14 | loan.test.ts:337 (tenantId, userId, dueOn), :351 (equipmentId que não é UUID) | ATENDIDO | O input usa `z.strictObject` (src/server/api/routers/loan.ts:25). |
| CA-15 | equipment.test.ts:230, :241, :247, :254; loan.test.ts:455, :469, :489, :592; prisma/loan-tables.test.ts:158, :170, :184, :206, :220 | ATENDIDO | Tem SET LOCAL ROLE, um controle com a RLS desligada, a conferência em pg_policies e as FKs compostas. O nome de quem pegou o item de B é conferido no JSON da API, não na tela. |
| CA-16 | e2e/my-loans.e2e.ts:166 | ATENDIDO | O código confere a data da URL contra os empréstimos em aberto (src/app/(product)/my-loans/page.tsx:29-30). |
| CA-17 | e2e/my-loans.e2e.ts:175; e2e/loan-request.e2e.ts:170 | ATENDIDO | Usa um equipamento criado como out_of_service, não o TI-0007. |
| CA-18 | src/components/equipment/equipment-card.test.ts:32, :43, :53, :60, :69 | ATENDIDO | O crédito é provado pela função `showsPhotoCredit` e pelo componente isolado, não pela página montada. As páginas que o ligam são catalog-grid.tsx:63 e catalog/[equipmentId]/page.tsx:76. |

Checks: `pnpm lint` → passou (exit 0, sem achados)
Checks: `pnpm typecheck` → passou (`tsc --noEmit`, exit 0)
Checks: `pnpm test` → passou (Test Files 31 passed (31), Tests 679 passed (679))
Checks: teste de isolamento entre áreas dos procedures novos (rules/checks.md, passo 3) → passou (casos ca_15 de src/server/api/routers/equipment.test.ts e loan.test.ts)
Checks: `pnpm prisma migrate deploy` no banco de dev → pulado: minhas instruções proíbem rodar migration; a migration 20261112210000_add_loans_and_audit_events já está mesclada desde a T-01 (PR #49) e o intervalo não toca em prisma/migrations
Checks: `pnpm test:e2e` → passou (78 passed (11.5m); preview: 1 passed (21.2s))
Checks: `DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build` → passou (exit 0; a worktree não tem .env.local)
Checks: `git status --short` → passou (vazio)

Fora de escopo: nada encontrado. Não há devolução, "Já devolvidos", histórico, busca, chips, navegação lateral nem redirecionamento de `/`. Os textos a mais do detalhe e o "Limite atingido" do header vêm do docs/layout.md. A exceção de `no-img-element` vale só para src/components/equipment/equipment-photo.tsx, um arquivo usado pelo card e pelo detalhe, mais restrita que o RN-26. Os arquivos de .claude/skills/imagens-equipamentos e de docs/specs/002 entraram no intervalo pelos merges da spec 002 e não contam como achado desta spec.

Veredito: PRONTA — os 18 CAs têm teste que os cita e que passou, e todos os checks aplicáveis passaram, inclusive o `pnpm test:e2e` completo, onde a falha da rodada 2 não se repetiu.

Rodei tudo na worktree C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\wt-004-t01, no HEAD 5691596. Saídas completas:
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-lint.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-tc.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-test.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-e2e.log
- C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\v-build.log
