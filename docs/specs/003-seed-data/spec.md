# 003 — Dados iniciais

Status: rascunho
Atualizada em: 2026-11-12

## Objetivo

O banco de dev e o de produção passam a ter os 12 equipamentos da prática, cada um com a sua foto e a sua situação, e a conta do professor entra no link de produção com zero empréstimos, sem que senha, chave ou dado real entre no git e sem que o agente escreva na produção.

## Vínculo

- PRD: `docs/PRD.md` não pede dados iniciais. Eles servem ao item 2 de "O que precisa existir na primeira versão" (catálogo com a situação de cada item) e à regra "Equipamento em manutenção não aparece como disponível". A origem é a Entrega 3 da prática (seção 04 do enunciado: briefing de dados iniciais e "Ao final, em produção"), com as regras da seção 01 e a lista dos 12 equipamentos da seção 03.
- Restringe: `docs/adr/001-stack.md`, seções 2.5 e 2.7, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/004-environments.md`; `docs/adr/005-first-tenant-name.md`; `docs/adr/009-production-first-admin.md`; `docs/adr/011-equipment-images.md`, ainda Proposto.
- Assume pronto: 001-login (`tenants`, `memberships`, `profiles`, o seed do dev e o passo do ADR-009); 002-equipment-images (`prisma/data/equipment.json` e o manifesto aprovado `prisma/data/equipment-images.json`, RN-10 da 002).

## Regras

Só o que já está decidido em PRD, ADR, `docs/perguntas-prd.md`, spec anterior ou no enunciado. Os conflitos do briefing com essas fontes estão em Não decidido, nas perguntas 33 a 39.

- RN-01 — Os equipamentos são os de `prisma/data/equipment.json`, a lista da seção 03 do enunciado: patrimônio, nome, categoria e situação. Origem: briefing, itens 1 e 2; spec 002, RN-10.
- RN-02 — Um registro por unidade física, identificada pelo patrimônio, que é único na área. Origem: resposta 1.
- RN-03 — As situações da lista viram as chaves do glossário: `disponivel` é `available`, `manutencao` é `maintenance`. Origem: `AGENTS.md`, seção 7.
- RN-04 — Todo equipamento pertence à área `default`, a única da v1, e a tabela tem `tenant_id`, RLS e policy explícita na mesma migration. Origem: ADR-005; resposta 29; ADR-001, seção 2.7; `rules/migration.md`.
- RN-05 — A imagem de cada equipamento é a do manifesto aprovado. O equipamento guarda o nome do objeto, `<patrimonio>-<idPexels>.jpg`, do bucket público `equipment-images`. Patrimônio sem foto aprovada no manifesto interrompe o carregamento antes de gravar qualquer coisa. Origem: briefing, item 4; spec 002, RN-06 e RN-10.
- RN-06 — Carregar os dados não cria empréstimo. Origem: briefing, item 3.
- RN-07 — Carregar os dados de novo não duplica nada: a chave é a área com o patrimônio. Origem: briefing, item 6.
- RN-08 — O agente não escreve no banco nem no Storage da produção. O que grava lá é executado pela pessoa ou pelo GitHub Actions. Origem: enunciado, seção 01; `rules/restrictions.md`, Bancos e schema e Produção.
- RN-09 — Nenhuma senha, token ou chave entra em código, em arquivo de dados ou no histórico do git. Origem: enunciado, seção 01; `rules/restrictions.md`, Dados e segredos.
- RN-10 — No dev, `pnpm prisma db seed` grava os 12 equipamentos na `default`, além do que já grava (spec 001, CA-13), e continua recusando banco ou Auth fora da máquina. Origem: spec 001; spec 002, RN-10; ADR-004.
- RN-11 — A conta do professor entra como Colaborador: no primeiro login vira `member` na `default`, e, como nasce sem nome, passa por `/account/setup` antes do catálogo. Origem: resposta 23; spec 001, RN-13 e CA-06.
- RN-12 — A conta do professor chega à correção com zero empréstimos: nenhum passo desta spec grava nada nela além do que o próprio login grava, e os testes da pessoa usam outra conta. Origem: enunciado, seção 01; briefing, item 5.

## Critérios de aceitação

Só o que o `pnpm test` prova, no Testcontainers. A conferência em produção é da pessoa e está em Fora de escopo.

As contagens por situação dependem da pergunta 33 e entram aqui quando ela for respondida.

- CA-01 — Num banco vazio com a área `default`, o carregamento grava 12 equipamentos na `default`, com os patrimônios de TI-0001 a TI-0012, e o nome, a categoria e a situação de cada um iguais aos de `prisma/data/equipment.json`.
- CA-02 — Rodar o carregamento duas vezes deixa os mesmos 12 registros, com os mesmos ids e os mesmos valores.
- CA-03 — Dado o TI-0001 gravado com situação `loaned`, rodar o carregamento de novo não muda a situação dele. Depende da pergunta 34.
- CA-04 — Cada equipamento gravado guarda o nome do objeto que o manifesto aprovado dá ao seu patrimônio, no padrão `<patrimonio>-<idPexels>.jpg`.
- CA-05 — O carregamento falha sem gravar nada, um caso de cada vez, quando:
  - um patrimônio aparece duas vezes em `prisma/data/equipment.json`;
  - um patrimônio não tem foto aprovada no manifesto;
  - a situação de um item não é `disponivel` nem `manutencao`.
- CA-06 — O carregamento só grava nas tabelas desta spec: nenhuma linha nova em `memberships`, `profiles` ou `auth.users`.
- CA-07 — Num banco vazio com o Auth de pé, `pnpm prisma db seed` duas vezes deixa os 12 equipamentos do CA-01 e o que o CA-13 da spec 001 já pede, sem duplicar nada.
- CA-08 — Em `prisma/` e `prisma/data/`, nenhum arquivo traz endereço de e-mail fora do domínio `example.com`, e a única senha que o seed usa vem de `SEED_PASSWORD`.
- CA-09 — **Isolamento:** dado as áreas A e B, o carregamento grava só na `default`. Os papéis `anon` e `authenticated` não leem nenhuma linha das tabelas desta spec, e um equipamento de B com o mesmo patrimônio de um de A não colide com ele.

## Fora de escopo / não decidido

- Fora de escopo:
  - a tela de catálogo, o cadastro de equipamento pela interface e a importação da planilha (briefing, "Fora de escopo"; PRD, "O que NÃO entra nesta versão");
  - solicitar empréstimo, que é a Entrega 4 e outra spec;
  - preparar, aprovar e enviar as fotos, que é da spec 002, e o crédito "Fotos: Pexels" na tela, que é da spec do catálogo;
  - número de série, local de retirada e observações, se a pergunta 38 for respondida como o agente propõe;
  - a conferência em produção, feita pela pessoa com uma conta dela, deixando a do professor intacta, e registrada no `ENTREGA.md`:
    - a conta do professor entra no link da Vercel com a senha padrão da turma;
    - os 12 equipamentos existem no banco do deploy, cada um com a sua imagem e a situação decidida na pergunta 33;
    - as imagens abrem pela URL pública, sem login, todas em 800×600;
    - repetir o processo não duplicou nada;
    - a conta do professor tem zero empréstimos.
- Não decidido, em `docs/perguntas-prd.md`, todas com a pessoa:
  - pergunta 33: quais equipamentos ficam em manutenção, o TI-0010 incluído ou não;
  - pergunta 34: como os 12 equipamentos chegam ao banco de produção, e o que o carregamento faz com um equipamento que já existe;
  - pergunta 35: como nasce a conta do professor em produção, e onde fica a senha;
  - pergunta 36: o e-mail do professor no git;
  - pergunta 37: o `sharp` que o briefing pede;
  - pergunta 38: quais campos o equipamento tem nesta spec, os créditos da foto incluídos;
  - pergunta 39: quais categorias nascem e com que nome.
- Dependências que não são perguntas:
  - o ADR-011, do bucket e do envio pela pessoa, ainda está Proposto;
  - a resposta 34, se for um passo do workflow, pede um ADR novo, porque o ADR-009 limita o passo à área `default` e ao primeiro administrador ("Nenhum outro dado"). O agente rascunha o ADR depois da resposta;
  - de onde a tela monta a URL pública da imagem, já que o dev não tem Storage (ADR-004, ADR-006), fica para o plano.

## Contrato afetado

Provisório: depende das perguntas 34, 38 e 39.

- Tabela: `equipments (id, tenant_id, asset_tag, name, category_id, status, image_object, created_at)`, nova, única por `(tenant_id, asset_tag)`; `status` no enum `EquipmentStatus`, com `available`, `loaned`, `maintenance` e `out_of_service`. Com RLS e policy explícita na mesma migration.
- Tabela: `equipment_categories (id, tenant_id, name)`, nova, única por `(tenant_id, name)`, porque a categoria não é lista fixa (resposta 12c).
- Seed: `prisma/seed.ts` passa a carregar os equipamentos no dev, lendo `prisma/data/equipment.json` e `prisma/data/equipment-images.json`.
- Produção: o caminho que a pergunta 34 escolher.
- Glossário: o `AGENTS.md`, seção 7, ganha patrimônio como `asset_tag` e categoria como `category`.
- **Não pode mudar:**
  - o seed continua recusando banco e Auth fora da máquina, e continua sem rodar em produção;
  - o passo do ADR-009, a área `default` e a conta de Flávia Rocha do seed;
  - `prisma/data/equipment.json` continua igual à lista da prática (spec 002, CA-08);
  - `package.json` e o lockfile, se a pergunta 37 for respondida como o agente propõe.
