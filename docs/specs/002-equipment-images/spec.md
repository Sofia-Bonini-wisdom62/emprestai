# 002 — Imagens dos equipamentos

Status: rascunho
Atualizada em: 2026-11-11

## Objetivo

O agente prepara, pela skill `imagens-equipamentos`, uma foto do Pexels para cada um dos 12 equipamentos da prática, em 800×600 e com o crédito registrado, e a pessoa as publica no Storage sem que o agente consiga enviá-las ao deploy.

## Vínculo

- PRD: `docs/PRD.md` não trata de foto. A origem é a Entrega 2 da prática, com o contrato da skill e a lista dos 12 equipamentos. A pergunta 12 de `docs/perguntas-prd.md` lista os dados do equipamento sem imagem. Esse conflito é da spec dos dados iniciais, que grava a imagem no equipamento; esta spec só prepara os arquivos.
- Restringe: `docs/adr/001-stack.md`, seção 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/004-environments.md`; `docs/adr/006-dev-auth.md`; `docs/adr/011-equipment-images.md`, ainda Proposto.
- Assume pronto: nada.

## Regras

"Decisão de 2026-11-11" é a resposta da pessoa ("Aprovo todas") à lista do desenho da skill: a estrutura, os nove requisitos com a garantia de cada um e as treze decisões. Inclui também a resposta dela ("Hook no git push") sobre a rota do shell até a produção, dada no mesmo dia, na revisão deste rascunho.

- RN-01 — As imagens vêm só da API do Pexels: a busca em `api.pexels.com` e o arquivo em `images.pexels.com`, com a chave da pessoa. Nenhuma outra origem de imagem. Origem: contrato da Entrega 2, "Fonte".
- RN-02 — Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo chega ao sistema. Tela apagada passa; interface, texto ou logo legível reprova; na dúvida, reprova. Quem garante é a revisão visual, primeiro do agente, foto a foto, e depois da pessoa, na folha de contato. Origem: contrato, "Direito de imagem"; decisão de 2026-11-11.
- RN-03 — Toda imagem é um JPEG de exatamente 800×600, sem orientação EXIF diferente de 1. O tamanho é pedido ao CDN do Pexels (`fit=crop&w=800&h=600`) e conferido no próprio arquivo, sem biblioteca de imagem. Origem: contrato, "Mesmo tamanho"; decisão de 2026-11-11. No teste do CDN de 2026-11-11, três fotos públicas da documentação vieram em 800×600, orientação 1 e bytes iguais em dois downloads.
- RN-04 — A mesma foto do Pexels, pelo id ou pelo SHA-256, não aparece em dois equipamentos. Origem: contrato, "Sem repetição".
- RN-05 — O manifesto registra, por equipamento:
  - patrimônio e id do Pexels;
  - página da foto, fotógrafo e página do fotógrafo;
  - a licença "Pexels License", com `https://www.pexels.com/license/`;
  - a URL de origem do arquivo, o SHA-256 e a data do download;
  - o veredito da revisão visual, com o motivo.

  As fotos reprovadas também ficam registradas. Origem: contrato, "Créditos"; prática, `ENTREGA.md`, seção 4.
- RN-06 — O objeto se chama `<patrimonio>-<idPexels>.jpg`, no bucket público `equipment-images`. Repetir o processo não cria objeto novo, e trocar uma foto lista o objeto antigo que a pessoa apaga. Origem: contrato, "Armazenamento"; decisão de 2026-11-11.
- RN-07 — O agente prepara as imagens e o manifesto, mas não envia nada ao Supabase do deploy.
  - O `.claude/settings.json` nega ao agente os servidores MCP do Supabase, da Vercel, do Composio e do v0, inteiros.
  - Ele também nega as ferramentas de arquivo (`Edit`, e por ela `Write`, e os comandos de arquivo que o Claude Code reconhece no shell) em `.github/workflows/**`, em `.claude/hooks/**` e no próprio `.claude/settings.json`.
  - Um hook PreToolUse do Bash e do PowerShell nega `git push` e `gh pr create` quando os commits a enviar tocam `.github/workflows/`, `.claude/hooks/` ou `.claude/settings.json`. O deny não alcança um script em Node nem o git, e o hook fecha o passo que dispararia o CI. Sobra um script que faça o push sozinho, risco que fica registrado no ADR-011.
  - Como segunda camada, a pessoa desliga esses conectores no claude.ai, ou os deixa só de leitura.
  - A pessoa cria o bucket e envia os arquivos pelo painel.

  Origem: contrato, "Produção"; prática, seção 01; decisão de 2026-11-11; documentação de permissões do Claude Code, lida em 2026-11-11.
- RN-08 — A `PEXELS_API_KEY` vive só no `.env.local`. Só o módulo de entrada da skill a lê, sem carregar o resto do arquivo, e nenhuma mensagem a mostra. A skill não acrescenta dependência. Origem: contrato, "Segredos e dependências"; `rules/secrets.md`; decisão de 2026-11-11.
- RN-09 — A skill só roda quando a pessoa a invoca, e para antes de liberar a lista de envio até a pessoa aprovar a folha de contato. Origem: decisão de 2026-11-11 (estrutura do `SKILL.md` e requisito "Direito de imagem").
- RN-10 — A lista dos 12 equipamentos fica em `prisma/data/equipment.json`, igual à da prática, e o manifesto aprovado em `prisma/data/equipment-images.json`, ao lado do seed, que lê os dois. Origem: decisão de 2026-11-11.
- RN-11 — O nome do fotógrafo entra no manifesto como crédito público. Fixtures e testes usam nomes fictícios. Origem: `rules/restrictions.md`, Dados e segredos; decisão de 2026-11-11.

## Critérios de aceitação

Só o que o `pnpm test` prova, sem rede e sem a chave. Ficam fora dele, e por isso sem CA:
- a revisão visual do RN-02;
- a aprovação da folha de contato do RN-09;
- os passos manuais da pessoa (Fora de escopo).

- CA-01 — Com um `fetch` de mentira, uma chamada a host fora de `api.pexels.com` e `images.pexels.com` falha antes de sair, e a busca manda a chave no cabeçalho `Authorization`, sem `Bearer`.
- CA-02 — Com cabeçalhos JPEG montados em bytes, um 800×600 baseline e um 800×600 progressivo passam. Um 800×601, um PNG, um arquivo truncado e um JPEG com orientação EXIF 6 são recusados.
- CA-03 — Dado um manifesto completo, a conferência passa. Ela reprova, um caso de cada vez:
  - campo de crédito faltando;
  - id do Pexels repetido;
  - SHA-256 repetido;
  - nome de objeto fora do padrão do RN-06;
  - patrimônio sem foto aprovada ou com duas;
  - foto sem veredito.
- CA-04 — Dado um manifesto aprovado com 3 patrimônios e uma resposta de busca fictícia, a busca só procura os outros 9 e deixa de fora os ids já usados.
- CA-05 — A conferência dos arquivos locais recusa, um caso de cada vez, o arquivo de um patrimônio aprovado que tenha 800×601, que tenha orientação EXIF 6, ou cujo SHA-256 difira do arquivo baixado de novo da URL gravada no manifesto (com `fetch` de mentira). O arquivo recusado não entra na lista de envio.
- CA-06 — O `permissions.deny` do `.claude/settings.json` traz, e o teste falha se faltar qualquer uma:
  - `mcp__3efacae1-0bd5-43e9-b21b-06a0e15499c3__*` (Supabase);
  - `mcp__cd63b4c8-e88c-449d-8d47-120629820758__*` (Vercel);
  - `mcp__7b70377e-6561-44af-b328-9a1533d0144c__*` (Composio);
  - `mcp__e6d3977c-2db1-4b63-97c4-d36718977027__*` (v0);
  - `Edit(/.github/workflows/**)`, `Edit(/.claude/hooks/**)` e `Edit(/.claude/settings.json)`.

  Os ids são os dos conectores na conta da pessoa, vistos em 2026-11-11.
- CA-07 — Com uma chave fictícia, as mensagens de erro de 401, de 429 e de falha de rede não trazem a chave. Fora do módulo de entrada, nenhum arquivo da skill lê `process.env` nem o `.env.local`.
- CA-08 — `prisma/data/equipment.json` tem os 12 equipamentos da prática, com os patrimônios de TI-0001 a TI-0012 únicos. `prisma/data/equipment-images.json`, o manifesto aprovado, passa na conferência do CA-03 com os 12 patrimônios.
- CA-09 — Dado um manifesto aprovado com `TI-0001-111.jpg` e um manifesto novo com `TI-0001-222.jpg` para o mesmo patrimônio, a conferência lista `TI-0001-111.jpg` entre os objetos a apagar e `TI-0001-222.jpg` entre os a enviar. Com os dois manifestos iguais, as duas listas saem vazias.
- CA-10 — Num repositório git de teste, com um commit à frente da `origin/main`, o hook do RN-07 nega `git push` e `gh pr create`, pelo Bash e pelo PowerShell, quando o commit toca `.github/workflows/ci.yml`, `.claude/hooks/x.mjs` ou `.claude/settings.json`. A mensagem pede que a pessoa faça a mudança. Quando o commit só toca `docs/`, o hook deixa passar, e ele também deixa passar comandos que não são push nem abertura de PR.

## Fora de escopo / não decidido

- Fora de escopo:
  - o crédito "Fotos: Pexels", com link para `https://www.pexels.com`, na tela. Ele fica, pela decisão de 2026-11-11, porque as diretrizes da API o exigem (contrato, "Crédito na tela"), mesmo contra o item 9 do briefing da Entrega 4, que pede o catálogo "sem rodapé nem texto de crédito". A implementação e o CA são da spec do catálogo, que herda essa decisão;
  - gravar a imagem e os créditos no equipamento, que é da spec dos dados iniciais;
  - os passos manuais da pessoa, com o roteiro em `references/manual-upload.md` e o registro no `ENTREGA.md`:
    - desligar no claude.ai os conectores do Supabase, da Vercel, do Composio e do v0, ou deixá-los só de leitura;
    - criar o bucket;
    - enviar os arquivos;
    - abrir as 12 URLs públicas numa janela anônima;
    - conferir a contagem de objetos no painel, antes e depois de repetir o envio;
  - Storage no dev, que o `compose.yaml` não sobe (ADR-004, ADR-006);
  - imagens que não são de equipamento: landing, logo e ilustrações.
- Não decidido: nada. A rota do shell até a produção foi decidida pela pessoa em 2026-11-11, pelo hook do RN-07.

## Contrato afetado

- Skill: `.claude/skills/imagens-equipamentos/`, nova, com `SKILL.md`, `references/` e `scripts/`.
- Dados:
  - `prisma/data/equipment.json`, novo;
  - `prisma/data/equipment-images.json`, novo quando a pessoa aprovar as fotos.
- Storage: bucket público `equipment-images`, criado pela pessoa no painel do projeto de produção.
- Configuração:
  - `.claude/settings.json` ganha o `permissions.deny` e o hook PreToolUse do Bash e do PowerShell;
  - `.claude/hooks/` ganha o script do hook do RN-07;
  - `.gitignore` ganha `.skill-output/`;
  - `tsconfig.json` passa a incluir `.claude/skills/**/*.ts`;
  - `eslint.config.mjs` ganha um bloco para a skill;
  - `.env.example` ganha `PEXELS_API_KEY=`.
- Rules:
  - `rules/secrets.md` ganha a exceção da chave;
  - `rules/restrictions.md` (Escopo) e `rules/operacao.md` passam a dizer que `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` são editados pela pessoa, à mão, a partir do texto que o agente prepara;
  - o `vercel.json` continua "pedir antes".
- **Não pode mudar:**
  - `package.json` e o lockfile, porque não entra dependência nova;
  - o agente não escreve no banco nem no Storage do deploy.
