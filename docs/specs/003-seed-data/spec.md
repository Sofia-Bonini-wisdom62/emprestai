# 003 — Dados iniciais

Status: rascunho
Atualizada em: 2026-11-12

## Objetivo

O banco de dev e o de produção passam a ter os 12 equipamentos da prática, cada um com a sua foto e a sua situação, e a conta do professor entra no link de produção com zero empréstimos, sem que senha, chave ou dado real entre no git e sem que o agente escreva na produção.

## Vínculo

- PRD: `docs/PRD.md` não pede dados iniciais. Eles servem ao item 2 de "O que precisa existir na primeira versão" (catálogo com a situação de cada item) e à regra "Equipamento em manutenção não aparece como disponível". A origem é a Entrega 3 da prática (seção 04 do enunciado: briefing de dados iniciais e "Ao final, em produção"), com as regras da seção 01 e a lista dos 12 equipamentos da seção 03.
- Restringe: `docs/adr/001-stack.md`, seções 2.5 e 2.7, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/004-environments.md`; `docs/adr/005-first-tenant-name.md`; `docs/adr/009-production-first-admin.md`; `docs/adr/011-equipment-images.md`, ainda Proposto; `docs/adr/013-production-equipment-data.md`, Proposto.
- Assume pronto: 001-login (`tenants`, `memberships`, `profiles`, o seed do dev e o passo do ADR-009); 002-equipment-images (`prisma/data/equipment.json` e o manifesto aprovado `prisma/data/equipment-images.json`, RN-10 da 002).

## Regras

"Decisão de 2026-11-12" é a resposta da pessoa ("Aceito todas") às perguntas 33 a 39 de `docs/perguntas-prd.md`, aceitando a proposta do agente em cada uma.

O briefing contrariava o enunciado, as rules ou a spec 002 em quatro pontos. Cada um foi decidido pela pessoa na resposta indicada:
- a senha escrita no arquivo de dados (resposta 35; RN-09);
- o e-mail real do professor no seed (resposta 36; RN-14);
- o `sharp` (resposta 37; RN-15);
- só o TI-0004 e o TI-0007 em manutenção (resposta 33; RN-03).

- RN-01 — Os equipamentos são os de `prisma/data/equipment.json`, a lista da seção 03 do enunciado. Origem: briefing, itens 1 e 2; spec 002, RN-10.
- RN-02 — Um registro por unidade física, identificada pelo patrimônio, que é único na área. Origem: resposta 1.
- RN-03 — A situação é a da lista. TI-0004, TI-0007 e TI-0010 ficam em manutenção, e os outros 9, disponíveis. Na lista, `disponivel` é `available`, e `manutencao` é `maintenance`. Origem: resposta 33; `AGENTS.md`, seção 7.
- RN-04 — O equipamento tem só patrimônio, nome, categoria, situação e imagem. A imagem é o nome do objeto, `<patrimonio>-<idPexels>.jpg`, no bucket público `equipment-images`. Número de série, local de retirada e observações ficam para a spec do cadastro. Os créditos da foto ficam só no manifesto. Origem: resposta 38; spec 002, RN-05 e RN-06.
- RN-05 — Nascem cinco categorias, Notebooks, Monitores, Câmeras, Cabos e Projetores. As chaves da lista se ligam a elas assim: `notebook` a Notebooks, `monitor` a Monitores, `cabo` a Cabos e `camera` a Câmeras. Projetores nasce vazia. Origem: respostas 12, 12c e 39.
- RN-06 — Todo equipamento e toda categoria pertencem à área `default`, a única da v1. As duas tabelas têm `tenant_id`, RLS e policy explícita na mesma migration. Origem: ADR-005; resposta 29; ADR-001, seção 2.7; `rules/migration.md`.
- RN-07 — O carregamento lê os dois arquivos de `prisma/data/` e, para cada patrimônio, cria o equipamento que falta. No que já existe, atualiza só a imagem, e nunca a situação, o nome nem a categoria. Carregar de novo não duplica nada, e a chave é a área com o patrimônio. Origem: briefing, item 6; resposta 34.
- RN-08 — Antes de gravar qualquer coisa, o carregamento recusa o conjunto inteiro se um patrimônio se repetir, se não tiver foto aprovada no manifesto, ou se tiver categoria ou situação fora das chaves dos RN-03 e RN-05. Origem: briefing, item 4; spec 002, RN-10; resposta 37.
- RN-09 — Nenhuma senha, token ou chave entra em código, em arquivo de dados ou no histórico do git. A senha padrão da turma só existe no painel de produção. Origem: enunciado, seção 01; `rules/restrictions.md`, Dados e segredos; resposta 35.
- RN-10 — Carregar os dados não cria empréstimo. Origem: briefing, item 3.
- RN-11 — No dev, `pnpm prisma db seed` faz o carregamento na `default`, além do que já grava (spec 001, CA-13), e continua recusando banco ou Auth fora da máquina. Origem: spec 001; spec 002, RN-10; ADR-004.
- RN-12 — Na produção, o carregamento roda num passo do workflow de produção, depois do `prisma migrate deploy` e ao lado do passo do ADR-009. O agente não escreve no banco nem no Storage da produção: o passo roda no GitHub Actions, e a mudança no workflow é aplicada pela pessoa, à mão. Origem: resposta 34; ADR-013; enunciado, seção 01; `rules/restrictions.md`, Escopo e Produção.
- RN-13 — A conta do professor nasce no painel do Supabase de produção, criada pela pessoa com a senha padrão e o e-mail já confirmado, e não por convite. No primeiro login, vira `member` na `default` e, como nasce sem nome, passa por `/account/setup` antes do catálogo. Origem: resposta 35; resposta 23; spec 001, RN-13 e CA-06.
- RN-14 — O e-mail do professor não entra no git. Spec, testes e `ENTREGA.md` dizem "a conta do professor". Origem: resposta 36; `rules/restrictions.md`, Dados e segredos.
- RN-15 — Sem `sharp` nem outra dependência nova: o tamanho de 800×600 é o que a spec 002 garante (RN-03 da 002). Origem: resposta 37.
- RN-16 — A conta do professor chega à correção com zero empréstimos. Nenhum passo desta spec grava nada nela além do que o próprio login grava, e os testes da pessoa usam outra conta. Origem: enunciado, seção 01; briefing, item 5.

## Critérios de aceitação

Só o que o `pnpm test` prova, no Testcontainers. A conferência em produção é da pessoa e está em Fora de escopo.

- CA-01 — Num banco vazio com a área `default`, o carregamento grava as 5 categorias do RN-05 e 12 equipamentos na `default`, com os patrimônios de TI-0001 a TI-0012. O nome, a categoria e a situação de cada um batem com `prisma/data/equipment.json`: 9 `available`, e TI-0004, TI-0007 e TI-0010 `maintenance`.
- CA-02 — Rodar o carregamento duas vezes deixa as mesmas 5 categorias e os mesmos 12 equipamentos, com os mesmos ids e os mesmos valores.
- CA-03 — Dado o TI-0001 já gravado com situação `loaned` e nome alterado, rodar o carregamento de novo não muda a situação nem o nome dele.
- CA-04 — Cada equipamento gravado guarda o nome do objeto que o manifesto aprovado dá ao seu patrimônio. Dado o TI-0001 gravado com `TI-0001-111.jpg` e um manifesto que lhe dá `TI-0001-222.jpg`, a rodada seguinte o deixa com `TI-0001-222.jpg`.
- CA-05 — O carregamento falha sem gravar nada, um caso de cada vez, quando:
  - um patrimônio aparece duas vezes em `prisma/data/equipment.json`;
  - um patrimônio não tem foto aprovada no manifesto;
  - a categoria de um item não é `notebook`, `monitor`, `cabo` nem `camera`;
  - a situação de um item não é `disponivel` nem `manutencao`.
- CA-06 — O carregamento só grava nas tabelas desta spec: nenhuma linha nova em `tenants`, `memberships`, `profiles` ou `auth.users`.
- CA-07 — Num banco vazio com o Auth de pé, `pnpm prisma db seed` duas vezes deixa o que o CA-01 pede e o que o CA-13 da spec 001 já pede, sem duplicar nada.
- CA-08 — Em `prisma/` e `prisma/data/`, nenhum arquivo traz endereço de e-mail fora do domínio `example.com`, e a única senha que o seed usa vem de `SEED_PASSWORD`.
- CA-09 — O script do passo de produção, rodado contra o banco do Testcontainers, faz o mesmo que o CA-01 e o CA-02, sem ler `.env.local` e sem precisar do Auth.
- CA-10 — **Isolamento:** dado as áreas A e B, o carregamento grava só na `default`. Um equipamento de B com o mesmo patrimônio de um da `default` não colide com ele e não muda. Os papéis `anon` e `authenticated` não leem nenhuma linha de `equipments` nem de `equipment_categories`.

## Fora de escopo / não decidido

- Fora de escopo:
  - a tela de catálogo, o cadastro de equipamento pela interface e a importação da planilha (briefing, "Fora de escopo"; PRD, "O que NÃO entra nesta versão");
  - solicitar empréstimo, que é a Entrega 4 e outra spec;
  - preparar, aprovar e enviar as fotos, que é da spec 002, e o crédito "Fotos: Pexels" na tela, que é da spec do catálogo;
  - número de série, local de retirada e observações (resposta 38);
  - renomear ou excluir categoria (pergunta 12d, aberta);
  - os passos da pessoa, registrados no `ENTREGA.md`:
    - aplicar à mão a mudança do workflow de produção, a partir do texto que o agente prepara;
    - conferir no painel de produção que Add user cria conta com senha e e-mail confirmado, e criar a conta do professor (resposta 35);
  - a conferência em produção, feita pela pessoa com uma conta dela, deixando a do professor intacta:
    - a conta do professor entra no link da Vercel com a senha padrão da turma;
    - os 12 equipamentos existem no banco do deploy, cada um com a sua imagem, e TI-0004, TI-0007 e TI-0010 em manutenção;
    - as imagens abrem pela URL pública, sem login, todas em 800×600;
    - repetir o deploy não duplicou nada;
    - a conta do professor tem zero empréstimos.
- Não decidido: nada em `docs/perguntas-prd.md`. A spec ainda depende de duas coisas:
  - o ADR-013, que amplia o escopo do passo do ADR-009, está Proposto e espera a pessoa;
  - o ADR-011, do bucket e do envio pela pessoa, também está Proposto.
- Fica para o plano: de onde a tela monta a URL pública da imagem, já que o dev não tem Storage (ADR-004, ADR-006).

## Contrato afetado

- Tabela: `equipment_categories (id, tenant_id, name)`, nova, única por `(tenant_id, name)`, com RLS e policy explícita.
- Tabela: `equipments (id, tenant_id, asset_tag, name, category_id, status, image_object, created_at)`, nova, única por `(tenant_id, asset_tag)`, com RLS e policy explícita. `status` está no enum `EquipmentStatus`, com `available`, `loaned`, `maintenance` e `out_of_service`, as quatro do glossário.
- Seed: `prisma/seed.ts` passa a fazer o carregamento no dev.
- Script: um script versionado em `prisma/`, com o Prisma Client, que o seed e o passo de produção usam. O nome fica com a tarefa que implementa, como no ADR-009.
- Workflow: `.github/workflows/production.yml` ganha o passo do RN-12. A mudança é aplicada pela pessoa, à mão.
- Glossário: o `AGENTS.md`, seção 7, ganha patrimônio como `asset_tag` e categoria como `category`.
- **Não pode mudar:**
  - o seed continua recusando banco e Auth fora da máquina e continua sem rodar em produção;
  - o passo do ADR-009, a área `default` e a conta de Flávia Rocha do seed;
  - `prisma/data/equipment.json` continua igual à lista da prática (spec 002, CA-08);
  - `package.json` e o lockfile.
