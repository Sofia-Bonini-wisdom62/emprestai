# 004 — Solicitar empréstimo

Status: aprovada
Atualizada em: 2026-11-13

## Objetivo

O colaborador logado vê o catálogo com as fotos, solicita um equipamento disponível e o encontra, com a data de devolução prevista, entre os próprios empréstimos em aberto.

## Vínculo

- PRD: `docs/PRD.md`, seção "O que precisa existir na primeira versão", itens 2 e 3, e o item 1 na parte "cada pessoa vê os próprios empréstimos"; seção "Regras que Operações já decidiu", os quatro itens.
- Prática: Entrega 4, "Briefing — solicitar empréstimo" e "Ao final, em produção"; seção 07, "Antes de entregar". O briefing é pedido, não fonte de regra (prática, seção 01): onde ele contrariava o PRD, a pessoa decidiu nas respostas 40, 41 e 47.
- Restringe: `docs/adr/001-stack.md`, seções 2.3, 2.6, 2.7 e 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/002-design-system.md`; `docs/adr/010-audit-from-loans.md`, que põe a auditoria nesta spec; `docs/adr/011-equipment-images.md`.
- Assume pronto: 001-login (sessão, `tenantProcedure`, papéis `member` e `operations`); 002-equipment-images (o manifesto com o crédito de cada foto); 003, dados iniciais, com a tabela de equipamentos, os 12 equipamentos com imagem e a conta do professor.

## Decisões de 2026-11-12

"Decisão de 2026-11-12" é a resposta da pessoa ("Aceito as recomendações") às 13 recomendações do agente sobre o rascunho desta spec. As de negócio estão em `docs/perguntas-prd.md`, respostas 4b e 40 a 47. As outras ficam aqui:

- **Fatiamento.** Uma spec só para a Entrega 4. O mapa de `docs/plan-andar-zero.md`, seção 5.4, separava catálogo e detalhe, solicitar e Meus empréstimos em três specs, com números que já não valem: a 002 virou a das imagens, e a 003, a dos dados iniciais. O briefing junta as três coisas, e o "Ao final, em produção" confere as três. Alternativas descartadas: três specs, com três rodadas do verificador para uma entrega e uma 004 que não se prova sozinha em produção; e Meus empréstimos na spec da devolução, que deixaria o item 8 do briefing e a seção 07 de fora.
- **Dois pedidos ao mesmo tempo** (briefing, item 7, que não diz como). Duas camadas, dentro do ADR-001 e sem biblioteca nova. Alternativas descartadas: só o índice, que não cobre o limite da pessoa; e transação `Serializable` com nova tentativa, que pede um laço de repetição e falha mais sob carga.
- **Auditoria** (ADR-010, seção 6, deixou o formato para esta spec). A tabela de RN-22. Alternativa descartada: um `metadata jsonb` com patrimônio e data prevista, que duplica dado do empréstimo.
- **Item fora de uso** (pergunta 9b, aberta). Sai desta spec: nenhum dos 12 equipamentos está fora de uso.

"Decisão do plano, de 2026-11-12" é a resposta da pessoa ("Aprovo as cinco") às cinco propostas técnicas de `plan.md`, depois da revisão do `revisor-plano`. Três delas mudam esta spec: a URL da foto (RN-24), a paginação (RN-25) e a landing de `/` (RN-23). As outras duas, a foto por `<img>` e o trigger da auditoria, entram nos RN-26 e RN-22.

## Regras

- RN-01 — Solicitar cria o empréstimo na hora, sem aprovação de Operações nem fila. A retirada é física, no balcão de Operações, sem estado no sistema. Origem: resposta 2; briefing, "Decisão já tomada para a turma".
- RN-02 — Qualquer pessoa com vínculo na área solicita, com o papel `member` ou `operations`, sob as mesmas regras. Origem: resposta 43.
- RN-03 — Cada pessoa tem no máximo 3 empréstimos em aberto. Todo empréstimo em aberto conta, desde a confirmação. Origem: PRD, linha 27; respostas 2 e 40. O briefing, item 4, pedia 5.
- RN-04 — A data prevista de devolução é a data da confirmação, em `America/Sao_Paulo`, mais 14 dias corridos, sem ajuste para fim de semana, feriado ou balcão fechado. Origem: PRD, linha 28; respostas 4, 4b e 41. O briefing, item 3, pedia 14 dias úteis.
- RN-05 — Um empréstimo em aberto está em atraso a partir do dia seguinte à data prevista, em `America/Sao_Paulo`. Quem devolve no último dia está no prazo. Origem: resposta 42.
- RN-06 — Quem tem empréstimo em atraso não solicita outro. Origem: PRD, linha 29; briefing, item 5, que diz o mesmo.
- RN-07 — Só equipamento na situação `available` pode ser solicitado; `maintenance`, `loaned` e `out_of_service` não podem. Origem: PRD, linha 30; resposta 16; briefing, itens 2 e 6.
- RN-08 — Ao solicitar, o equipamento passa a `loaned` na mesma transação que cria o empréstimo. Origem: briefing, item 3.
- RN-09 — Dois pedidos ao mesmo equipamento ao mesmo tempo criam um empréstimo só; o outro recebe `EQUIPMENT_UNAVAILABLE`. Dois pedidos da mesma pessoa ao mesmo tempo não a levam além do limite. Na transação do pedido, nesta ordem:
  1. `SELECT ... FOR UPDATE` no vínculo da pessoa, que enfileira os pedidos dela, antes de contar os empréstimos em aberto e conferir o atraso;
  2. `UPDATE` do equipamento para `loaned` com `WHERE id = ... AND tenant_id = ... AND status = 'available'`; zero linhas vira `EQUIPMENT_UNAVAILABLE`;
  3. `INSERT` do empréstimo.

  Como defesa, um índice único parcial em `loans (equipment_id) WHERE returned_at IS NULL`, cuja violação também vira `EQUIPMENT_UNAVAILABLE`. O `FOR UPDATE` sai em `$queryRaw`, e o índice parcial em SQL na migration. Origem: briefing, item 7; decisão de 2026-11-12.
- RN-10 — A recusa diz o motivo, nunca um erro genérico, com o código e o texto:
  - `EQUIPMENT_UNAVAILABLE` — "Este equipamento não está disponível.";
  - `LOAN_LIMIT_REACHED` — "Você já está com 3 itens. Devolva um para pedir outro.";
  - `LOAN_OVERDUE` — "Você tem um item em atraso. Devolva-o para pedir outro.".

  Origem: briefing, "Ao final, em produção"; `docs/layout.md`, seção 9; decisão de 2026-11-12.
- RN-11 — Cada equipamento é uma unidade física, identificada pelo patrimônio. Origem: resposta 1.
- RN-12 — O catálogo (`/catalog`) lista os equipamentos da área da sessão. Cada card mostra a foto em 4:3 no topo, o nome, a linha "categoria · patrimônio" e a pill da situação; o ícone da categoria só aparece em equipamento sem imagem. Origem: briefing, item 1; respostas 12 e 46; `docs/layout.md`, seção 5, card de equipamento.
- RN-13 — A última linha do card segue o `docs/layout.md`: "Ver e solicitar" no disponível; "Com <nome>" e "Volta até dd/mm" no emprestado; "Em manutenção" no item em manutenção, que aparece sem a opção de pedir. Origem: respostas 14, 16 e 47.
- RN-14 — A página do catálogo e a do detalhe mostram "Fotos: Pixabay", com link para `https://pixabay.com`. Origem: contrato da skill, "Crédito na tela"; decisão da pessoa de 2026-11-11, registrada na spec 002, "Fora de escopo", de manter o crédito; resposta 47; decisão da pessoa de 2026-11-13 ("Confirmo a troca"), tomada depois de o Pexels pausar a emissão de chaves, que troca a fonte das fotos do Pexels pelo Pixabay e, com ela, o texto e o link do crédito. As fotos continuam servidas do nosso bucket, nunca do Pixabay, então a CSP do RN-26 não muda. Contraria o item 9 do briefing ("sem rodapé nem texto de crédito").
- RN-15 — Solicitar fica no detalhe (`/catalog/[equipmentId]`), no card "Solicitar empréstimo", que mostra "Devolver até dd/mm/aaaa" e "Retire no balcão de Operações". O pedido passa por um diálogo de confirmação com a data prevista, o local e a contagem resultante ("depois deste, você fica com N de 3 itens"). O detalhe mostra a foto na área de imagem, o nome, a pill, a categoria e o patrimônio. Origem: `docs/layout.md`, seção 6, tela 3, e seção 7.1; respostas 44 e 46.
- RN-16 — Item que não está disponível mostra a situação no lugar do botão: "Com <nome> · volta até dd/mm/aaaa" no emprestado e "Em manutenção. Não pode ser pedido agora." no item em manutenção. No limite ou com atraso, o botão fica desabilitado com o motivo do RN-10 ao lado. Origem: `docs/layout.md`, seção 6, tela 3; respostas 14 e 16.
- RN-17 — Depois de confirmar, a pessoa vai para `/my-loans`, com o aviso de resultado "Empréstimo confirmado. Retire o item no balcão de Operações e devolva até dd/mm/aaaa.". Origem: `docs/layout.md`, seção 7.1; resposta 44; decisão de 2026-11-12.
- RN-18 — Meus empréstimos (`/my-loans`) lista só os empréstimos em aberto da pessoa, na seção "Itens com você", cada um com o nome, o patrimônio e a data prevista, sem botão "Devolver". Sem empréstimo: "Você não está com nenhum item", com link para o catálogo. Origem: PRD, item 1; briefing, item 8; `docs/layout.md`, seção 6, tela 4.
- RN-19 — O header mostra "Você está com N de 3 itens" e os links "Catálogo" e "Meus empréstimos", para todo papel. Quem é de Operações continua caindo em `/operations/loans` depois de entrar (spec 001, RN-22) e chega ao catálogo por esses links. A navegação lateral do `docs/layout.md`, seção 7.1, fica para depois. Origem: `docs/layout.md`, seções 5 e 7.2; resposta 43; proposta do agente para a resposta 43 ter caminho, confirmada na aprovação da spec.
- RN-20 — Datas em `America/Sao_Paulo`, no formato de `docs/layout.md`, seção 9. Origem: `docs/layout.md`, seção 9.
- RN-21 — A área, a pessoa e o papel saem da sessão, nunca do input; o input de `loan.create` só traz o id do equipamento. Origem: ADR-001, 2.6; spec 001, RN-15.
- RN-22 — Criar um empréstimo grava, na mesma transação, uma linha em `audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, created_at)`, com `action = 'loan.create'` e `resource_type = 'loan'`. A tabela é append-only: `UPDATE` e `DELETE` nela falham, também para o papel com que a aplicação conecta, que é o dono das tabelas, por um trigger `BEFORE UPDATE OR DELETE` que levanta exceção. A migration da tabela e da garantia passa por revisão humana (`rules/restrictions.md`, Bancos e schema). Origem: ADR-001, 2.10; ADR-010; decisão de 2026-11-12; decisão do plano, de 2026-11-12.
- RN-23 — A raiz `/` continua com a landing que mostra a saúde do banco, pública, como na spec 001 e nos AZ-05 e AZ-09 do andar zero. Quem entra pelo login cai no catálogo (spec 001, RN-22). Origem: decisão do plano, de 2026-11-12, que preferiu a spec 001, o `docs/andar-zero.md`, `rules/tests.md` e o `AGENTS.md` ao redirecionamento do `docs/layout.md`, seção 6.
- RN-24 — A URL pública da foto é a `EQUIPMENT_IMAGES_BASE_URL` seguida do `image_object` do equipamento. A variável é de servidor, opcional e sem segredo. Em Production, é a URL pública do bucket `equipment-images`. Vazia, a API devolve `imageUrl: null`, e a tela mostra o ícone da categoria (RN-12). No `.env.local` ela fica vazia: nada no dev lê o projeto de produção. No E2E, ela aponta para um servidor local de teste que serve um JPEG fictício de 800×600. Origem: ADR-011, que deixa para esta spec de onde vêm as fotos no dev; ADR-004; decisão do plano, de 2026-11-12.
- RN-25 — `equipment.list` pagina por cursor, 24 por página, em ordem de patrimônio, e a tela usa `useInfiniteQuery`. `loan.listMine` não pagina, porque o RN-03 a limita a 3 linhas: quando uma lista pagina, é por cursor, nunca por offset. Origem: ADR-001, 2.3; decisão do plano, de 2026-11-12.
- RN-26 — A foto entra por `<img>` com `width="800"` e `height="600"`, sem `next/image`, que escreve `style` (ADR-002). A CSP acrescenta ao `img-src` só a origem da `EQUIPMENT_IMAGES_BASE_URL`, e só quando ela existe. A regra `@next/next/no-img-element` ganha uma exceção no `eslint.config.mjs`, com a justificativa, restrita aos arquivos do card e do detalhe. Origem: ADR-002; ADR-001, 2.10; `rules/restrictions.md`, Ferramentas; decisão do plano, de 2026-11-12.

## Critérios de aceitação

Pessoas são as do `docs/layout.md`, seção 10, e equipamentos os da spec 003; a conta do professor não aparece em teste. "Relógio de teste" é a data fixada no teste, em `America/Sao_Paulo`.

- CA-01 — Dado Beatriz Fontes, `member` na `default`, sem empréstimo, o TI-0001 `available` e o relógio de teste em 12/11/2026, quando ela confirma a solicitação no detalhe do TI-0001, então existe um empréstimo em aberto dela para o TI-0001 com data prevista 26/11/2026, o TI-0001 fica `loaned`, e ela cai em `/my-loans`, com o aviso "Empréstimo confirmado. Retire o item no balcão de Operações e devolva até 26/11/2026." e o TI-0001 na lista.
- CA-02 — Dado o TI-0004 em `maintenance`, quando Beatriz abre o detalhe dele, então o card mostra "Em manutenção. Não pode ser pedido agora." no lugar do botão; e quando `loan.create` é chamado direto com o id do TI-0004, então falha com `EQUIPMENT_UNAVAILABLE` e nada é gravado. O mesmo vale para um item `loaned` e para um `out_of_service`.
- CA-03 — Dado Beatriz com 3 empréstimos em aberto, nenhum em atraso, quando ela pede o TI-0002 `available`, então a chamada falha com `LOAN_LIMIT_REACHED`, o detalhe mostra "Você já está com 3 itens. Devolva um para pedir outro." ao lado do botão desabilitado, e o TI-0002 continua `available`. Com 2 em aberto, o pedido passa, e o diálogo mostra "depois deste, você fica com 3 de 3 itens".
- CA-04 — Dado Caio Moreira com um empréstimo de data prevista 26/11/2026: com o relógio de teste em 26/11/2026, ele pede o TI-0002 e o pedido passa; com o relógio em 27/11/2026, a chamada falha com `LOAN_OVERDUE`, o detalhe mostra o quadro de regras na variante de bloqueio com "Você tem um item em atraso. Devolva-o para pedir outro.", e o TI-0002 continua `available`.
- CA-05 — Dado o TI-0005 `available`, e Beatriz e Enzo Paiva sem empréstimo, quando os dois chamam `loan.create` para o TI-0005 em transações simultâneas, então exatamente uma cria o empréstimo, a outra falha com `EQUIPMENT_UNAVAILABLE`, e o banco tem um único empréstimo em aberto do TI-0005. Contra o Postgres do Testcontainers, sem mock.
- CA-06 — Dado Beatriz com 2 empréstimos em aberto, quando ela pede o TI-0005 e o TI-0006, os dois `available`, em transações simultâneas, então exatamente um pedido passa, o outro falha com `LOAN_LIMIT_REACHED`, e ela termina com 3 empréstimos em aberto.
- CA-07 — Dado um empréstimo em aberto do TI-0005, quando um `INSERT` direto em `loans` cria outro em aberto para o TI-0005, então o banco recusa pelo índice único parcial.
- CA-08 — Dado o banco com os 12 equipamentos da spec 003, quando Beatriz abre `/catalog`, então vê 12 cards, cada um com a foto carregada da URL do RN-24 (no E2E, a do servidor de teste), o nome, "categoria · patrimônio" e a pill da situação, e a página mostra o crédito "Fotos: Pixabay", com o link "Pixabay" para `https://pixabay.com`. O detalhe de qualquer um deles também mostra a foto e o crédito.
- CA-09 — Dado o TI-0001 emprestado a Beatriz com data prevista 26/11/2026, quando Enzo abre `/catalog`, então o card do TI-0001 mostra a pill "Emprestado", "Com Beatriz Fontes" e "Volta até 26/11"; e o detalhe mostra "Com Beatriz Fontes · volta até 26/11/2026" no lugar do botão.
- CA-10 — Dado Beatriz com dois empréstimos em aberto e Enzo com um, quando ela abre `/my-loans`, então vê só os dois dela, cada um com nome, patrimônio e data prevista, sem botão "Devolver", e o header mostra "Você está com 2 de 3 itens". Sem empréstimo, a tela mostra "Você não está com nenhum item" e o link para o catálogo.
- CA-11 — Dado Flávia Rocha, `operations` na `default`, sem empréstimo, quando ela entra, então cai em `/operations/loans`; pelo link "Catálogo" do header chega a `/catalog` e solicita o TI-0002 como no CA-01, sob o mesmo limite do CA-03.
- CA-12 — Quando `loan.create` cria um empréstimo, então `audit_events` ganha uma linha com o id de Beatriz em `actor_user_id`, a área `default`, `action = 'loan.create'`, `resource_type = 'loan'` e o id do empréstimo. Quando o pedido é recusado (CA-02 a CA-06), nenhum empréstimo e nenhuma linha são gravados. `UPDATE` e `DELETE` em `audit_events`, pelo papel da aplicação, falham.
- CA-13 — Sem sessão, `/catalog`, `/catalog/[equipmentId]` e `/my-loans` levam a `/login`, e `equipment.list`, `equipment.byId`, `loan.create` e `loan.listMine` respondem `UNAUTHORIZED`. `/` continua mostrando a landing, sem sessão.
- CA-14 — `loan.create` recusa, na validação do Zod, um input com `tenantId`, `userId` ou `dueOn`, e um `equipmentId` que não seja UUID.
- CA-15 — **Isolamento:** dado as áreas A e B, cada uma com um equipamento `available` e um empréstimo em aberto, e Beatriz com vínculo só em A:
  - `equipment.list` e `equipment.byId` não devolvem o equipamento de B, e `equipment.byId` com o id dele responde `NOT_FOUND`;
  - `loan.listMine` não devolve o empréstimo de B;
  - `loan.create` com o id do equipamento de B falha com `NOT_FOUND` e não grava empréstimo nem auditoria, e o equipamento de B continua `available`;
  - o contador, o limite e o atraso de Beatriz não contam o empréstimo de B;
  - nenhum card nem detalhe de A mostra o nome de quem pegou o item de B;
  - os papéis `anon` e `authenticated` não leem nenhuma linha de `loans` nem de `audit_events`.

## Fora de escopo / não decidido

- Fora de escopo, pelo briefing ("Fora de escopo") ou pelo PRD:
  - devolução e a seção "Já devolvidos" de Meus empréstimos (respostas 3 e 8);
  - tela de Operações (respostas 11 e 13);
  - reserva com data futura, notificação por e-mail e renovação;
  - cancelar um empréstimo confirmado (pergunta 20, aberta, da spec de devolução).
- Fora de escopo, pelo fatiamento da decisão de 2026-11-12, para a próxima spec do catálogo:
  - o histórico do detalhe (respostas 8 e 8b);
  - a busca do header (resposta 11b; pergunta 11c);
  - os chips de categoria e o "Mostrar só o que está livre";
  - o quadro de regras na variante informativa e a linha "M de N equipamentos podem ser pedidos". A variante de bloqueio entra, no CA-04;
  - a navegação lateral (`docs/layout.md`, seção 7.1).
- Fora de escopo, pela decisão de 2026-11-12: o item fora de uso no catálogo (pergunta 9b, aberta). A API devolve a situação, e a tela não trata o caso.
- Fora de escopo, pela decisão do plano, de 2026-11-12: `/` redirecionar para o catálogo, como desenha o `docs/layout.md`, seção 6. Volta quando a pessoa decidir trocar os critérios AZ-05 e AZ-09 do andar zero.
- Fora de escopo, por resposta: o teste da pessoa em produção, que pede no máximo um item, com uma conta de teste dela, e deixa ao menos 8 dos 9 disponíveis da spec 003 para o professor, que precisa de 4 (resposta 45).
- Fora desta spec, da 003: quais equipamentos ficam em manutenção. A lista da Entrega 2 põe TI-0004, TI-0007 e TI-0010 em `manutencao`, e o briefing de dados iniciais, item 3, só TI-0004 e TI-0007. A spec 003 decide; esta só a cita.
- Fora desta spec: atualizar o `docs/layout.md` com a foto no card e no detalhe (resposta 46) e com o limite de 3 já confirmado. Fica para o plano.
- Não decidido: nada.

## Contrato afetado

- Endpoint:
  - `equipment.list` — novo, `tenantProcedure`. Input `{ cursor?: uuid, limit?: 1..24, direction?: "forward" | "backward" }`, estrito (a direção é a que o `useInfiniteQuery` do tRPC manda, e o service a ignora); devolve `{ items, nextCursor }` (RN-25), só com equipamentos da área. Cada item traz id, patrimônio, nome, categoria, situação, URL pública da imagem e, se emprestado, o nome de quem está com ele e a data prevista.
  - `equipment.byId` — novo, `tenantProcedure`. Input `{ equipmentId: uuid }`, estrito. O mesmo formato. Equipamento de outra área é `NOT_FOUND`.
  - `loan.create` — novo, mutação `tenantProcedure`. Input `{ equipmentId: uuid }`, estrito. Devolve o empréstimo com a data prevista, ou falha com um dos códigos do RN-10 ou `NOT_FOUND`.
  - `loan.listMine` — novo, `tenantProcedure`, `.input(z.void())`. Os empréstimos em aberto da pessoa, a contagem, o limite e se há atraso, que o header, o detalhe e o quadro de bloqueio usam.
- Service: `src/server/services/loan.ts` e `src/server/services/equipment.ts`, novos. RN-03 a RN-09 moram no service, nunca no router nem na tela.
- Tela:
  - `/catalog` — deixa de ser provisória: grid de cards e o crédito do Pixabay;
  - `/catalog/[equipmentId]` — nova: foto, ficha, card "Solicitar empréstimo", diálogo de confirmação e crédito;
  - `/my-loans` — nova: "Itens com você", sem "Devolver";
  - header — ganha o contador e os links "Catálogo" e "Meus empréstimos";
  - CSP (`src/server/csp.ts`) — o `img-src` ganha a origem do RN-26;
- Tabela:
  - `loans` — nova: `id`, `tenant_id`, `equipment_id`, `user_id` (id do Auth, sem FK, como na spec 001, RN-18), `created_at` (a confirmação), `due_on` (data), `returned_at` (nulo nesta spec), com o índice único parcial do RN-09. RLS ligada, com a policy explícita `loans_deny_all` para `anon` e `authenticated`, no padrão das tabelas da spec 001 (`rules/migration.md`, passo 3).
  - `audit_events` — nova, no formato do RN-22, com a mesma RLS (`audit_events_deny_all`).
  - `equipments` — a da spec 003; esta spec só muda `status` de `available` para `loaned`, e lê `asset_tag`, `name`, a categoria em `equipment_categories` e `image_object`.
- **Não pode mudar:**
  - os procedimentos e as telas da spec 001, inclusive o destino de cada papel depois de entrar (RN-22 da 001) e a landing de `/` (RN-23);
  - o formato do equipamento e o seed da spec 003, inclusive a conta do professor, que chega à correção com zero empréstimos (prática, seção 01);
  - o manifesto e o bucket da spec 002;
  - o agente não escreve no banco nem no Storage do deploy.
