# 004 — Solicitar empréstimo

Status: rascunho
Atualizada em: 2026-11-12

## Objetivo

O colaborador logado vê o catálogo com as fotos, solicita um equipamento disponível e o encontra, com a data de devolução prevista, entre os próprios empréstimos em aberto.

## Vínculo

- PRD: `docs/PRD.md`, seção "O que precisa existir na primeira versão", itens 2 e 3, e o item 1 na parte "cada pessoa vê os próprios empréstimos"; seção "Regras que Operações já decidiu", os quatro itens.
- Prática: Entrega 4, "Briefing — solicitar empréstimo" e "Ao final, em produção"; seção 07, "Antes de entregar". O briefing é pedido, não fonte de regra (prática, seção 01): onde ele contraria o PRD, a pergunta está em Não decidido.
- Restringe: `docs/adr/001-stack.md`, seções 2.3, 2.6, 2.7 e 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/002-design-system.md`; `docs/adr/010-audit-from-loans.md`, que põe a auditoria nesta spec; `docs/adr/011-equipment-images.md`.
- Assume pronto: 001-login (sessão, `tenantProcedure`, papéis `member` e `operations`); 002-equipment-images (o manifesto com o crédito de cada foto); 003, dados iniciais, com a tabela de equipamentos, os 12 equipamentos com imagem e a conta do professor.

## Fatiamento proposto

O mapa de `docs/plan-andar-zero.md`, seção 5.4, separa catálogo e detalhe, solicitar e Meus empréstimos em três specs. Os números do mapa já não valem: a 002 virou a das imagens, e a 003, a dos dados iniciais. O briefing da Entrega 4 junta as três coisas numa entrega só, e o "Ao final, em produção" confere as três.

Este rascunho segue a alternativa A, a recomendada, e a escolha é da pessoa (Não decidido, item 1):

| Alternativa | O que entra na 004 | Custo |
|---|---|---|
| A | Catálogo e detalhe sem histórico, busca e filtros; solicitar; Meus empréstimos só com os itens em aberto | Uma spec maior; uma rodada do verificador cobre a Entrega 4 inteira |
| B | Só solicitar (botão e diálogo no detalhe), como no mapa; catálogo e Meus empréstimos em specs próprias | Três specs e três rodadas do verificador para uma entrega; a 004 não se prova sozinha em produção |
| C | Catálogo e solicitar na 004; Meus empréstimos, com a devolução, na seguinte | O item 8 do briefing fica para depois da entrega, e a seção 07 não fecha |

## Regras

Só o que já está decidido. As regras que o briefing contradiz ficam em Não decidido, com o número da pergunta.

- RN-01 — Solicitar cria o empréstimo na hora, sem aprovação de Operações nem fila. A retirada é física, no balcão de Operações, sem estado no sistema. Origem: resposta 2; briefing, "Decisão já tomada para a turma".
- RN-02 — Todo empréstimo em aberto conta para o limite, desde a confirmação. Origem: resposta 2.
- RN-03 — O prazo conta a partir da confirmação. Origem: resposta 4. Se em dias corridos ou úteis, e quantos itens cabem: Não decidido, itens 2 e 3.
- RN-04 — Só equipamento na situação `available` pode ser solicitado. `maintenance`, `loaned` e `out_of_service` não podem. Origem: PRD, "Equipamento em manutenção não aparece como disponível"; resposta 16; briefing, itens 2 e 6.
- RN-05 — Quem tem empréstimo em atraso não solicita outro. Origem: PRD, "Quem tem item em atraso não pode pegar outro emprestado"; briefing, item 5, que diz o mesmo. Quando um empréstimo passa a estar em atraso: Não decidido, item 4.
- RN-06 — Ao solicitar, o equipamento passa a `loaned` na mesma transação que cria o empréstimo. Origem: briefing, item 3.
- RN-07 — Dois pedidos ao mesmo equipamento ao mesmo tempo criam um empréstimo só; o outro recebe a recusa de item indisponível. Origem: briefing, item 7. O mecanismo: Não decidido, item 9.
- RN-08 — A recusa diz o motivo, nunca um erro genérico. Origem: briefing, "Ao final, em produção"; `docs/layout.md`, seção 9. Cada motivo tem um código:
  - `EQUIPMENT_UNAVAILABLE` — "Este equipamento não está disponível.";
  - `LOAN_LIMIT_REACHED` — "Você já está com <limite> itens. Devolva um para pedir outro.";
  - `LOAN_OVERDUE` — "Você tem um item em atraso. Devolva-o para pedir outro.".

  A copy é proposta do agente, no tom do `docs/layout.md`, seção 9; a final entra com a aprovação desta spec (ADR-002, seção 6).
- RN-09 — Cada equipamento é uma unidade física, identificada pelo patrimônio. Origem: resposta 1.
- RN-10 — O catálogo lista os equipamentos da área da sessão, cada um com a imagem, o nome, a categoria, o patrimônio e a pill da situação. Origem: briefing, item 1; resposta 12; `docs/layout.md`, seção 5, card de equipamento. A imagem no lugar do ícone da categoria: Não decidido, item 6.
- RN-11 — Item em manutenção aparece no catálogo, sem a opção de pedir. Origem: resposta 16. Quais estão em manutenção é da spec 003.
- RN-12 — Item emprestado mostra quem está com ele e a data de devolução. Origem: resposta 14.
- RN-13 — A tela que exibe as fotos mostra "Fotos: Pexels", com link para `https://www.pexels.com`. Origem: contrato da skill, "Crédito na tela", exigido pelas diretrizes da API do Pexels; decisão da pessoa de 2026-11-11, registrada na spec 002, "Fora de escopo", que passa a implementação e o CA à spec do catálogo. Contraria o item 9 do briefing ("sem rodapé nem texto de crédito"): o conflito fica registrado aqui e no `ENTREGA.md`.
- RN-14 — Solicitar fica no detalhe do equipamento (`/catalog/[equipmentId]`), no card "Solicitar empréstimo", e passa por um diálogo de confirmação que mostra a data de devolução e a contagem resultante. Origem: `docs/layout.md`, seção 6, tela 3, e seção 7.1.
- RN-15 — Depois de confirmar, a pessoa vai para Meus empréstimos, com o aviso de resultado. Origem: `docs/layout.md`, seção 7.1, como proposta a confirmar nesta spec; o texto do aviso depende do item 5 de Não decidido (local de retirada).
- RN-16 — Meus empréstimos (`/my-loans`) lista os empréstimos em aberto da pessoa, cada um com o nome, o patrimônio e a data de devolução prevista. Origem: PRD, item 1; briefing, item 8.
- RN-17 — Datas em `America/Sao_Paulo`, no formato de `docs/layout.md`, seção 9. Origem: `docs/layout.md`, seção 9.
- RN-18 — O header mostra a contagem "Você está com N de <limite> itens"; no limite, o solicitar fica desabilitado com o motivo escrito. Origem: `docs/layout.md`, seções 5 e 7.2.
- RN-19 — A área, a pessoa e o papel saem da sessão, nunca do input; o input só traz o id do equipamento. Origem: ADR-001, 2.6; spec 001, RN-15.
- RN-20 — Criar um empréstimo grava, na mesma transação, uma linha de auditoria append-only com ator, área, ação e recurso. Origem: ADR-001, 2.10; ADR-010. O formato da tabela: Não decidido, item 10.
- RN-21 — A raiz `/` passa a redirecionar para `/catalog`, e a landing provisória sai. Origem: spec 001, RN-33; `docs/layout.md`, seção 6. Vale só na alternativa A ou C do fatiamento.

## Critérios de aceitação

Nos CAs, `<limite>` e `<prazo>` são os valores das perguntas 40 e 41 e entram quando a pessoa responder. Pessoas e patrimônios são os do `docs/layout.md`, seção 10, e da spec 003; a conta do professor não aparece em teste.

- CA-01 — Dado Beatriz Fontes, `member` na `default`, sem empréstimo, e o equipamento TI-0001 `available`, quando ela confirma a solicitação no detalhe do TI-0001, então existe um empréstimo em aberto dela para o TI-0001, com data de devolução igual à da confirmação somada a `<prazo>`, o TI-0001 fica `loaned`, e ela cai em `/my-loans`, que mostra o TI-0001 e a data.
- CA-02 — Dado o TI-0004 em `maintenance`, quando Beatriz abre o detalhe dele, então o card mostra "Em manutenção. Não pode ser pedido agora." no lugar do botão; e quando `loan.create` é chamado direto com o id do TI-0004, então a chamada falha com `EQUIPMENT_UNAVAILABLE` e nenhum empréstimo é criado. O mesmo vale para um item `loaned` e para um `out_of_service`.
- CA-03 — Dado Beatriz com `<limite>` empréstimos em aberto, nenhum em atraso, quando ela pede o TI-0002 `available`, então a chamada falha com `LOAN_LIMIT_REACHED`, o detalhe mostra o motivo ao lado do botão desabilitado, e o TI-0002 continua `available`. Com `<limite>` − 1, o pedido passa, e o diálogo avisa que ela completa o limite.
- CA-04 — Dado Caio Moreira com um empréstimo cuja data de devolução já passou (relógio de teste fixado), quando ele pede o TI-0002, então a chamada falha com `LOAN_OVERDUE`, o catálogo e o detalhe mostram o quadro de regras na variante de bloqueio, e o TI-0002 continua `available`. O instante em que o empréstimo passa a atrasado segue a resposta da pergunta 42.
- CA-05 — Dado o TI-0005 `available` e duas pessoas, Beatriz e Enzo Paiva, sem empréstimo, quando as duas chamam `loan.create` para o TI-0005 ao mesmo tempo (as duas transações abertas antes de qualquer uma confirmar), então exatamente uma cria o empréstimo, a outra falha com `EQUIPMENT_UNAVAILABLE`, e o banco tem um único empréstimo em aberto do TI-0005. O teste roda contra o Postgres do Testcontainers, sem mock.
- CA-06 — Dado Beatriz com `<limite>` − 1 empréstimos em aberto, quando ela pede dois equipamentos diferentes `available` ao mesmo tempo, então só um pedido passa e ela termina com `<limite>` empréstimos em aberto, nunca `<limite>` + 1.
- CA-07 — Dado o banco com os 12 equipamentos da spec 003, quando Beatriz abre `/catalog`, então vê 12 cards, cada um com a imagem de 800×600 do bucket `equipment-images`, o nome, a categoria, o patrimônio e a pill da situação, e a página mostra "Fotos: Pexels" com link para `https://www.pexels.com`.
- CA-08 — Dado o TI-0001 emprestado a Beatriz com devolução em 26/11/2026, quando Enzo abre `/catalog`, então o card do TI-0001 mostra a pill "Emprestado", "Com Beatriz Fontes" e "Volta até 26/11".
- CA-09 — Dado Beatriz com dois empréstimos em aberto e um de Enzo, quando ela abre `/my-loans`, então vê só os dois dela, cada um com nome, patrimônio e data de devolução, e o header mostra "Você está com 2 de `<limite>` itens".
- CA-10 — Quando `loan.create` cria um empréstimo, então a tabela de auditoria ganha uma linha com o id de Beatriz como ator, a área `default`, a ação de criar empréstimo e o id do empréstimo; e quando o pedido é recusado (CA-02 a CA-06), nenhum empréstimo e nenhuma linha de auditoria são gravados. A tabela recusa `UPDATE` e `DELETE` do papel com que a aplicação conecta.
- CA-11 — Sem sessão, `/catalog`, `/catalog/[equipmentId]` e `/my-loans` levam a `/login`, e `loan.create`, `loan.listMine`, `equipment.list` e `equipment.byId` respondem `UNAUTHORIZED`. Na alternativa A ou C, `/` redireciona para `/catalog`.
- CA-12 — `loan.create` recusa, na validação do Zod, um input com `tenantId`, `userId` ou `dueOn`, e um `equipmentId` que não seja UUID.
- CA-13 — **Isolamento:** dado as áreas A e B, cada uma com um equipamento `available` e um empréstimo em aberto, e Beatriz com vínculo só em A: `equipment.list` e `equipment.byId` não devolvem o equipamento de B; `loan.listMine` não devolve empréstimo de B; `loan.create` com o id do equipamento de B falha com `NOT_FOUND` e não cria empréstimo nem auditoria; o contador e o limite de Beatriz não contam empréstimo de B; e o detalhe de um item de A não mostra o nome de quem pegou um item de B. Os papéis `anon` e `authenticated` não leem nenhuma linha de `loans` nem da tabela de auditoria.

## Fora de escopo / não decidido

- Fora de escopo, pelo briefing ("Fora de escopo") ou pelo PRD:
  - devolução e a seção "Já devolvidos" de Meus empréstimos (spec de devolução; respostas 3 e 8);
  - tela de Operações (spec própria; respostas 11 e 13);
  - reserva com data futura, notificação por e-mail e renovação;
  - cancelar um empréstimo confirmado (pergunta 20, aberta, que é da spec de devolução).
- Fora de escopo, por proposta do agente, a confirmar com o fatiamento (item 1): o histórico do detalhe (resposta 8), a busca do catálogo (resposta 11b; pergunta 11c) e os chips de categoria e o "Mostrar só o que está livre". Entram na spec seguinte do catálogo.
- Fora desta spec, da 003: quais equipamentos ficam em manutenção. A lista da Entrega 2 põe TI-0004, TI-0007 e TI-0010 em `manutencao`, e o briefing de dados iniciais, item 3, só TI-0004 e TI-0007. A spec 003 decide; esta só a cita.
- Não decidido. Enquanto houver item aqui, o status não passa de rascunho:
  1. Fatiamento: alternativa A, B ou C da seção "Fatiamento proposto". Quem decide: a pessoa.
  2. Limite de itens: pergunta 40. O briefing, item 4, diz 5; o PRD, linha 27, diz 3. Quem decide: a pessoa.
  3. Prazo: pergunta 41. O briefing, item 3, diz 14 dias úteis; o PRD, linha 28, diz 14 dias, e a resposta 4, 14 dias corridos a partir da confirmação. Quem decide: a pessoa.
  4. Quando o empréstimo entra em atraso: pergunta 42. Quem decide: a pessoa.
  5. Local de retirada dos 12 equipamentos, que o card e o aviso de resultado mostram: pergunta 44, ligada à 19. Quem decide: a pessoa, junto com a spec 003.
  6. Foto no lugar do ícone da categoria, no card e no detalhe: pergunta 46. Quem decide: a pessoa.
  7. Quem pode solicitar: pergunta 43. Quem decide: a pessoa.
  8. Como a pessoa testa em produção sem devolução e sem gastar o estoque que o professor usa: pergunta 45. Quem decide: a pessoa.
  9. Lacuna técnica do RN-07: como garantir um empréstimo só por equipamento, e o limite sob pedidos simultâneos da mesma pessoa (CA-05 e CA-06). Alternativas, todas dentro do ADR-001 (Prisma e Postgres, sem biblioteca nova):

     | Alternativa | Como | Custo |
     |---|---|---|
     | a | Na transação, `UPDATE equipment SET status = 'loaned' WHERE id = $1 AND tenant_id = $2 AND status = 'available'`; zero linhas atualizadas vira `EQUIPMENT_UNAVAILABLE`. Para o limite, `SELECT ... FOR UPDATE` no vínculo da pessoa antes de contar | Duas travas curtas por pedido; o `FOR UPDATE` sai em `$queryRaw`, porque o Prisma não o expõe |
     | b | Índice único parcial em `loans (equipment_id) WHERE returned_at IS NULL`; a violação vira `EQUIPMENT_UNAVAILABLE` | Garante no banco, mas não cobre o limite da pessoa, e o índice parcial exige SQL na migration |
     | c | Transação `Serializable` com nova tentativa em falha de serialização | Cobre os dois casos de uma vez; precisa de laço de nova tentativa e falha mais sob carga |
     | d | `a` mais `b`: a atualização condicional decide, e o índice é a defesa se outro caminho gravar `loans` | Soma os custos de `a` e `b` |

     Recomendação do agente: `d`. Quem decide: a pessoa, inclusive se a escolha vira ADR.
  10. Formato da tabela de auditoria, que o ADR-010, seção 6, deixa para esta spec. Proposta do agente: `audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, created_at)`, com `action = 'loan.create'`, gravada na mesma transação do empréstimo; append-only por `REVOKE UPDATE, DELETE` do papel da aplicação ou por trigger que recusa as duas. A tabela e a garantia append-only exigem revisão humana (`rules/restrictions.md`, Bancos e schema). Alternativa: guardar também um `metadata jsonb` com o patrimônio e a data prevista, que facilita ler a auditoria e duplica dado. Quem decide: a pessoa.
  11. O "sem rodapé" do item 9 do briefing: pergunta 47. O crédito já está decidido (RN-13); a pergunta é só sobre o rodapé do card. Quem decide: a pessoa.
  12. Item fora de uso no catálogo: pergunta 9b, aberta. Os 12 equipamentos não têm nenhum, então a resposta não muda a produção, mas muda o CA-07 e o contador. Quem decide: a pessoa, ou ela tira o caso desta spec.
  13. Vencimento em dia de balcão fechado: pergunta 4b, aberta, que o mapa de `docs/plan-andar-zero.md`, seção 5.4, já põe nesta spec. A resposta da 41 muda a forma dela. Sem resposta, a data prevista sai calculada, sem ajuste, como no `docs/layout.md`. Quem decide: a pessoa.

## Contrato afetado

- Endpoint:
  - `equipment.list` — novo, `tenantProcedure`, `.input(z.void())`. Devolve os equipamentos da área, com id, patrimônio, nome, categoria, situação, URL pública da imagem e, se emprestado, o nome de quem está com ele e a data prevista.
  - `equipment.byId` — novo, `tenantProcedure`. Input `{ equipmentId: uuid }`. Mesmo formato, mais o local de retirada (item 5). Equipamento de outra área é `NOT_FOUND`.
  - `loan.create` — novo, mutação `tenantProcedure`. Input `{ equipmentId: uuid }`, estrito. Devolve o empréstimo com a data prevista, ou falha com um dos códigos do RN-08 ou `NOT_FOUND`.
  - `loan.listMine` — novo, `tenantProcedure`, `.input(z.void())`. Os empréstimos em aberto da pessoa, com a contagem, o limite e se há atraso, que o header e o quadro de regras usam.
- Service: `src/server/services/loan.ts` e `src/server/services/equipment.ts`, novos. A regra do RN-04 ao RN-07 mora no service, nunca no router nem na tela.
- Tela:
  - `/catalog` — deixa de ser provisória: grid de cards e o crédito do Pexels;
  - `/catalog/[equipmentId]` — nova: ficha, card "Solicitar empréstimo" e diálogo de confirmação;
  - `/my-loans` — nova: só "Itens com você", sem "Devolver";
  - header — ganha o contador de itens;
  - `/` — redireciona para `/catalog` (alternativas A e C).
- Tabela:
  - `loans` — nova: `id`, `tenant_id`, `equipment_id`, `user_id` (id do Auth, sem FK, como na spec 001, RN-18), `created_at` (a confirmação), `due_on` (data, `America/Sao_Paulo`), `returned_at` (nulo nesta spec). Com RLS ligada e sem policy para `anon` e `authenticated`, como as tabelas da spec 001.
  - auditoria — nova, no formato do item 10.
  - equipamento — a da spec 003; esta spec só muda a situação de `available` para `loaned`.
- **Não pode mudar:**
  - os procedimentos e as telas da spec 001;
  - o formato do equipamento e o seed da spec 003, inclusive a conta do professor, que chega à correção com zero empréstimos (prática, seção 01);
  - o manifesto e o bucket da spec 002;
  - o agente não escreve no banco nem no Storage do deploy.
