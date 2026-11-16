---
name: imagens-equipamentos
description: Prepara as fotos dos 12 equipamentos da prática pelo Pixabay, em 800×600 e com o crédito no manifesto, e para antes de qualquer envio, até a pessoa aprovar a folha de contato. Só roda quando a pessoa a invoca. Nunca envia nada ao Supabase do deploy.
disable-model-invocation: true
allowed-tools: Bash(node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/*)
---

# Imagens dos equipamentos

A regra de cada passo está na spec 002 (`docs/specs/002-equipment-images/spec.md`) e no ADR-011. Este arquivo diz a ordem, os portões e o que a skill nunca faz. A consulta fica em `references/`:

- `references/contract.md`: os 9 requisitos do contrato da prática e quem garante cada um;
- `references/pixabay.md`: a API, a chave, os limites, o cache, o hotlink e o crédito;
- `references/visual-review.md`: a régua do que reprova uma foto (RN-02);
- `references/manual-upload.md`: o roteiro do painel para a pessoa, depois da aprovação.

Todo script roda a partir da raiz do repositório, com `node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/<script>.ts`. A pasta de trabalho é `.skill-output/imagens-equipamentos/`, fora do git. Nos comandos abaixo, `scripts/` abrevia `.claude/skills/imagens-equipamentos/scripts/`, e `$W` abrevia a pasta de trabalho.

## Nunca

- Nunca envie nada ao Supabase do deploy, nem ao banco nem ao Storage, por ferramenta, script, painel ou API (RN-07). Quem cria o bucket e envia os arquivos é a pessoa.
- Nunca leia nem escreva o `.env.local`, nem mostre a chave. Só o `scripts/lib/api-key.ts` lê a `PIXABAY_API_KEY` (RN-08).
- Nunca use outra origem de imagem além da API do Pixabay (RN-01), nem endereço do Pixabay como imagem na tela (RN-18).
- Nunca baixe foto sem o `download.ts`, que recorta e confere o arquivo (RN-03).
- Nunca aprove uma foto sem olhar o arquivo pela régua de `references/visual-review.md` (RN-02).
- Nunca libere a lista de envio nem copie o manifesto para `prisma/data/` antes de a pessoa aprovar a folha de contato (RN-09).
- Nunca refaça a busca dentro das 24 h só para renovar uma URL (RN-18).
- Nunca edite `.github/workflows/`, `.claude/hooks/` nem `.claude/settings.json` (RN-07).

## Passo 0: o bloqueio de produção

Antes de qualquer outro passo, em cada rodada:

1. Procure, pelo nome, as ferramentas dos quatro servidores negados no `permissions.deny` do `.claude/settings.json`: Supabase (`mcp__3efacae1-0bd5-43e9-b21b-06a0e15499c3__`), Vercel (`mcp__cd63b4c8-e88c-449d-8d47-120629820758__`), Composio (`mcp__7b70377e-6561-44af-b328-9a1533d0144c__`) e v0 (`mcp__e6d3977c-2db1-4b63-97c4-d36718977027__`).
2. Procure também pelo nome das ferramentas de escrita, porque o id muda quando a pessoa reconecta um conector: `execute_sql`, `apply_migration`, bucket e storage, `deploy`, `create_project_env`, `COMPOSIO` e os `chats` do v0.
3. Só siga com zero ferramentas de escrita desses quatro servidores. Se aparecer alguma, PARE: diga à pessoa qual apareceu e de qual servidor. É um gatilho de revisão do ADR-011, seção 7.

## Passo 1: a pasta de trabalho

- Rode a partir do checkout que tem o `.env.local` da pessoa, com a `PIXABAY_API_KEY` preenchida. Se o script disser que o arquivo ou a chave faltam, PARE e peça à pessoa, sem pedir o valor no chat.
- Rodada nova, com `prisma/data/equipment-images.json` já existente: antes do primeiro download, copie esse manifesto aprovado para `$W/manifest.json`. O manifesto novo não pode deixar de fora um patrimônio aprovado (RN-16), e o `download.ts` acrescenta as fotos novas ao que já está lá.
- Se a pasta de trabalho tiver fotos ou manifesto de uma rodada anterior, pergunte à pessoa antes de apagar.

## Passo 2: a busca

`node --import ./prisma/resolve-ts.mjs scripts/search.ts`

- A busca procura só os equipamentos sem foto aprovada, uma vez por equipamento, e deixa de fora os ids já usados (CA-04).
- Cada resposta fica guardada por 24 h em `$W/cache/` (RN-18). Os candidatos ficam em `$W/candidates.json`, com o id, a página, o autor, as tags e o `largeImageURL`.
- Um 429 diz o limite de 100 pedidos a cada 60 s: espere, sem repetir em laço.

## Passo 3: escolher, baixar e revisar, foto a foto

Para cada patrimônio da busca:

1. Escolha um candidato pelas tags e pela página da foto. Prefira o que mostra só o equipamento.
2. Baixe: `node --import ./prisma/resolve-ts.mjs scripts/download.ts <patrimônio> <id do Pixabay>`.
   - O script recorta em 800×600, confere o arquivo e acrescenta a foto ao `$W/manifest.json`, sem veredito.
   - A origem menor que 800×600 é recusada, sem arquivo e sem entrada: escolha outro candidato.
   - Se o download falhar, a URL do Pixabay pode ter expirado: escolha outro candidato ou espere o prazo da busca guardada.
3. Abra o arquivo `$W/<patrimônio>-<id>.jpg` e julgue pela régua de `references/visual-review.md`.
4. Escreva o veredito na entrada da foto, no `$W/manifest.json`: `"review": { "verdict": "approved", "reason": "..." }` ou `"rejected"`, sempre com o motivo.
5. Uma foto reprovada continua no manifesto, com o motivo (RN-05), e o arquivo dela continua na pasta. Volte ao item 1 com outro candidato, até ter uma foto aprovada para o patrimônio.

Cada patrimônio termina com exatamente uma foto aprovada (CA-03).

## Passo 4: a conferência

`node --import ./prisma/resolve-ts.mjs scripts/check.ts $W/manifest.json --files $W --origin`

- A conferência confere o manifesto (CA-03 e CA-12) e o arquivo de cada foto da lista de envio. Com `--origin`, ela baixa cada origem de novo e recorta de novo (RN-20).
- Rode na mesma máquina e na mesma rodada do download, enquanto as URLs valem.
- Só siga quando ela sair com 0. Com 1, corrija o que ela listou:
  - campo que falta;
  - foto sem veredito;
  - arquivo recusado;
  - origem que não baixa ou que difere do arquivo.

  Depois, rode de novo.

## Passo 5: a folha de contato, e PARE

`node --import ./prisma/resolve-ts.mjs scripts/contact-sheet.ts`

- Só gere a folha depois de a conferência do passo 4 sair com 0 (RN-09 e RN-20).
- A folha fica em `$W/folha-de-contato.html`. As fotos desta rodada aparecem pelo arquivo, com o veredito, o motivo e o crédito, e as que vêm do manifesto aprovado aparecem só em texto.
- PARE aqui. Peça à pessoa que abra a folha no navegador e aprove ou reprove cada foto. Nada vai ao bucket nem a `prisma/data/` antes da resposta dela.
- Se ela reprovar uma foto, mude o veredito no manifesto, com o motivo dela, e volte ao passo 3 para aquele patrimônio.

## Passo 6: depois da aprovação da pessoa

1. Rode `node --import ./prisma/resolve-ts.mjs scripts/check.ts $W/manifest.json` com o manifesto aprovado antigo ainda em `prisma/data/equipment-images.json`. A saída é a lista de objetos a enviar e a apagar, comparada com o manifesto aprovado.
2. Copie o `$W/manifest.json` para `prisma/data/equipment-images.json`, numa branch, e abra o PR com a lista do item 1 no corpo. Quem faz o merge é a pessoa.
3. Entregue à pessoa a lista e o roteiro de `references/manual-upload.md`. O envio, a conferência das URLs públicas e a ordem entre o envio e o merge são passos dela.
