# 002 — Imagens dos equipamentos

Status: aprovada
Atualizada em: 2026-11-13

## Objetivo

O agente prepara, pela skill `imagens-equipamentos`, uma foto do Pixabay para cada um dos 12 equipamentos da prática, recortada em 800×600 e com o crédito registrado, e a pessoa as publica no Storage sem que o agente consiga enviá-las ao deploy.

## Vínculo

- PRD: `docs/PRD.md` não trata de foto. A origem é a Entrega 2 da prática, com o contrato da skill e a lista dos 12 equipamentos. O contrato pede o Pexels, e a troca de 2026-11-13 o contraria; o conflito fica no `ENTREGA.md`, decidido pela pessoa. A pergunta 12 de `docs/perguntas-prd.md` lista os dados do equipamento sem imagem. Esse conflito é da spec 003, a dos dados iniciais, que grava a imagem no equipamento; esta spec só prepara os arquivos.
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

"Decisão de 2026-11-13" é a resposta da pessoa ("Aceito todas") às quatro recomendações da revisão da T-04: as regras de rede além do host (RN-18), a mensagem do 429 com os limites do Pexels, que a troca de 2026-11-13 passa para os do Pixabay, a chave só em ASCII visível (RN-19) e o CA-13, que põe os testes desses detalhes no padrão de nomes de `rules/tests.md`. Apertar o bloco da skill no `eslint.config.mjs` ficou para depois.

"Troca de 2026-11-13" é a resposta da pessoa ("Confirmo a troca") à pergunta "Confirma a troca para o Pixabay, com o sharp para o 800×600?". A troca põe o Pixabay no lugar do Pexels, porque a emissão de chaves do Pexels está pausada e a conta dela não tem chave. A mensagem que ela confirmou dizia que:
- ela precisaria criar a conta e a chave do Pixabay;
- o Pixabay não corta pela URL, e o 800×600 passa a ser feito pelo `sharp`, dependência nova;
- o crédito na tela passa a ser "Fotos: Pixabay", com link;
- a licença do Pixabay não obriga a citar o autor, mas os créditos de cada foto continuam no manifesto;
- as respostas da busca ficam guardadas por 24 h, como o Pixabay exige;
- as fotos são baixadas e guardadas no bucket, porque o Pixabay proíbe usar o link deles de forma permanente;
- a troca contraria o contrato da prática e vai para o `ENTREGA.md`.

O que a troca não detalha é recomendação do PR de documento da troca e vale com a aprovação dele:
- os hosts e os parâmetros da busca (RN-01);
- o recorte (RN-03);
- os campos do manifesto (RN-05);
- o `devDependencies` e a versão exata do `sharp` (RN-08);
- o conteúdo da folha de contato (RN-09);
- as regras de rede e da chave (RN-18 e RN-19);
- a conferência de origem (RN-20);
- os casos novos dos CA-01, CA-05, CA-07 e CA-13, e o CA-14.

"Escolhas do #56" é a resposta da pessoa ("Aceito todas", em 2026-11-13) às cinco escolhas desse PR, como o agente as recomendou:
- o `sharp` 0.35.5 em `devDependencies` (RN-08);
- a qualidade 80 do JPEG gerado (RN-03);
- a conferência de origem (RN-20);
- renomear o `scripts/lib/pexels.ts` para `scripts/lib/pixabay.ts` na T-04;
- conferir o host do `largeImageURL` na T-07, na primeira busca real. Até lá, a lista de hosts aceita o que a documentação mostra (RN-01).

O resto da lista acima vale com a aprovação do PR.

O que a documentação do Pixabay diz está no ADR-011, seção 1.2.

- RN-01 — As imagens vêm só da API do Pixabay, com a chave da pessoa: a busca em `https://pixabay.com/api/` e o arquivo do `largeImageURL` de um resultado dela, em `pixabay.com` ou `cdn.pixabay.com`. Nenhuma outra origem de imagem. A busca pede só fotos (`image_type=photo`) na horizontal (`orientation=horizontal`). De cada resultado, ela guarda o id, a página da foto (`pageURL`), o autor (`user` e `user_id`), as tags e o `largeImageURL`; as tags servem à escolha e não vão para o manifesto. Origem: troca de 2026-11-13, que substitui o Pexels do contrato da Entrega 2, "Fonte". Os hosts são os dos exemplos da documentação da API, lida em 2026-11-13: a busca e o `largeImageURL` em `pixabay.com`, e o `previewURL` em `cdn.pixabay.com`.
- RN-02 — Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo chega ao sistema. Tela apagada passa; interface, texto ou logo legível reprova; na dúvida, reprova. Quem garante é a revisão visual, primeiro do agente, foto a foto, e depois da pessoa, na folha de contato. Origem: contrato, "Direito de imagem"; decisão de 2026-11-11.
- RN-03 — Toda imagem é um JPEG de exatamente 800×600, sem orientação EXIF diferente de 1.
  - O download baixa o `largeImageURL`, que tem até 1280 px no lado maior.
  - O `sharp` gera o arquivo: aplica a orientação EXIF, reduz e recorta pelo centro até 800×600, sem ampliar, e grava um JPEG baseline com qualidade 80 (escolhas do #56), sem metadados.
  - A origem com menos de 800 px de largura ou de 600 px de altura, medida depois de aplicar a orientação EXIF, é recusada, sem arquivo gravado e sem entrada no manifesto da rodada.
  - Os mesmos bytes de origem, com a mesma versão do `sharp` e na mesma máquina, dão o mesmo arquivo. É isso que deixa a conferência de origem recortar de novo e comparar (RN-20).
  - O arquivo gerado é conferido pelo leitor de JPEG das RN-12 a RN-15, que não usa biblioteca de imagem: quem gera não é quem confere.

  Origem: contrato, "Mesmo tamanho"; troca de 2026-11-13. No teste de 2026-11-13, com o `sharp` 0.35.5 do lockfile, uma origem fictícia de 1280×853 com orientação 6 saiu em 800×600, sem EXIF, aprovada pelo leitor da T-02 e com os mesmos bytes em duas rodadas (ADR-011, seção 1.3).
- RN-04 — A mesma foto do Pixabay, pelo id ou pelo SHA-256, não aparece em dois equipamentos. Contam só as fotos aprovadas, que são as que chegam ao bucket: uma foto reprovada não aparece em equipamento. A mesma foto aprovada duas vezes no mesmo patrimônio cai na regra de uma foto aprovada por patrimônio (CA-03). Os ids já usados do CA-04 são os das fotos aprovadas. Origem: contrato, "Sem repetição"; decisão de 2026-11-12.
- RN-05 — O manifesto registra, por equipamento:
  - patrimônio e id do Pixabay;
  - página da foto (`pageURL`), autor (`user`) e página do autor, `https://pixabay.com/users/<user>-<user_id>/`, como a documentação a monta, com o `user` codificado para URL;
  - a licença "Pixabay Content License", com `https://pixabay.com/service/license-summary/`;
  - a URL de origem do arquivo (o `largeImageURL` baixado), o SHA-256 do arquivo de 800×600 e a data do download;
  - o veredito da revisão visual, com o motivo.

  As fotos reprovadas também ficam registradas. A licença do Pixabay não obriga a citar o autor, e o crédito por foto fica mesmo assim, porque o contrato o pede. Origem: contrato, "Créditos"; prática, `ENTREGA.md`, seção 4; troca de 2026-11-13.
- RN-06 — O objeto se chama `<patrimonio>-<idPixabay>.jpg`, no bucket público `equipment-images`. Repetir o processo não cria objeto novo, e trocar uma foto lista o objeto antigo que a pessoa apaga. Origem: contrato, "Armazenamento"; decisão de 2026-11-11.
- RN-07 — O agente prepara as imagens e o manifesto, mas não envia nada ao Supabase do deploy.
  - O `.claude/settings.json` nega ao agente os servidores MCP do Supabase, da Vercel, do Composio e do v0, inteiros.
  - Ele também nega as ferramentas de arquivo (`Edit`, e por ela `Write`, e os comandos de arquivo que o Claude Code reconhece no shell) em `.github/workflows/**`, em `.claude/hooks/**` e no próprio `.claude/settings.json`.
  - Um hook PreToolUse do Bash e do PowerShell nega `git push` e `gh pr create` quando os commits a enviar tocam `.github/workflows/`, `.claude/hooks/` ou `.claude/settings.json`. O deny não alcança um script em Node nem o git, e o hook fecha o passo que dispararia o CI. Sobra um script que faça o push sozinho, risco que fica registrado no ADR-011.
  - Como segunda camada, a pessoa desliga esses conectores no claude.ai, ou os deixa só de leitura.
  - A pessoa cria o bucket e envia os arquivos pelo painel.

  Origem: contrato, "Produção"; prática, seção 01; decisão de 2026-11-11; documentação de permissões do Claude Code, lida em 2026-11-11.
- RN-08 — A `PIXABAY_API_KEY` vive só no `.env.local`. Só o módulo de entrada da skill a lê, sem carregar o resto do arquivo, e nenhuma mensagem a mostra. A skill acrescenta uma dependência só, o `sharp`, aprovado pela pessoa na troca de 2026-11-13. Ele entra em `devDependencies` e na versão exata 0.35.5, a que já está no lockfile (ADR-011; escolhas do #56). Origem: contrato, "Segredos e dependências"; `rules/secrets.md`; decisão de 2026-11-11; troca de 2026-11-13.
- RN-09 — A skill só roda quando a pessoa a invoca, e para antes de liberar a lista de envio até a pessoa aprovar a folha de contato. A folha só sai de um manifesto que passa na conferência do manifesto (CA-03 e CA-12). O `SKILL.md` só a gera depois de a conferência de origem sair com 0 (RN-20). A folha mostra pelo arquivo local as fotos da rodada:
  - a entrada cujo nome de objeto não está no manifesto aprovado;
  - a foto aprovada da lista de envio do RN-06, a mesma que o RN-20 confere.

  Uma foto da rodada sem arquivo local faz a folha falhar, com o nome do objeto. As demais entradas aparecem só em texto, sem imagem, marcadas como vindas do manifesto aprovado, com o patrimônio, o nome do objeto, o veredito e o motivo de agora, o de antes quando mudou, e o crédito. Cada foto da rodada vem com:
  - o veredito e o motivo;
  - o autor, com link para a página dele;
  - o link da página da foto no Pixabay, porque a API pede mostrar de onde vêm as imagens onde aparecem resultados de busca (ADR-011, seção 2).

  Todo texto entra escapado. Origem: decisão de 2026-11-11 (estrutura do `SKILL.md` e requisito "Direito de imagem"); recomendação do PR de documento da troca de 2026-11-13, para o conteúdo da folha.
- RN-10 — A lista dos 12 equipamentos fica em `prisma/data/equipment.json`, igual à da prática, e o manifesto aprovado em `prisma/data/equipment-images.json`, ao lado do seed, que lê os dois. Origem: decisão de 2026-11-11.
- RN-11 — O nome do autor entra no manifesto como crédito público. Fixtures e testes usam nomes fictícios. Origem: `rules/restrictions.md`, Dados e segredos; decisão de 2026-11-11.
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
- RN-15 — Os dois últimos bytes do JPEG são o fim da imagem (EOI, FF D9). O leitor não percorre os dados da imagem. Por isso é essa conferência que recusa, com o mesmo motivo, o arquivo cortado nos dados e o arquivo com bytes a mais depois do fim. Ela não pega um arquivo que termine em outro FF D9, como dois JPEG colados; quem garante que o arquivo é o recorte da origem é a conferência de origem do CA-05. Origem: decisão de 2026-11-12. Prova: CA-11.
- RN-16 — O manifesto novo não deixa de fora um patrimônio que tem foto aprovada no manifesto aprovado; a conferência reprova o manifesto novo que o deixe. Assim, a lista a apagar do RN-06 só sai de troca de foto, e uma rodada parcial não manda apagar foto ainda em uso. Origem: decisão de 2026-11-12. Prova: CA-12.
- RN-17 — O manifesto é um JSON em UTF-8, com ou sem BOM, com a lista `photos` e um objeto por foto. Em cada foto:
  - as URLs (página da foto, página do autor e origem do arquivo) são completas e em `https`, porque o crédito vira link na folha de contato (RN-09) e a origem é baixada de novo pela conferência (RN-20);
  - o id do Pixabay é um inteiro positivo;
  - o SHA-256 tem 64 caracteres hexadecimais minúsculos;
  - a data do download vem como AAAA-MM-DD, com a hora opcional, e é uma data válida;
  - o veredito é `approved` ou `rejected`, sempre com o motivo;
  - o nome do objeto é texto, e a licença é exatamente a do RN-05;
  - um texto só com espaços conta como campo que falta.

  Origem: decisão de 2026-11-12. Prova: CA-12.
- RN-18 — A rede, além dos hosts do RN-01:
  - só `https`, sem porta e sem usuário ou senha na URL. A URL fora disso é recusada antes de sair, com o motivo;
  - nenhum pedido segue redirecionamento, porque um redirect levaria o pedido para fora da lista de hosts;
  - só a busca leva a chave, no parâmetro `key` da URL, o único jeito que a API documenta. Por isso nenhuma mensagem traz a URL da busca nem o corpo da resposta. O download vai sem a chave, e um erro no download não culpa a chave;
  - o 429 da busca diz que o limite é de 100 pedidos a cada 60 s, por chave, como diz a documentação da API, registrada no ADR-011;
  - a resposta de cada busca fica guardada por 24 h na pasta de trabalho, `.skill-output/imagens-equipamentos/`, como a API exige. A mesma busca, com o mesmo termo e os mesmos parâmetros, lê a resposta guardada dentro desse prazo, sem chamar a API, e depois dele chama de novo. O arquivo guardado traz o termo, os parâmetros sem a chave, a data e a resposta, nunca a chave nem a URL da busca;
  - um download que falha diz que a URL do Pixabay pode ter expirado, porque a documentação não diz quanto vale o `largeImageURL`. Dentro das 24 h, a skill não refaz a busca para renovar a URL: o agente escolhe outro candidato ou, depois do prazo, refaz a busca e o download, como no RN-20;
  - a URL do Pixabay só serve para baixar o arquivo, porque a API proíbe o hotlink permanente. Nenhuma tela usa endereço do Pixabay como imagem: o catálogo usa o bucket (spec 004, RN-24), e a folha de contato, o arquivo local.

  Origem: decisão de 2026-11-13; troca de 2026-11-13. Prova: CA-07, CA-13 e CA-14.
- RN-19 — A `PIXABAY_API_KEY` só tem ASCII visível, de `!` a `~`. Espaço, quebra de linha, aspas curvas ou espaço invisível de uma colagem são recusados com mensagem própria, sem o valor, porque iriam codificados na URL da busca, e o erro sairia como chave inválida. Origem: decisão de 2026-11-13; troca de 2026-11-13. Prova: CA-13.
- RN-20 — A conferência de origem roda na rodada do download, na mesma máquina e antes da folha de contato. Ela confere só as fotos aprovadas da lista de envio do RN-06, as aprovadas cujo nome de objeto não está aprovado no manifesto aprovado. Cada uma é baixada de novo da URL gravada no manifesto e recortada pelo `sharp` como no RN-03. O SHA-256 gravado no manifesto, o do arquivo local e o do recorte refeito têm de ser iguais. A foto aprovada cujo nome de objeto já está aprovado no manifesto aprovado tem de ser igual, campo a campo, à entrada de lá. Ela não é baixada de novo, porque foi conferida na rodada dela e a URL pode ter expirado. Se algum campo diferir, a conferência reprova o manifesto novo, sem rede. Com qualquer recusa, a conferência sai com 1, e a folha de contato não é gerada até o agente trocar a foto por outro candidato ou, depois do prazo do RN-18, refazer a busca e o download dessa foto, que gravam no manifesto a URL de origem, o SHA-256 e a data novos, e conferir de novo. Origem: escolhas do #56, em 2026-11-13; ADR-011, seção 4. Prova: CA-05.

## Critérios de aceitação

Só o que o `pnpm test` prova, sem rede e sem a chave. Ficam fora dele, e por isso sem CA:
- a revisão visual do RN-02;
- a aprovação da folha de contato do RN-09;
- a ordem do `SKILL.md`, que só gera a folha de contato depois de a conferência de origem sair com 0 (RN-09 e RN-20);
- os passos manuais da pessoa (Fora de escopo).

- CA-01 — Com um `fetch` de mentira, uma chamada a host fora de `pixabay.com` e `cdn.pixabay.com` falha antes de sair. A busca vai a `https://pixabay.com/api/`, com a chave no parâmetro `key` e sem cabeçalho `Authorization`.
- CA-02 — Com cabeçalhos JPEG montados em bytes, um 800×600 baseline e um 800×600 progressivo passam. Um 800×601, um PNG, um arquivo truncado e um JPEG com orientação EXIF 6 são recusados.
- CA-03 — Dado um manifesto completo, a conferência passa. Ela reprova, um caso de cada vez:
  - campo de crédito faltando;
  - id do Pixabay repetido;
  - SHA-256 repetido;
  - nome de objeto fora do padrão do RN-06;
  - patrimônio sem foto aprovada ou com duas;
  - foto sem veredito.
- CA-04 — Dado um manifesto aprovado com 3 patrimônios e uma resposta de busca fictícia do Pixabay, a busca só procura os outros 9 e deixa de fora os ids já usados.
- CA-05 — A conferência dos arquivos locais recusa, um caso de cada vez, o arquivo de uma foto aprovada da lista de envio:
  - que tenha 800×601;
  - que tenha orientação EXIF 6;
  - cujo SHA-256 difira do gravado no manifesto;
  - cujo SHA-256 difira do recorte do arquivo baixado de novo da URL gravada no manifesto (com `fetch` de mentira);
  - cujo download de novo falhe, como o de uma URL do Pixabay que expirou.

  O arquivo recusado não entra na lista de envio, e a conferência sai com 1. Dado um manifesto aprovado cuja URL de origem já expirou (o `fetch` de mentira falha para ela) e um manifesto novo que só troca a foto de outro patrimônio, a conferência passa, não chama o `fetch` para a foto antiga e só lista a nova para envio. Uma foto aprovada com o mesmo nome de objeto de uma aprovada no manifesto aprovado, mas com outro SHA-256, reprova o manifesto novo, com a mensagem exata (RN-20).
- CA-06 — O `permissions.deny` do `.claude/settings.json` traz, e o teste falha se faltar qualquer uma:
  - `mcp__3efacae1-0bd5-43e9-b21b-06a0e15499c3__*` (Supabase);
  - `mcp__cd63b4c8-e88c-449d-8d47-120629820758__*` (Vercel);
  - `mcp__7b70377e-6561-44af-b328-9a1533d0144c__*` (Composio);
  - `mcp__e6d3977c-2db1-4b63-97c4-d36718977027__*` (v0);
  - `Edit(/.github/workflows/**)`, `Edit(/.claude/hooks/**)` e `Edit(/.claude/settings.json)`.

  Os ids são os dos conectores na conta da pessoa, vistos em 2026-11-11.
- CA-07 — Com uma chave fictícia, as mensagens de erro de 400, de 401, de 403, de 429 e de falha de rede não trazem a chave, a URL da busca nem o corpo da resposta, mesmo quando o corpo de mentira contém a chave. Fora do módulo de entrada, nenhum arquivo da skill lê `process.env` nem o `.env.local`.
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
- CA-13 — Com um `fetch` de mentira e uma chave fictícia num `.env` de teste:
  - o download vem de `pixabay.com` ou de `cdn.pixabay.com` sem a chave, e nem a busca nem o download seguem redirecionamento;
  - um download em http, com porta, com usuário na URL ou com URL inválida falha antes de sair, com o motivo (RN-18);
  - um erro no download não culpa a chave e diz que a URL pode ter expirado, e o 429 da busca cita o limite do RN-18;
  - um 500, uma resposta que não é JSON e um corpo cortado no meio saem como erro do Pixabay, sem a chave, sem a URL da busca e sem o corpo da resposta;
  - o módulo de entrada lê só a `PIXABAY_API_KEY`, do `.env.local` da raiz, por `util.parseEnv`, e impressa ou em JSON a chave mostra só o nome;
  - o arquivo ausente, a chave vazia e a chave fora do ASCII visível dão mensagem própria, sem o valor (RN-19);
  - pelo ESLint do projeto e por uma varredura do código, fora do `pixabay.ts` nenhum arquivo da skill usa o `fetch`, outro cliente de rede ou processo filho, e só o `pixabay.ts` tira a chave do `ApiKey`.
- CA-14 — Com um `fetch` de mentira e JPEG gerados no próprio teste:
  - a busca pede `image_type=photo` e `orientation=horizontal` e guarda, de cada candidato, o id, a página da foto, o autor, o `user_id`, as tags e o `largeImageURL` (RN-01);
  - a mesma busca repetida dentro de 24 h lê a resposta guardada, sem chamar o `fetch`, e a de mais de 24 h chama de novo; o arquivo guardado não contém a chave fictícia (RN-18);
  - o download de uma origem de 1280×853 com orientação EXIF 6, perfil ICC e XMP grava um JPEG baseline de 800×600 que passa no leitor do RN-03, sem nenhum segmento APP1 a APP15 nem COM antes do SOS, e dois downloads dos mesmos bytes dão o mesmo SHA-256 (RN-03);
  - com um candidato de autor fictício `Ana Lima` e `user_id` 123, a entrada do manifesto da rodada traz a página da foto igual ao `pageURL`, o autor `Ana Lima`, a página do autor `https://pixabay.com/users/Ana%20Lima-123/`, a URL de origem igual ao `largeImageURL`, a licença do RN-05 e o SHA-256 do arquivo de 800×600 gravado, e não o da origem (RN-05);
  - uma origem de 900×600 com orientação 6, que fica 600×900, é recusada, e uma de 600×900 com orientação 6, que fica 900×600, passa; a recusada não grava arquivo nem entrada no manifesto da rodada (RN-03);
  - o `package.json` traz o `sharp` só em `devDependencies`, com a versão exata 0.35.5 (RN-08);
  - a folha de contato só sai de um manifesto que passa na conferência do manifesto. Ela mostra cada foto da rodada pelo arquivo local, com o veredito, o motivo, o autor com link para a página dele e o link da página da foto no Pixabay, e todo texto entra escapado (RN-09);
  - dado um manifesto aprovado com 3 fotos sem arquivo local e um manifesto novo com essas 3 e uma foto nova com arquivo, a folha sai, mostra a nova pelo arquivo local e as 3 só em texto; uma foto da rodada sem arquivo local faz a folha falhar, com o nome do objeto (RN-09);
  - dado um manifesto aprovado com `TI-0001-111.jpg` aprovada e sem arquivo local, e um manifesto novo com a `TI-0001-111.jpg` reprovada e a `TI-0001-222.jpg` aprovada e com arquivo, a folha sai, mostra a 222 pelo arquivo e a 111 só em texto, com o veredito de antes e o de agora (RN-09).

## Fora de escopo / não decidido

- Fora de escopo:
  - o crédito "Fotos: Pixabay", com link para `https://pixabay.com`, na tela. Ele fica pela troca de 2026-11-13, no lugar do "Fotos: Pexels" da decisão de 2026-11-11 (contrato, "Crédito na tela"), mesmo contra o item 9 do briefing da Entrega 4, que pede o catálogo "sem rodapé nem texto de crédito". A documentação do Pixabay pede o crédito onde aparecem resultados de busca, e a licença não exige atribuição (ADR-011, seção 2). A implementação e o CA são da spec 004, que herda essa decisão (RN-14 dela);
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
  - `.env.example` ganha `PIXABAY_API_KEY=`, no lugar da `PEXELS_API_KEY=` da T-01;
  - `package.json` e o lockfile ganham o `sharp` 0.35.5, em `devDependencies` e com a versão exata;
  - o `pnpm-workspace.yaml` não muda: o `sharp` não roda script na instalação, e o `allowBuilds: sharp: false` não o atrapalha (ADR-011, seção 1.3).
- Rules:
  - `rules/secrets.md` ganha a exceção da chave;
  - `rules/restrictions.md` (Escopo) e `rules/operacao.md` passam a dizer que `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` são editados pela pessoa, à mão, a partir do texto que o agente prepara;
  - o `vercel.json` continua "pedir antes".
- **Não pode mudar:**
  - `package.json` e o lockfile além do `sharp`: nenhuma outra dependência entra;
  - o agente não escreve no banco nem no Storage do deploy.
