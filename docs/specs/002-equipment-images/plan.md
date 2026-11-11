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
   - as duas rules que hoje deixam o agente editar workflow com aprovação, `rules/restrictions.md` (Escopo) e `rules/operacao.md`, passando a dizer que `.github/workflows/` e `.claude/settings.json` são editados pela pessoa, à mão, a partir do texto que o agente prepara; o `vercel.json` continua "pedir antes";
   - a exceção da `PEXELS_API_KEY` em `rules/secrets.md` e o placeholder no `.env.example`;
   - `.skill-output/` no `.gitignore`;
   - `.claude/skills/**/*.ts` no `tsconfig.json`;
   - o bloco da skill no `eslint.config.mjs`, que só deixa o módulo de rede usar `fetch` e só o módulo de entrada ler a chave.
2. **Leitura do JPEG** (`scripts/lib/jpeg.ts`): o SOI, a largura e a altura no SOF0, SOF1 ou SOF2 e a orientação EXIF, sem decodificar a imagem. Vem antes do download, que depende dela para recusar o arquivo.
3. **Manifesto e conferência** (`scripts/lib/manifest.ts` e `scripts/check.ts`): o formato, as regras do RN-04 ao RN-06 e as listas de objetos a enviar e a apagar. Vem antes da busca, que lê o manifesto aprovado para não repetir trabalho.
4. **Rede e chave** (`scripts/lib/pexels.ts` e o módulo de entrada). O `fetch` e a chave entram como parâmetro, e a allowlist de host vive aqui. As mensagens não trazem a chave. Só o módulo de entrada lê a chave, com `util.parseEnv`, como exceção do `rules/secrets.md`.
5. **Busca, download, conferência de origem e folha de contato** (`scripts/search.ts`, `scripts/download.ts`, o `--origin` do `scripts/check.ts` e `scripts/contact-sheet.ts`). Os testes usam fixtures de busca e de JPEG, sem nenhuma chamada de rede. A conferência de origem fica aqui, e não no passo 3, porque baixa de novo pelo módulo de rede do passo 4.
6. **Instruções e dados**: o `SKILL.md`, os quatro `references/` e `prisma/data/equipment.json`, igual à lista da prática.
7. **Rodada real**, com a chave da pessoa: buscar, escolher, revisar foto a foto, gerar a folha de contato e PARAR. Com a aprovação, o manifesto vai para `prisma/data/equipment-images.json`.

Fora desta spec, depois do passo 7, a pessoa publica as fotos pelo roteiro de `references/manual-upload.md` e registra no `ENTREGA.md`:
- cria o bucket;
- envia os 12 arquivos;
- abre as 12 URLs públicas numa janela anônima;
- confere a contagem do painel antes e depois de repetir o envio.

Os scripts rodam a partir da raiz com `node --import ./prisma/resolve-ts.mjs`, o mesmo hook do seed. São TypeScript que o Node 24 apaga, e importam outros arquivos da skill por caminho relativo.

## Risco

- **Uma rota até a produção que o deny não cobre.** São três:
  - O deny casa pelo id de cada conector na conta da pessoa. Se ela reconectar, o id muda, e o deny para de casar sem aviso. Prova: o passo 0 do `SKILL.md`, em cada rodada, procura pelo nome as ferramentas de escrita dos quatro servidores negados (Supabase, Vercel, Composio e v0) e só segue com zero resultados. A segunda camada é a pessoa desligar os conectores no claude.ai.
  - O navegador com as sessões da pessoa alcança o painel. Esse caminho fica no pedido de permissão por site.
  - O deny de `Edit` cobre as ferramentas de arquivo e os comandos que o Claude Code reconhece no shell (`sed`, `tee`, redirecionamento), mas não um script em Node nem o git. Por eles, o agente ainda escreve um workflow, e um workflow alterado numa branch roda em `pull_request` com os secrets do repositório (`DIRECT_URL`, `VERCEL_TOKEN`). O tratamento desta rota está em "Não decidido", na spec.
- **O que o deny dos workflows trava fora desta spec.** O job de E2E no CI (ADR-006, seção 6) e qualquer passo novo do `production.yml`, como a gravação dos equipamentos em produção pela spec dos dados iniciais, passam a ser escritos pela pessoa a partir do texto que o agente prepara.
- **O CDN do Pexels deixar de devolver 800×600.** Prova: o `download.ts` e a conferência recusam o arquivo. Se acontecer, a saída é o `sharp`, que pede ADR e pedido de dependência.
- **O `pnpm typecheck` e o `pnpm build` passarem a checar os scripts da skill**, pelo `include` novo do `tsconfig.json`. Prova: os dois passam no fim da T-01.
- **Os testes da skill dependerem do Docker**, porque rodam no `pnpm test`, que sobe o Testcontainers. É o custo de o verificador conseguir rodá-los.

## Depende de

- A chave do Pexels da pessoa, para a T-07. A emissão de chaves novas está pausada desde, no máximo, 2026-09-30 (`references/pexels.md`).
- A pessoa:
  - desligar no claude.ai os conectores do Supabase, da Vercel, do Composio e do v0, ou deixá-los só de leitura, antes da T-07;
  - depois desta spec, com o ADR-011 aceito, publicar as fotos pelo roteiro.
