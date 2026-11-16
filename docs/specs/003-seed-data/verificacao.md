# 003 — Verificação

## Rodada 1 — 2026-11-16

Spec: docs/specs/003-seed-data/spec.md · HEAD: 9c68b9b · Escopo: tudo que implementa esta spec (worktree C:\dev\emprestai-003-t03; os caminhos abaixo partem dela)

| CA | evidência (arquivo:linha do teste) | teste nesta rodada | status | observação |
|----|------------------------------------|--------------------|--------|------------|
| CA-01 | prisma/equipment-data.test.ts:105 (lista real dos 12), :64, :57; prisma/equipment-tables.test.ts:131; src/server/services/equipment.test.ts:10 | passou | ATENDIDO | Exercita `loadEquipmentData` (prisma/equipment-data.ts:128). O caso grava numa área própria, não na `default` (plano, passo 2, mudança de 2026-11-16). A parte "banco vazio com a `default`" está no ca_09 (prisma/load-equipment.test.ts:108) e no ca_07 do E2E, que passaram. |
| CA-02 | prisma/equipment-data.test.ts:164 | passou | ATENDIDO | O caso usa a lista fictícia de 4 itens. Os 12 reais, com os mesmos ids e valores na segunda rodada, estão no ca_09 (prisma/load-equipment.test.ts:150), que passou. |
| CA-03 | prisma/equipment-data.test.ts:179 | passou | ATENDIDO | TI-0001 em `loaned` e renomeado continua igual depois da rodada nova. |
| CA-04 | prisma/equipment-data.test.ts:47, :51, :195 | passou | REPROVADO | As três primeiras frases estão provadas: troca de 111 para 222 em :195; de nula para a foto em :195 (TI-0002), :179 e :287 (TI-0001). A 4ª frase não: a terceira rodada de :195 passa `null` (sem manifesto), e não "um manifesto sem foto para ele". Nenhum caso da suíte põe um equipamento que já tem foto diante de um manifesto que existe e não traz a foto dele. Pela leitura dos casos, uma implementação que anulasse a imagem nessa situação passaria em todos. Falta o caso; nenhum teste falhou, e a guarda está em prisma/equipment-data.ts:181. |
| CA-05 | prisma/equipment-data.test.ts:228 (quatro entradas, em :216 a :226), :151 | passou | ATENDIDO | Um motivo por caso, cada um com zero categorias e zero equipamentos na área depois da recusa. A foto de patrimônio fora da lista, ignorada sem recusa (RN-08), está em :151. Validação em prisma/equipment-data.ts:58. |
| CA-06 | prisma/equipment-data.test.ts:239 | passou | ATENDIDO | O caso observa as escritas por modelo do Prisma; não enxerga SQL cru, e `auth.users` não é modelo. Complementam, e passaram: prisma/load-equipment.test.ts:143 (só a `default`, zero vínculos, nomes e empréstimos depois do script) e e2e/seed.e2e.ts:30 (`auth.users` só com a conta do seed depois de duas rodadas). |
| CA-07 | e2e/seed.e2e.ts:45, com o ca_13 em :30 | passou | ATENDIDO | Os dois casos passaram nesta rodada, embora o `pnpm test:e2e` tenha falhado em casos de outras specs (passo 5). Log do seed: 12 criados e 12 sem foto na primeira rodada, 0 criados nas seguintes. |
| CA-08 | prisma/no-secrets.test.ts:64, :80, :86; controles da varredura em :36, :51, :70 | passou | ATENDIDO | A varredura lê tudo em `prisma/`, com `prisma/data/` e as migrations. |
| CA-09 | prisma/load-equipment.test.ts:108, :150, :227; também :143, :162, :180, :205, :219 | passou | ATENDIDO | `prisma/load-equipment.ts` rodado por `node --import ./prisma/resolve-ts.mjs`, só com `DIRECT_URL`, num banco próprio do Testcontainers, sem Auth. O passo que o chama ainda não está em `.github/workflows/production.yml` neste HEAD: aplicar o texto é da pessoa (spec, Fora de escopo). |
| CA-10 | prisma/equipment-data.test.ts:259, :281; prisma/equipment-tables.test.ts:68, :80, :94, :115 | passou | ATENDIDO | O carregamento é chamado com a área A no lugar da `default` (plano, passo 2); a `default` como padrão está no ca_09 (prisma/load-equipment.test.ts:108). RLS com `SET LOCAL ROLE` para `anon` e `authenticated`, controle com a RLS desligada e `pg_policies`. |
| CA-11 | prisma/equipment-data.test.ts:287 | passou | ATENDIDO | Lista fictícia de 4 e manifesto fictício. Com os 12 reais, sem manifesto e depois com o manifesto fictício, mesmos ids: prisma/load-equipment.test.ts:108 e :162. O manifesto aprovado (`prisma/data/equipment-images.json`) ainda não existe no repositório. |

| passo | check | resultado |
|-------|-------|-----------|
| 1a | pnpm lint | passou · saída só com `$ eslint`, sem erro nem aviso |
| 1b | pnpm typecheck | passou · saída só com `$ tsc --noEmit` |
| 2 | pnpm test | passou · `Test Files  40 passed (40)` · `Tests  833 passed (833)` · 111,07 s; os 40 arquivos de teste versionados rodaram, nenhum pulado |
| 3 | isolamento entre tenants | não se aplica: a spec não cria nem altera procedure tRPC (plano, Caminho); o isolamento dela é o CA-10, em prisma/equipment-data.test.ts e prisma/equipment-tables.test.ts, que passaram |
| 4 | migration | pulado: é do agente principal |
| 5 | pnpm test:e2e | falhou · `6 failed` · `2 did not run` · `71 passed (25.4m)`. Os seis por tempo esgotado de 30 s, do teste ou do afterAll, em casos das specs 001 e 004: e2e/catalog.e2e.ts:96 (ca_08, esperando a foto chegar a 800×600 em :112), e2e/loan-header.e2e.ts:65 (ca_11, no afterAll), e2e/loan-request.e2e.ts:225 (ca_08) e :239 (ca_09), e2e/login.e2e.ts:100 (ca_19), e2e/my-loans.e2e.ts:175 (ca_17). Não rodaram e2e/catalog.e2e.ts:128 e :139, e o projeto `preview` nem começou, porque o primeiro comando falhou. Causa não apurada; a rodada levou 25,4 min, contra 10,8 min registrados na T-04. Traces em C:\dev\emprestai-003-t03\test-results\ |
| 6 | DATABASE_URL=postgresql://127.0.0.1:1/x pnpm build | passou · `✓ Compiled successfully in 3.6s`, 12 rotas geradas |
| 7 | git status --short | limpo |

Fora de escopo: nada encontrado (anotado e não contado: `equipment_categories` tem `created_at`, que a lista de colunas do Contrato afetado não cita; é o padrão das tabelas da spec 001 e do plano, passo 1. Os commits da 003 não tocaram `package.json` nem o lockfile.)
Veredito: NÃO PRONTA — o `pnpm test:e2e` falhou nesta rodada (6 casos de outras specs por tempo esgotado, 2 sem rodar e o projeto `preview` sem rodar), e a 4ª frase do CA-04 não tem caso com um manifesto que existe e não traz a foto do patrimônio.
