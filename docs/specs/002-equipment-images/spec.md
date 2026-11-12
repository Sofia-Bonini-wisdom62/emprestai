# 002 — Imagens dos equipamentos

Status: aprovada
Atualizada em: 2026-11-12

## Objetivo

O agente prepara, pela skill `imagens-equipamentos`, uma foto do Pexels para cada um dos 12 equipamentos da prática, em 800×600 e com o crédito registrado, e a pessoa as publica no Storage sem que o agente consiga enviá-las ao deploy.

## Vínculo

- PRD: `docs/PRD.md` não trata de foto. A origem é a Entrega 2 da prática, com o contrato da skill e a lista dos 12 equipamentos. A pergunta 12 de `docs/perguntas-prd.md` lista os dados do equipamento sem imagem. Esse conflito é da spec dos dados iniciais, que grava a imagem no equipamento; esta spec só prepara os arquivos.
- Restringe: `docs/adr/001-stack.md`, seção 2.10, com as correções do `docs/adr/003-stack-corrections.md`; `docs/adr/004-environments.md`; `docs/adr/006-dev-auth.md`; `docs/adr/011-equipment-images.md`, ainda Proposto.
- Assume pronto: nada.

## Regras

"Decisão de 2026-11-11" é a resposta da pessoa ("Aprovo todas") à lista do desenho da skill: a estrutura, os nove requisitos com a garantia de cada um e as treze decisões. Inclui também a resposta dela ("Hook no git push") sobre a rota do shell até a produção, dada no mesmo dia, na revisão deste rascunho.

"Decisão de 2026-11-12" é a resposta da pessoa ("Aceito todas") à recomendação de registrar aqui as quatro recusas que a revisão da T-02 acrescentou ao leitor de JPEG (RN-12 a RN-15). As RN-12 a RN-14 fecham arquivos montados que passariam pelo RN-03 e que o navegador mostraria com outro tamanho ou girados, ou nem abriria. A RN-15 pega o arquivo cortado ou com bytes a mais. No mesmo dia, a pessoa deu a mesma resposta ("Aceito todas") às seis recomendações da revisão da T-03:
- a leitura do RN-04 só com fotos aprovadas;
- o RN-16;
- o RN-17;
- os CA-11 e CA-12, que põem os testes das RN-12 a RN-17 no padrão de nomes de `rules/tests.md`;
- os detalhes da linha de comando no plano;
- o termo `assetTag` no glossário do `AGENTS.md`.

- RN-01 — As imagens vêm só da API do Pexels: a busca em `api.pexels.com` e o arquivo em `images.pexels.com`, com a chave da pessoa. Nenhuma outra origem de imagem. Origem: contrato da Entrega 2, "Fonte".
- RN-02 — Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo chega ao sistema. Tela apagada passa; interface, texto ou logo legível reprova; na dúvida, reprova. Quem garante é a revisão visual, primeiro do agente, foto a foto, e depois da pessoa, na folha de contato. Origem: contrato, "Direito de imagem"; decisão de 2026-11-11.
- RN-03 — Toda imagem é um JPEG de exatamente 800×600, sem orientação EXIF diferente de 1. O tamanho é pedido ao CDN do Pexels (`fit=crop&w=800&h=600`) e conferido no próprio arquivo, sem biblioteca de imagem. Origem: contrato, "Mesmo tamanho"; decisão de 2026-11-11. No teste do CDN de 2026-11-11, três fotos públicas da documentação vieram em 800×600, orientação 1 e bytes iguais em dois downloads.
- RN-04 — A mesma foto do Pexels, pelo id ou pelo SHA-256, não aparece em dois equipamentos. Contam só as fotos aprovadas, que são as que chegam ao bucket: uma foto reprovada não aparece em equipamento. A mesma foto aprovada duas vezes no mesmo patrimônio cai na regra de uma foto aprovada por patrimônio (CA-03). Os ids já usados do CA-04 são os das fotos aprovadas. Origem: contrato, "Sem repetição"; decisão de 2026-11-12.
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
- RN-12 — Antes dos dados da imagem (SOS), o JPEG é uma sequência de marcadores, cada um com um segmento de tamanho válido. Bytes 0xFF de preenchimento antes de um marcador não atrapalham. Só entram DQT, DHT, DRI, COM, APP0 a APP15 e um só SOF, que vem antes do SOS e é SOF0, SOF1 ou SOF2. São recusados:
  - qualquer outro marcador, inclusive o FF00, o JPG0 logo depois do APP15, o DHP do JPEG hierárquico e os SOF sem perda e aritméticos;
  - um byte que não é marcador onde um marcador deveria vir;
  - um segmento com tamanho menor que 2;
  - um segundo SOF, o SOS antes do SOF e o fim da imagem antes do SOS.

  Origem: decisão de 2026-11-12. Prova: CA-11.
- RN-13 — O SOF é de 8 bits, declara ao menos um componente e traz exatamente 3 bytes por componente declarado. Origem: decisão de 2026-11-12; o navegador não abre JPEG de 12 bits. Prova: CA-11.
- RN-14 — A orientação só vale de um EXIF sem ambiguidade. São recusados:
  - um segundo APP1 com EXIF;
  - a orientação repetida na IFD0, ou de tipo diferente de SHORT;
  - o EXIF malformado: sem o byte 0 depois de `Exif\0`, com o TIFF de menos de 8 bytes, com a ordem de bytes que não é II nem MM, sem a marca 42, com a IFD0 fora do segmento ou truncada. A IFD0 truncada é a que não cabe no segmento com a contagem, os 12 bytes de cada entrada e o ponteiro de 4 bytes da próxima IFD, como define o TIFF 6.0.

  Origem: decisão de 2026-11-12; os decodificadores leem o primeiro EXIF. Prova: CA-11.
- RN-15 — Os dois últimos bytes do JPEG são o fim da imagem (EOI, FF D9). O leitor não percorre os dados da imagem. Por isso é essa conferência que recusa, com o mesmo motivo, o arquivo cortado nos dados e o arquivo com bytes a mais depois do fim. Ela não pega um arquivo que termine em outro FF D9, como dois JPEG colados; quem garante que o arquivo é o do CDN é a conferência de origem do CA-05. Origem: decisão de 2026-11-12. Prova: CA-11.
- RN-16 — O manifesto novo não deixa de fora um patrimônio que tem foto aprovada no manifesto aprovado; a conferência reprova o manifesto novo que o deixe. Assim, a lista a apagar do RN-06 só sai de troca de foto, e uma rodada parcial não manda apagar foto ainda em uso. Origem: decisão de 2026-11-12. Prova: CA-12.
- RN-17 — O manifesto é um JSON em UTF-8, com ou sem BOM, com a lista `photos` e um objeto por foto. Em cada foto:
  - as URLs (página da foto, página do fotógrafo e origem do arquivo) são completas e em `https`, porque o crédito vira link na tela;
  - o id do Pexels é um inteiro positivo;
  - o SHA-256 tem 64 caracteres hexadecimais minúsculos;
  - a data do download vem como AAAA-MM-DD, com a hora opcional, e é uma data válida;
  - o veredito é `approved` ou `rejected`, sempre com o motivo;
  - o nome do objeto é texto, e a licença é exatamente a do RN-05;
  - um texto só com espaços conta como campo que falta.

  Origem: decisão de 2026-11-12. Prova: CA-12.

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
- CA-11 — Com cabeçalhos JPEG montados em bytes, todos com DQT e DHT, como os de um codificador comum:
  - passam o JPEG com DRI, comentário, XMP, ICC, APP14, APP15 e bytes 0xFF de preenchimento, e o SOF1 de 8 bits (RN-12);
  - são recusados, um caso de cada vez e com o motivo exato, cada marcador, SOF, EXIF e fim de arquivo que as RN-12 a RN-15 recusam.
- CA-12 — Dado o manifesto completo do CA-03, a conferência reprova, um caso de cada vez e com a mensagem exata:
  - cada campo do RN-05 que falta, inclusive numa foto reprovada, e o texto só com espaços;
  - cada formato fora do RN-17;
  - o manifesto novo que deixa de fora um patrimônio com foto aprovada no manifesto aprovado (RN-16).

  Ela passa o manifesto gravado com BOM e a foto reprovada que repete o id de uma aprovada em outro patrimônio (RN-04). Os problemas de campo de uma foto saem de uma vez, e a mesma foto aprovada duas vezes no mesmo patrimônio só conta como duas aprovadas. Sem manifesto aprovado, todas as fotos aprovadas vão para a lista de envio, em ordem alfabética (RN-06). Pela linha de comando, um `--approved` que não existe ou que é uma pasta sai com 2, sem lista.

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
  - `tsconfig.json` passa a incluir `.claude/**/*.ts`, que cobre os scripts da skill e os testes do deny e do hook;
  - `eslint.config.mjs` ganha um bloco para a skill;
  - `.env.example` ganha `PEXELS_API_KEY=`.
- Rules:
  - `rules/secrets.md` ganha a exceção da chave;
  - `rules/restrictions.md` (Escopo) e `rules/operacao.md` passam a dizer que `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` são editados pela pessoa, à mão, a partir do texto que o agente prepara;
  - o `vercel.json` continua "pedir antes".
- **Não pode mudar:**
  - `package.json` e o lockfile, porque não entra dependência nova;
  - o agente não escreve no banco nem no Storage do deploy.
