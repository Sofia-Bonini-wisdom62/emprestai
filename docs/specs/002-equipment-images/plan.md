# 002 — Plano

## Caminho

A mudança entra por uma skill do harness em `.claude/skills/imagens-equipamentos/`:
- as instruções e os portões ficam no `SKILL.md`;
- o conhecimento de consulta fica em `references/`;
- o que dá para garantir sem olho humano fica em `scripts/`, com testes no `pnpm test`.

O bloqueio de produção mora no `.claude/settings.json`. O que sai da skill vai para `prisma/data/`, onde o seed da spec dos dados iniciais lê (ADR-011, Proposto).

O critério de separação:
- o que pode falhar sem ninguém perceber vira script e falha alto;
- o que exige olho vira revisão, primeiro do agente e depois da pessoa;
- o que é só consulta vai para `references/`.

## Ordem

1. **Bloqueio de produção e configuração.** Vem primeiro porque a garantia de que o agente não envia nada ao deploy precisa existir antes de qualquer script. Entram:
   - o `permissions.deny` no `.claude/settings.json`, com o teste que o lê (CA-06);
   - o hook PreToolUse do Bash e do PowerShell que nega `git push` e `gh pr create` quando os commits a enviar tocam `.github/workflows/`, `.claude/hooks/` ou `.claude/settings.json`, num `.mjs` em `.claude/hooks/` como os que já existem, com o teste num repositório git de teste (CA-10);
   - as duas rules que hoje deixam o agente editar workflow com aprovação, `rules/restrictions.md` (Escopo) e `rules/operacao.md`, passando a dizer que `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` são editados pela pessoa, à mão, a partir do texto que o agente prepara; o `vercel.json` continua "pedir antes";
   - a exceção da chave em `rules/secrets.md` e o placeholder no `.env.example`, hoje da `PIXABAY_API_KEY` (troca de 2026-11-13);
   - `.skill-output/` no `.gitignore`;
   - `.claude/**/*.ts` no `tsconfig.json`, porque o `**/*.ts` de hoje não casa pasta com ponto;
   - o bloco da skill no `eslint.config.mjs`, que só deixa o módulo de rede usar `fetch` e só o módulo de entrada ler a chave.
2. **Leitura do JPEG** (`scripts/lib/jpeg.ts`): o SOI, a largura e a altura no SOF0, SOF1 ou SOF2 e a orientação EXIF, sem decodificar a imagem. Vem antes do download, que depende dela para recusar o arquivo.
3. **Manifesto e conferência** (`scripts/lib/manifest.ts` e `scripts/check.ts`): o formato, as regras do RN-04 ao RN-06 e as listas de objetos a enviar e a apagar. Vem antes da busca, que lê o manifesto aprovado para não repetir trabalho. A linha de comando, decidida em 2026-11-12, é `check.ts <manifesto novo> [--approved <manifesto aprovado>]`:
   - sem `--approved`, compara com `prisma/data/equipment-images.json`; na primeira rodada, sem esse arquivo, compara com um manifesto vazio;
   - imprime o resumo de cada manifesto e as listas a enviar e a apagar, em ordem alfabética, ou os problemas, sem lista;
   - sai com 0 quando os dois manifestos passam, com 1 quando algum reprova e com 2 quando o argumento ou o arquivo está errado, inclusive um `--approved` que não existe ou é uma pasta.
4. **Rede e chave** (`scripts/lib/pixabay.ts` e o módulo de entrada). O `fetch` e a chave entram como parâmetro, e a allowlist de host vive aqui. Só este módulo monta a URL da busca, com a chave no parâmetro `key`, e as mensagens não trazem a chave, a URL da busca nem o corpo da resposta. Só o módulo de entrada lê a chave, com `util.parseEnv`, como exceção do `rules/secrets.md`.
5. **Busca, download, conferência de origem e folha de contato** (`scripts/search.ts`, `scripts/download.ts`, o `--origin` do `scripts/check.ts` e `scripts/contact-sheet.ts`). Entram aqui:
   - o `sharp` 0.35.5, em `devDependencies` e com a versão exata, e o recorte do RN-03 num módulo só da skill. Os testes também usam o `sharp`, para gerar as origens fictícias;
   - o cache de 24 h das buscas, na pasta de trabalho (RN-18);
   - a linha de comando da conferência com os arquivos, `check.ts <manifesto novo> [--approved <manifesto aprovado>] [--files <pasta> [--origin]]`. Com `--files`, ela confere o arquivo de cada objeto a enviar nessa pasta; com `--origin`, também a origem do RN-20. O `--origin` sem `--files` sai com 2.

   Os testes usam fixtures de busca e JPEG gerados no próprio teste, sem nenhuma chamada de rede. A conferência de origem fica aqui, e não no passo 3, porque baixa de novo pelo módulo de rede do passo 4 e recorta de novo pelo `sharp`, na mesma máquina e na mesma rodada do download (RN-20).
6. **Instruções e dados**: o `SKILL.md`, os quatro `references/` e `prisma/data/equipment.json`, igual à lista da prática.
7. **Rodada real**, com a chave da pessoa: buscar, escolher, revisar foto a foto, gerar a folha de contato e PARAR. Com a aprovação, o manifesto vai para `prisma/data/equipment-images.json`.

Fora desta spec, depois do passo 7, a pessoa publica as fotos pelo roteiro de `references/manual-upload.md` e registra no `ENTREGA.md`:
- cria o bucket;
- envia os 12 arquivos;
- abre as 12 URLs públicas numa janela anônima;
- confere a contagem do painel antes e depois de repetir o envio.

Os scripts rodam a partir da raiz com `node --import ./prisma/resolve-ts.mjs`, o mesmo hook do seed. São TypeScript que o Node 24 apaga, e importam outros arquivos da skill por caminho relativo.

## Troca do Pexels pelo Pixabay

A troca de 2026-11-13 chegou com os passos 1 a 3 e a primeira versão do passo 4 já na `main`. O que fica e o que é refeito:
- **Ficam:** o passo 1, menos a chave, que muda no PR de documento da troca, e o caminho do `pexels.ts` no bloco da skill do ESLint, que muda no passo 4; o passo 2, o leitor de JPEG, que agora confere o que o `sharp` gera; e a lógica do passo 3.
- **Passo 4, refeito:**
  - o `scripts/lib/pexels.ts` vira `scripts/lib/pixabay.ts`, com os hosts, a chave na URL e as mensagens do Pixabay. Renomear o arquivo foi aprovado pela pessoa em 2026-11-13 (escolhas do #56);
  - o `api-key.ts` passa a ler a `PIXABAY_API_KEY`;
  - o `manifest.ts` troca o id e a licença do Pexels pelos do Pixabay, no campo `pixabayId` e no nome `<patrimonio>-<idPixabay>.jpg`. Os campos `photoUrl`, `photographer` e `photographerUrl` ficam com o mesmo nome e passam a guardar a página da foto, o autor e a página do autor do RN-05;
  - o bloco da skill no `eslint.config.mjs` troca o caminho do `pexels.ts` no `ignores` da regra do `fetch` e as mensagens pelo `pixabay.ts`;
  - o comentário do `prisma/schema.prisma` sobre o nome do objeto passa ao `<idPixabay>`.
- **Passo 5:** é feito do zero, para o Pixabay. A versão escrita para o Pexels não entrou na `main`.
- **Passo 6:** segue como está, com `references/pixabay.md` no lugar do `references/pexels.md`.

## Risco

- **Uma rota até a produção que o deny não cobre.** São três:
  - O deny casa pelo id de cada conector na conta da pessoa. Se ela reconectar, o id muda, e o deny para de casar sem aviso. Prova: o passo 0 do `SKILL.md`, em cada rodada, procura pelo nome as ferramentas de escrita dos quatro servidores negados (Supabase, Vercel, Composio e v0) e só segue com zero resultados. A segunda camada é a pessoa desligar os conectores no claude.ai.
  - O navegador com as sessões da pessoa alcança o painel. Esse caminho fica no pedido de permissão por site.
  - O deny de `Edit` cobre as ferramentas de arquivo e os comandos que o Claude Code reconhece no shell (`sed`, `tee`, redirecionamento), mas não um script em Node nem o git. Por eles, o agente ainda escreve um workflow, e um workflow alterado numa branch roda em `pull_request` com os secrets do repositório (`DIRECT_URL`, `VERCEL_TOKEN`). Prova: o hook da T-01 nega o `git push` e o `gh pr create` desses commits (CA-10). Sobra um script que faça o push sozinho, sem passar pelo Bash nem pelo PowerShell; esse resto fica registrado no ADR-011. O hook também protege `.claude/hooks/`, para o agente não desligá-lo editando o próprio arquivo.
- **O que o deny dos workflows e dos hooks trava fora desta spec.** Passam a ser escritos pela pessoa, a partir do texto que o agente prepara:
  - o job de E2E no CI (ADR-006, seção 6);
  - qualquer passo novo do `production.yml`, como a gravação dos equipamentos em produção pela spec dos dados iniciais;
  - qualquer mudança nos hooks que já existem (`require-verification.mjs` e `verifier-bash-allowlist.mjs`).
- **O recorte do `sharp` sair fora de 800×600 ou com orientação.** Prova: o leitor de JPEG, que não usa o `sharp`, confere cada arquivo no `download.ts` e na conferência (CA-14, CA-05). O `sharp` entrou pela troca de 2026-11-13, aprovado pela pessoa (ADR-011).
- **Os bytes do recorte mudarem com a versão do `sharp` ou com a máquina.** Prova: a conferência de origem recorta de novo na mesma máquina e na mesma rodada do download (CA-05). A versão fica exata no `package.json`. Trocá-la no meio de uma rodada pede refazer o download dela; as fotos já aprovadas não mudam.
- **A URL do `largeImageURL` expirar antes da conferência de origem.** Prova: a conferência recusa o arquivo cujo download falha (CA-05). Por isso ela roda na rodada do download, e só nas fotos da lista de envio (RN-20).
- **O mesmo `largeImageURL` devolver bytes diferentes.** Prova: a conferência de origem da T-07 sobre as fotos aprovadas (ADR-011, seção 6).
- **O host real do `largeImageURL` diferir dos exemplos ou redirecionar.** Prova: a T-07. Se acontecer, o RN-01, o RN-18, o CA-01 e o CA-13 mudam pelo gatilho do ADR-011.
- **A chave aparecer numa mensagem**, agora que vai na URL da busca. Prova: CA-07 e CA-13, com chave fictícia.
- **O `pnpm typecheck` e o `pnpm build` passarem a checar os scripts da skill**, pelo `include` novo do `tsconfig.json`. Prova: os dois passam no fim da T-01.
- **Os testes da skill dependerem do Docker**, porque rodam no `pnpm test`, que sobe o Testcontainers. É o custo de o verificador conseguir rodá-los.

## Depende de

- A chave do Pixabay da pessoa, para a T-07. Ela já tem a chave, desde 2026-11-13 ("peguei a chave"; ADR-011, seção 1.1).
- A pessoa:
  - desligar no claude.ai os conectores do Supabase, da Vercel, do Composio e do v0, ou deixá-los só de leitura, antes da T-07;
  - depois desta spec, com o ADR-011 aceito, publicar as fotos pelo roteiro.
