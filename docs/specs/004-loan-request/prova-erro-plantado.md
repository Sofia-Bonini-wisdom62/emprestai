# 004 — Prova do verificador com um erro plantado

Atende ao requisito "Provado" da Entrega 1 da prática: com um erro plantado de propósito, o `verificador-spec` reprova o que deve reprovar. A pessoa aprovou o erro em 2026-11-16 ("Aprovo").

## O erro

Na branch descartável `test/004-planted-limit`, criada a partir da `main` `a217842`, o commit `81c4288` muda uma linha só:

```diff
- export const LOAN_LIMIT = 3; // RN-03; resposta 40
+ export const LOAN_LIMIT = 5; // RN-03; resposta 40
```

em `src/server/services/loan.ts:6`. O 5 é o número que o briefing da Entrega 4 pedia e que a pessoa recusou na resposta 40 de `docs/perguntas-prd.md`. O RN-03 desta spec diz 3.

O esperado era a reprovação dos critérios que provam o limite: CA-03, CA-06, CA-10 e CA-11.

## O que o verificador devolveu

O verificador rodou em janela limpa, sobre o `81c4288`. Esta é a resposta dele, colada inteira, sem edição:

Spec: docs/specs/004-loan-request/spec.md · HEAD: 81c4288 · Escopo: tudo que implementa a spec 004, branch test/004-planted-limit (a partir da main a217842; o diff é só `src/server/services/loan.ts:6`, `LOAN_LIMIT = 3` → `5`), na worktree C:\Users\SOFIAP~1\AppData\Local\Temp\claude\a1621f55654af276\cc5f1430-e20b-4e91-a443-cdc3392c2aa4\scratchpad\wt-004-t01

| CA | evidência (arquivo:linha do teste) | teste nesta rodada | status | observação |
|----|------------------------------------|--------------------|--------|------------|
| CA-01 | src/server/api/routers/loan.test.ts:178, :183, :190; e2e/loan-request.e2e.ts:114, :147; e2e/my-loans.e2e.ts:95 | Vitest passou; E2E não rodou | NÃO RODADO | A API passou. A tela (aviso em /my-loans) só tem prova no E2E, que parou no globalSetup |
| CA-02 | loan.test.ts:213 (maintenance, out_of_service), :224 (loaned); e2e/loan-request.e2e.ts:160 | Vitest passou; E2E não rodou | NÃO RODADO | A parte da tela ("Em manutenção. Não pode ser pedido agora.") só está no E2E |
| CA-03 | loan.test.ts:235, :249, :161; e2e/loan-request.e2e.ts:181 | :235 falhou ("promise resolved instead of rejecting"); E2E não rodou | REPROVADO | Com 3 em aberto, o quarto pedido passa. A causa é `LOAN_LIMIT = 5` em src/server/services/loan.ts:6, contra RN-03 (3). A mensagem do RN-10 também vira "Você já está com 5 itens" (loan.ts:15) |
| CA-04 | loan.test.ts:259, :571; e2e/loan-request.e2e.ts:207 | Vitest passou; E2E não rodou | NÃO RODADO | O quadro de bloqueio na tela só está no E2E |
| CA-05 | loan.test.ts:393 | passou | ATENDIDO | Duas conexões e uma barreira, no Testcontainers |
| CA-06 | loan.test.ts:420 | falhou (2 pedidos passaram, o esperado era 1) | REPROVADO | Com o limite em 5, os dois pedidos simultâneos passam e ela fica com 4 |
| CA-07 | prisma/loan-tables.test.ts:83, :97; loan.test.ts:280 | passou | ATENDIDO | |
| CA-08 | src/server/api/routers/equipment.test.ts:107, :127, :135, :145, :151, :183; src/server/csp.test.ts:35, :40; e2e/catalog.e2e.ts:96; e2e/loan-request.e2e.ts:225 | Vitest passou; E2E não rodou | NÃO RODADO | Os 12 cards com a foto carregada e o crédito só se provam no E2E |
| CA-09 | equipment.test.ts:159, :192; e2e/catalog.e2e.ts:128; e2e/loan-request.e2e.ts:239 | Vitest passou; E2E não rodou | NÃO RODADO | Os textos do card e do detalhe só estão no E2E |
| CA-10 | loan.test.ts:527, :560; e2e/loan-header.e2e.ts:30; e2e/my-loans.e2e.ts:126, :154 | :527 e :560 falharam (o `limit` vem 5, o esperado é 3); E2E não rodou | REPROVADO | O header mostraria "N de 5 itens", contra "Você está com 2 de 3 itens" |
| CA-11 | loan.test.ts:297; e2e/loan-header.e2e.ts:65; e2e/loan-request.e2e.ts:248 | :297 falhou (o quarto pedido de Flávia passou); E2E não rodou | REPROVADO | "Sob o mesmo limite do CA-03" não vale: o limite é 5 |
| CA-12 | prisma/loan-tables.test.ts:115, :125; loan.test.ts:310; recusas em loan.test.ts:213, :224, :235, :259 (linha 276), :420 (linha 449) | :115, :125, :310, :213, :224, :259 passaram; :235 e :420 falharam | REPROVADO | O "nenhuma linha gravada" nas recusas pelo limite (CA-03 e CA-06) não se prova: com o limite em 5, a recusa não acontece |
| CA-13 | equipment.test.ts:216, :222; loan.test.ts:331, :586; e2e/catalog.e2e.ts:139; e2e/loan-request.e2e.ts:265; e2e/my-loans.e2e.ts:188 | Vitest passou; E2E não rodou | NÃO RODADO | Os redirecionamentos a /login e a landing de / só estão no E2E |
| CA-14 | loan.test.ts:341 (tenantId, userId, dueOn), :351 | passou | ATENDIDO | |
| CA-15 | equipment.test.ts:175, :206, :230, :241, :247, :254; loan.test.ts:171, :455, :469, :489, :592; prisma/loan-tables.test.ts:158, :170, :184, :206, :220 | passou | ATENDIDO | Os testes que citam ca_15 passaram, inclusive a RLS de `anon` e `authenticated` |
| CA-16 | e2e/my-loans.e2e.ts:166 | não rodou | NÃO RODADO | O ca_16 de e2e/csp.e2e.ts é da spec 001 |
| CA-17 | e2e/my-loans.e2e.ts:175; e2e/loan-request.e2e.ts:170 | não rodou | NÃO RODADO | O ca_17 de e2e/session.e2e.ts e o de src/server/session-proxy.test.ts:98 são da spec 001 |
| CA-18 | src/components/equipment/equipment-card.test.ts:32, :43, :53, :60, :69 | passou | ATENDIDO | O ca_18 de e2e/header.e2e.ts:53 é da spec 001 |

| passo | check | resultado |
|-------|-------|-----------|
| 1a | pnpm lint | passou (`$ eslint`, sem erro) |
| 1b | pnpm typecheck | falhou: `prisma/equipment-tables.test.ts(136,7): error TS2322 ... Property 'imageObject' is missing ... but required in type 'EquipmentUncheckedCreateInput'`. O client gerado estava desatualizado: src/generated/prisma/models/Equipment.ts era das 08:59 e prisma/schema.prisma das 10:24, onde `imageObject` já é `String?` (commit d779f8c). Não é o erro plantado |
| 2 | pnpm test | falhou: `Test Files 2 failed \| 30 passed (32)` · `Tests 6 failed \| 692 passed (698)`. Cinco falhas são do limite (loan.test.ts:235, :297, :420, :527, :560). A sexta (prisma/equipment-tables.test.ts:131, ca_01 da spec 003, PrismaClientValidationError) vem do mesmo client desatualizado |
| 3 | isolamento entre tenants | src/server/api/routers/loan.test.ts (:455, :469, :489, :592), src/server/api/routers/equipment.test.ts (:230 a :254), prisma/loan-tables.test.ts (:158 a :220): passaram |
| 4 | migration | pulado: é do agente principal |
| 5 | pnpm test:e2e | falhou: nenhum caso rodou. O globalSetup (tests/e2e/global-setup.ts:64 → tests/e2e/app.ts:25) roda `next build`, que parou em "Failed to type check" com o mesmo TS2322 do passo 1b |
| 6 | DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build | passou. Ele roda `prisma generate`, que regenerou o client gerado (fora do git), então os passos 1b, 2 e 5 desta rodada usaram o client antigo |
| 7 | git status --short | limpo |

Fora de escopo: nada encontrado (os routers só têm `equipment.list`, `equipment.byId`, `loan.create` e `loan.listMine`; nada de devolução, "Já devolvidos", cancelamento, busca nem chips).

Veredito: NÃO PRONTA — `LOAN_LIMIT = 5` em src/server/services/loan.ts:6 contraria o RN-03 (3), reprova CA-03, CA-06, CA-10, CA-11 e CA-12, e o E2E não rodou porque o client do Prisma estava desatualizado.

Para o agente principal (não é parte do veredito):
- Nesta rodada, o `pnpm build` (passo 6) regenerou o client. Na próxima, o 1b e o E2E devem passar desse erro de tipo, e o ca_01 da spec 003 deve passar.
- O hook do verificador não bloqueou nenhum comando nesta pasta. Todos rodaram com `cd` para a worktree.

## Uma falha que não era do erro plantado

A rodada não foi limpa. Além do erro plantado, a pasta de trabalho tinha um defeito que eu não tinha visto: o client do Prisma (`src/generated/prisma/`, fora do git) fora gerado antes do `d779f8c`, que deixou `image_object` anulável na spec 003. O código e o schema eram os do `81c4288`, mas o client era de um schema mais antigo. Eu deveria ter rodado o `prisma generate` antes de chamar o verificador.

**O que esse defeito derrubou:**
- o `pnpm typecheck` (passo 1b): o TS2322 em `prisma/equipment-tables.test.ts:136`, um teste da spec 003;
- o `pnpm test` (passo 2): uma das seis falhas, o `ca_01` da spec 003 em `prisma/equipment-tables.test.ts:131`;
- o `pnpm test:e2e` (passo 5): ele não rodou nenhum caso, porque o `next build` do `globalSetup` parou no mesmo erro de tipo.

**Quais CAs ele pode ter contaminado.** Os que dependem do E2E para alguma parte: CA-01, CA-02, CA-04, CA-08, CA-09, CA-13, CA-16 e CA-17. O verificador os marcou como NÃO RODADO, não como atendidos nem como reprovados. Nesses, a rodada não diz nada sobre a tela. A prova de que a tela da spec 004 funciona continua sendo a rodada 3 de `verificacao.md`, sobre o `5691596`.

**Por que os cinco reprovados apontam para o `loan.ts:6`, e não para o client.**
- **As falhas vêm do Vitest, não do E2E nem do typecheck.** O Vitest não confere tipos. As cinco falhas estão em `src/server/api/routers/loan.test.ts`, que rodou inteiro.
- **Os testes do `loan.test.ts` gravam equipamento sempre com `imageObject` preenchido.** Para eles, a coluna ser ou não anulável não muda nada. Os outros 25 casos do mesmo arquivo passaram com o mesmo client.
- **Cada falha descreve o limite.**
  - `:235` (CA-03) e `:297` (CA-11): o quarto pedido passou ("promise resolved instead of rejecting").
  - `:420` (CA-06): os dois pedidos simultâneos passaram.
  - `:527` e `:560` (CA-10): o `limit` veio 5, e o esperado era 3.
- **O CA-12 reprova por consequência.** As recusas pelo limite, que os casos `:235` e `:420` conferiam, deixaram de acontecer.
- **Com o client regenerado e o erro desfeito (`02d59b5`), os cinco casos passam de novo.** O `loan.test.ts` dá 30 passed.

O que não dá para afirmar: que o E2E, com o erro plantado, teria reprovado o limite na tela. Ele não rodou.

## O que a rodada mostra

- **Reprovou o que devia.** Os quatro critérios esperados (CA-03, CA-06, CA-10 e CA-11) deram REPROVADO, com a linha do erro como causa. O verificador achou também um quinto, o CA-12: as recusas pelo limite não acontecem mais, então a parte "a recusa não grava auditoria" fica sem prova.
- **Não reprovou o que não devia.** Os critérios que não dependem do limite, como CA-05, CA-07, CA-14, CA-15 e CA-18, continuaram ATENDIDO.
- **Disse o que não rodou, em vez de dar por atendido.** O E2E não rodou nesta rodada. O motivo não tem a ver com o erro: o client do Prisma estava desatualizado na pasta de trabalho, gerado antes do `d779f8c`, que deixou `image_object` anulável (spec 003, T-05). O verificador marcou como NÃO RODADO os CAs que só o E2E prova, em vez de dar esses CAs por atendidos, e separou essa causa da do erro plantado.

## O erro desfeito

O commit `02d59b5`, na mesma branch, é o `git revert` do `81c4288`. Duas conferências provam que o código voltou a ser o da `main`:

- `git diff --stat a217842 02d59b5` sai vazio: a árvore é a mesma da `main` de partida.
- `pnpm exec vitest run src/server/api/routers/loan.test.ts`, com o client regenerado, dá `Test Files 1 passed (1)` e `Tests 30 passed (30)`. Os cinco casos que tinham falhado passam de novo.

Não houve uma segunda rodada do verificador sobre o `02d59b5`. A árvore é a da `main`, e a rodada que vale para a spec é a rodada 3 de `verificacao.md`, que deu PRONTA sobre o `5691596`. Desde ele, o código da spec 004 só mudou pelo `d779f8c`, da spec 003, que deixou `image_object` anulável.

Os dois commits, `81c4288` e `02d59b5`, ficam no remoto na branch `test/004-planted-limit`, sem PR e sem merge, para os hashes continuarem válidos.
