# ADR-011 — Imagens dos equipamentos: Pixabay, `sharp`, Storage e envio pela pessoa

| Campo | Valor |
|---|---|
| Status | Proposto |
| Data | 2026-11-11; troca do Pexels pelo Pixabay em 2026-11-13 |
| Turma | B |
| Vínculo | [`docs/specs/002-equipment-images/spec.md`](../specs/002-equipment-images/spec.md); Entrega 2 da prática, contrato da skill `imagens-equipamentos` |
| Substitui | Nenhum trecho de ADR: o [ADR-001](001-stack.md) não decide integração de imagem nem Storage. Acrescenta à stack do ADR-001 uma dependência de desenvolvimento, só para a skill: o `sharp`, aprovado pela pessoa na troca de 2026-11-13. O `devDependencies` e a versão exata 0.35.5 são recomendação deste ADR. Ao aceitar, mudam duas rules: em [`rules/restrictions.md`](../../rules/restrictions.md), seção Escopo, e em [`rules/operacao.md`](../../rules/operacao.md), linha dos workflows, `.github/workflows/` e `.claude/settings.json` passam a ser editados pela pessoa, à mão, a partir do texto que o agente prepara; o `vercel.json` continua "pedir antes" |
| Decide | De onde vêm as fotos dos equipamentos, como chegam a 800×600, onde ficam, quem as publica e como o agente fica impedido de publicá-las |

---

## 1. Contexto

A prática pede uma foto por equipamento, só da API do Pexels, num bucket público do Supabase Storage, em 800×600 e com o crédito registrado. Ela também diz que o agente nunca escreve em produção: o que vai para o banco ou para o Storage do deploy é executado pela pessoa.

Quatro fatos pesam:
- as sessões deste projeto têm conectores MCP do Supabase e da Vercel autenticados na conta da pessoa, com ferramentas de escrita, e também o Composio, com proxy e bash remoto, e o v0, que publica na Vercel;
- um workflow alterado numa branch roda em `pull_request` com os secrets do repositório (`DIRECT_URL`, `VERCEL_TOKEN` e os demais do `production.yml`);
- o `compose.yaml` não sobe o Storage, então o dev não tem onde provar um bucket;
- o briefing da Entrega 3 pede o `sharp` para padronizar o tamanho. Ele não está no ADR-001 e já aparece no lockfile, na 0.35.5, como dependência opcional do `next`.

### 1.1 A troca do Pexels pelo Pixabay

A primeira versão deste ADR, de 2026-11-11, escolhia o Pexels e pedia o 800×600 ao CDN dele (`fit=crop&w=800&h=600`), sem `sharp`. Só que a emissão de chaves novas do Pexels está pausada desde, no máximo, 2026-09-30, como dizem a [página da API](https://www.pexels.com/api/) e a [central de ajuda](https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key), lidas em 2026-11-11. A conta da pessoa ficou sem chave, e ela guarda o print da página.

Em 2026-11-13, a pessoa trocou a fonte pelo Pixabay ("Confirmo a troca"). A mensagem que ela confirmou está inteira na spec 002, na definição "Troca de 2026-11-13". Entre outras coisas, ela dizia que:
- ela precisaria criar a conta e a chave do Pixabay, o que já fez ("peguei a chave", no mesmo dia);
- o Pixabay não corta pela URL, e o 800×600 passa a pedir o `sharp`, dependência nova;
- o crédito na tela passa a ser "Fotos: Pixabay", com link;
- a troca contraria o contrato da prática e vai para o `ENTREGA.md`.

A T-04 da spec 002, já na `main` (#51), foi feita para o Pexels e é refeita.

### 1.2 O que o Pixabay diz

São estes os fatos da [documentação da API](https://pixabay.com/api/docs/) e do [resumo da licença](https://pixabay.com/service/license-summary/), lidos em 2026-11-13, sem login:
- **Busca e chave:** a busca é `GET https://pixabay.com/api/`, com a chave obrigatória no parâmetro `key` da URL. A documentação não traz outro jeito de mandar a chave, que só aparece para quem está logado.
- **Limite:** são 100 pedidos a cada 60 s, por chave. O 429 vem com o texto "API rate limit exceeded", e todo erro vem em texto puro.
- **Cache e volume:** a resposta de cada busca tem de ficar guardada por 24 h. A API é feita para pedidos de pessoas, e o download em massa, sistemático, não é permitido.
- **Hotlink:** as URLs devolvidas servem para mostrar resultados por um tempo. O hotlink permanente é proibido, e quem usa a imagem tem de baixá-la para o próprio servidor.
- **Tamanhos:**
  - o `largeImageURL` tem até 1280 px no lado maior;
  - o `webformatURL` tem até 640 px e vale 24 h;
  - o original (`imageURL`) e o `fullHDURL` só vêm com acesso completo, que pede aprovação da conta;
  - não há parâmetro de corte nem de tamanho exato.
- **Hosts:** nos exemplos, a busca e o `largeImageURL` estão em `pixabay.com`, e o `previewURL` e a foto do autor, em `cdn.pixabay.com`.
- **Campos e crédito:** cada resultado traz `id`, `pageURL`, `tags`, `user` e `user_id`, e a página do autor é `https://pixabay.com/users/<user>-<user_id>/`. Em troca do uso gratuito, a documentação pede que se mostre de onde vêm as imagens ("show your users where the images and videos are from") sempre que resultados de busca aparecem.
- **Licença:** a Pixabay Content License deixa usar sem citar o autor. Ela lembra que marca, logo ou pessoa reconhecível podem pedir outros direitos.

### 1.3 O teste do `sharp`

Em 2026-11-13, o teste usou o `sharp` 0.35.5 que já está no lockfile, com a libvips 8.18.7, sem instalar nada. Uma origem fictícia de 1280×853, com orientação EXIF 6, saiu assim:
- em 800×600, sem EXIF e sem nenhum outro segmento de metadados ou comentário antes do SOS, mesmo com EXIF, ICC e XMP na origem;
- aprovada pelo leitor de JPEG da T-02;
- com os mesmos bytes em duas rodadas.

O pacote não tem script de instalação. O binário vem pronto, por plataforma, nos pacotes opcionais `@img/sharp-*`. O lockfile já traz os de todas as plataformas que o `sharp` 0.35.5 publica, entre elas Windows x64, a desta máquina, e Linux x64, a do CI. Por isso o `allowBuilds: sharp: false` do `pnpm-workspace.yaml`, que só barra script de instalação, não atrapalha e fica como está.

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Fonte | Só a API do Pixabay, com a chave da pessoa (`PIXABAY_API_KEY`, só no `.env.local`): a busca em `https://pixabay.com/api/` e o arquivo do `largeImageURL`, em `pixabay.com` ou `cdn.pixabay.com` |
| Tamanho | O `sharp`, em `devDependencies` e na versão exata 0.35.5, recorta o `largeImageURL` em 800×600. O leitor de JPEG da T-02, sem biblioteca de imagem, confere o arquivo |
| Cache e hotlink | A resposta de cada busca fica guardada por 24 h na pasta de trabalho. A foto vai para o bucket, e nenhuma tela usa endereço do Pixabay como imagem |
| Crédito | Por foto, no manifesto. Na tela, "Fotos: Pixabay", com link para `https://pixabay.com` |
| Armazenamento | Bucket público `equipment-images` no projeto de produção, só `image/jpeg`, até 1 MB por arquivo |
| Nome do objeto | `<patrimonio>-<idPixabay>.jpg` |
| Quem cria o bucket | A pessoa, pelo painel |
| Quem envia os arquivos | A pessoa, pelo painel, pela lista que a conferência imprime |
| Bloqueio do agente | `permissions.deny` no `.claude/settings.json`: os servidores MCP do Supabase, da Vercel, do Composio e do v0, inteiros, e `Edit(/.github/workflows/**)`, `Edit(/.claude/hooks/**)` e `Edit(/.claude/settings.json)`. Um hook PreToolUse do Bash e do PowerShell nega `git push` e `gh pr create` quando os commits a enviar tocam esses três caminhos. Como segunda camada, a pessoa desliga os conectores no claude.ai, ou os deixa só de leitura |

- **Pixabay** — dá chave a quem se cadastra, e a pessoa já tem a dela. A licença deixa usar sem atribuição. O limite de 100 pedidos por minuto sobra para umas 30 chamadas por rodada. O preço é contrariar o contrato da prática, que pede o Pexels; o conflito fica no `ENTREGA.md`, decidido pela pessoa.
- **`sharp`** — o Pixabay não corta pela URL, e o maior tamanho sem acesso completo é o `largeImageURL`, de até 1280 px.
  - O `sharp` já está no lockfile, na mesma versão, como dependência opcional do `next`. Ao entrar em `devDependencies` com a versão exata, ele não deve acrescentar pacote ao lockfile, e a tarefa que o instalar confere isso no diff.
  - Ele não roda script na instalação (seção 1.3).
  - Quem gera o arquivo, o `sharp`, não é quem o confere, o leitor de JPEG.
  - A escolha do `sharp` é da pessoa, na troca de 2026-11-13. O `devDependencies` e a versão exata são recomendação deste ADR.
- **Cache de 24 h** — é exigência da API. Também evita repetir o mesmo pedido na rodada.
- **Chave na URL** — é o único jeito que a API documenta. Com isso, a chave corre o risco de aparecer em qualquer registro de URL. Por isso só o módulo de rede monta a URL da busca, e nenhuma mensagem da skill traz essa URL nem o corpo da resposta.
- **Crédito na tela** — a documentação pede o crédito onde aparecem resultados de busca, e esse lugar é a folha de contato. O catálogo mostra fotos já baixadas, não resultados de busca, e a licença não exige atribuição. O crédito fica na tela pelo que a pessoa confirmou na troca de 2026-11-13 (seção 1.1), como o contrato da prática pedia para o Pexels ("Crédito na tela"). A implementação é da spec 004 (RN-14).
- **Bucket pelo painel** — o schema `storage` é do serviço de Storage. Uma migration do Prisma ali criaria um segundo dono do schema, pediria revisão humana pela rule e não teria como ser provada no dev, que não tem Storage.
- **Envio pela pessoa** — um script de envio exigiria a secret key de produção na máquina, o que o `rules/restrictions.md` proíbe, e daria ao agente um caminho para rodá-lo. Doze arquivos cabem na mão, e o nome fixo faz o reenvio substituir o mesmo objeto.
- **Nome com o id do Pixabay** — trocar a foto muda a URL, e o CDN do Storage nunca serve a versão velha. O preço é atualizar o seed e apagar o objeto antigo a cada troca.
- **Deny por servidor inteiro** — uma lista de ferramentas de escrita envelhece a cada versão do conector. O deploy na Vercel também é rota até a produção, porque o código publicado roda com a secret key do ambiente da Vercel.
- **Deny nos workflows, nos hooks e no próprio settings** — a regra `Edit(caminho)` cobre o `Write`, as ferramentas de arquivo e os comandos que o Claude Code reconhece no shell, como `sed`, `tee` e redirecionamento ([permissões do Claude Code](https://code.claude.com/docs/en/permissions), lida em 2026-11-11). Ela não cobre um script em Node nem o git, que escrevem por conta própria. Os hooks entram no deny para o agente não desligar o hook do push editando o próprio arquivo.
- **Hook no `git push`** — é o passo que dispara o CI com os secrets. Negar o push e a abertura de PR quando os commits tocam esses caminhos fecha a rota do Node e do git, que o deny não alcança. A escolha é da pessoa, em 2026-11-11, entre aceitar o risco, este hook e o sandbox do Claude Code.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Manter o Pexels, com o 800×600 pedido ao CDN | A emissão de chaves está pausada, e a conta da pessoa não tem chave |
| `webformatURL`, de até 640 px, ou a variante `_960`, de até 960×720 | A de 640 px teria de ampliar a foto. A `_960` é uma URL montada à mão, fora dos campos da resposta, e numa foto 16:9 sai com 540 px de altura, abaixo de 600 |
| Acesso completo da API do Pixabay (`imageURL`, `fullHDURL`) | Pede aprovação da conta, e o `largeImageURL` já cobre 800×600 |
| Biblioteca de imagem em JavaScript puro, como o `jimp` | Dependência nova inteira no lockfile, quando o `sharp` já está lá |
| Ferramenta de linha de comando, como o ImageMagick | Processo filho, que o bloco da skill no ESLint proíbe, e instalação fora do pnpm |
| Recorte à mão pela pessoa | O tamanho voltaria a depender de olho, sem prova no `pnpm test` |
| Otimizador de imagem do Next na tela | O arquivo no bucket ficaria do tamanho da origem, e o 800×600 do RN-03 é do arquivo |
| Bucket criado por migration | Segundo dono do schema `storage`, revisão humana e nenhuma prova no dev |
| Script de envio com a secret key na linha de comando | Secret key de produção na máquina e um caminho que o agente conseguiria rodar |
| Deny só das ferramentas de escrita dos conectores | Lista que envelhece; o navegador e o CI ficariam de fora do mesmo jeito |
| Nome fixo `<patrimonio>.jpg`, com sobrescrita | URL estável, mas sujeita ao cache do CDN do Storage no plano Free |

---

## 4. Consequências

### Fica mais fácil

- O tamanho, a origem, a repetição e o crédito são conferidos por código. A única biblioteca nova é a que gera o arquivo. O leitor de JPEG, que confere o formato, não depende dela; a conferência de origem a usa para recortar de novo, e por isso roda na mesma máquina e na mesma versão.
- O agente consegue fazer todo o trabalho que não é publicar.
- A chave existe: a pessoa já tem a do Pixabay.

### Fica mais difícil

- O deny casa pelo id de cada conector. Se a pessoa reconectar, o id muda, e o deny para de casar sem aviso. Duas coisas cobrem isso: a segunda camada, que é a pessoa desligar os conectores no claude.ai, e a conferência que a skill faz em cada rodada, de que nenhuma ferramenta de escrita dos quatro servidores aparece.
- O navegador com as sessões da pessoa alcança o painel do Supabase, e o deny não cobre isso. Esse caminho fica no pedido de permissão por site.
- Pelas ferramentas de arquivo, o agente não edita mais o `.claude/settings.json`, os hooks nem os workflows. Mudança nesses arquivos passa a ser feita pela pessoa, à mão. Isso inclui o job de E2E no CI (ADR-006, seção 6), o passo de gravar os equipamentos em produção, da spec dos dados iniciais, e os hooks que já existem.
- Por um script em Node ou pelo git, o agente ainda escreveria um workflow. O hook nega o push desses commits pelo Bash e pelo PowerShell. Sobra um script que faça o push sozinho, sem passar por nenhum dos dois: esse risco é aceito e fica registrado aqui.
- O `sharp` é binário nativo, por plataforma. Numa plataforma para a qual ele não publica binário pronto, ele não carrega. Hoje o lockfile traz todas as que ele publica, entre elas Windows x64 e Linux x64.
- Os bytes do recorte dependem da versão do `sharp` e da libvips. Por isso:
  - a conferência de origem recorta de novo na mesma máquina e na mesma rodada do download (spec 002, RN-20);
  - trocar a versão do `sharp` no meio de uma rodada, antes da aprovação da folha de contato, pede refazer o download daquela rodada;
  - as fotos já aprovadas ficam como estão: o SHA-256 do manifesto é o do arquivo gerado e publicado, e a conferência de origem não volta a recortá-las.
- A documentação diz que o `webformatURL` vale 24 h e não diz quanto vale o `largeImageURL`, e a skill o trata como temporário. A conferência de origem roda na rodada do download, porque depois a URL pode ter expirado, e o arquivo é recusado com esse motivo.
- A conferência de origem supõe que dois downloads do mesmo `largeImageURL` dão os mesmos bytes. Isso não foi provado com o Pixabay; a rodada real (T-07) prova.
- A chave vai na URL da busca. Um registro de URL fora da skill, como um proxy, poderia guardá-la; esse risco é aceito e fica registrado aqui.
- A API do Pixabay proíbe o download em massa, sistemático, e pede pedidos de pessoas. Uma busca por equipamento sem foto aprovada e o download só das fotos escolhidas ficam longe disso; o risco é aceito e fica registrado aqui.
- A troca contraria o contrato da prática, que pede o Pexels e o crédito "Fotos: Pexels". O conflito fica no `ENTREGA.md`, com a decisão da pessoa e o print do Pexels pausado.

---

## 5. O que este ADR não decide

- De onde vêm as fotos no dev, que não tem Storage: fica para a spec do catálogo.
- Onde a imagem e os créditos ficam no banco: fica para a spec dos dados iniciais.

---

## 6. Antes de aceitar

- Com a chave da pessoa, a rodada real (T-07 da spec 002) confirma duas coisas:
  - o `largeImageURL` vem de `pixabay.com` ou de `cdn.pixabay.com`, sem redirecionamento;
  - a conferência de origem passa nas fotos aprovadas, o que prova que dois downloads do mesmo `largeImageURL` dão os mesmos bytes.
- A troca fica registrada no `ENTREGA.md`, com o print do Pexels pausado.

---

## 7. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| O `largeImageURL` vem de outro host ou redireciona | Fonte e rede |
| O Pixabay muda o limite, o cache exigido ou a regra de hotlink | Fonte e rede |
| O `sharp` deixa de ter binário pronto para Windows x64 ou Linux x64, ou passa a rodar script na instalação | Tamanho |
| Uma versão nova do `sharp` entra no `package.json` | Tamanho: a versão nova pede aprovação da pessoa e, com este ADR já aceito, um ADR novo que substitua a versão da seção 2. Ela troca a 0.35.5 no RN-08, no CA-14 e no Contrato afetado da spec 002; os demais casos do CA-14 passam com ela; as fotos já aprovadas mantêm o SHA-256 gravado |
| O mesmo `largeImageURL` devolve bytes diferentes | Tamanho e conferência de origem |
| A pessoa reconecta um conector, ou entra um conector novo com escrita | Bloqueio do agente |
| Uma rodada da skill encontra uma ferramenta de escrita de um dos quatro servidores | Bloqueio do agente |
| O dev ganha Storage no `compose.yaml` | Criação do bucket e fotos no dev |
