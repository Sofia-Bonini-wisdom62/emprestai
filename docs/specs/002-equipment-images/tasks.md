# 002 — Tarefas

Nenhuma tarefa começa antes de a spec e o plano serem aprovados. A skill acrescenta uma dependência só, o `sharp` 0.35.5, na T-05 (ADR-011; troca de 2026-11-13). Cada tarefa é um PR.

A troca de 2026-11-13 pôs o Pixabay no lugar do Pexels depois da T-04. A T-04 é refeita, e a T-05 é feita do zero, para o Pixabay. O que fica e o que muda está no plano, seção "Troca do Pexels pelo Pixabay".

- [x] T-01 — Bloqueio de produção e configuração: o `permissions.deny` e o hook do `git push` no `.claude/settings.json`, o script do hook em `.claude/hooks/`, as linhas sobre `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` em `rules/restrictions.md` e `rules/operacao.md`, a exceção em `rules/secrets.md`, `PEXELS_API_KEY=` no `.env.example` (hoje `PIXABAY_API_KEY=`, pelo PR de documento da troca), `.skill-output/` no `.gitignore`, o `include` do `tsconfig.json` e o bloco da skill no `eslint.config.mjs`
      CA: CA-06, CA-10
      Verifica: `pnpm test` com `ca_06`, que lê o `.claude/settings.json`, e `ca_10`, que roda o hook num repositório git de teste, sem rede; `pnpm typecheck`, `pnpm lint` e `pnpm build` passando com o `include` novo
- [x] T-02 — Leitura do cabeçalho JPEG em `scripts/lib/jpeg.ts`
      CA: CA-02, CA-11
      Verifica: `pnpm test` com `ca_02` e `ca_11` sobre cabeçalhos montados em bytes
- [x] T-03 — Manifesto e conferência: `scripts/lib/manifest.ts` e `scripts/check.ts`, com as listas de objetos a enviar e a apagar
      CA: CA-03, CA-09, CA-12
      Verifica: `pnpm test` com `ca_03`, `ca_09` e `ca_12`
- [ ] T-04 — Rede e chave do Pixabay, refeita: `scripts/lib/pixabay.ts` no lugar do `scripts/lib/pexels.ts` (renomear aprovado pela pessoa nas escolhas do #56), a `PIXABAY_API_KEY` no módulo de entrada, o id e a licença do Pixabay no `scripts/lib/manifest.ts`, o caminho e as mensagens do bloco da skill no `eslint.config.mjs` e o comentário do `prisma/schema.prisma` sobre o nome do objeto. A primeira versão, para o Pexels, entrou no #51
      CA: CA-01, CA-07, CA-13; o CA-03, o CA-09 e o CA-12 com o id e a licença do Pixabay
      Verifica: `pnpm test` com `ca_01`, `ca_07` e `ca_13`, com chave fictícia e `fetch` de mentira, e com `ca_03`, `ca_09` e `ca_12` nos manifestos do Pixabay; `pnpm lint` reprovando `fetch` e `process.env` fora dos dois módulos
- [ ] T-05 — Busca, download, conferência de origem e folha de contato: `scripts/search.ts`, com o cache de 24 h, `scripts/download.ts`, com o recorte do `sharp`, o `--origin` do `scripts/check.ts`, com a recusa da foto aprovada de nome já aprovado que difere da entrada aprovada (RN-20), e `scripts/contact-sheet.ts`, com fixtures. Instala o `sharp`, aprovado pela pessoa na troca de 2026-11-13, em `devDependencies` e na versão exata 0.35.5, como ela aceitou nas escolhas do #56, e confere no diff do lockfile que nenhum pacote novo entrou
      CA: CA-04, CA-05, CA-14
      Verifica: `pnpm test` com `ca_04`, `ca_05` e `ca_14`, sobre uma resposta de busca fictícia do Pixabay e JPEG gerados no teste, sem rede; o diff do lockfile sem pacote acrescentado nem removido em `packages` e em `snapshots`: só o `sharp` nas `devDependencies` do importador da raiz e, se o pnpm a tirar, a marca `optional` do `sharp` e das dependências que só ele usa
- [ ] T-06 — `SKILL.md`, os quatro `references/` e `prisma/data/equipment.json`
      CA: CA-08 (a parte da lista)
      Verifica: `pnpm test` com `ca_08` na lista dos 12; o passo 0 do `SKILL.md` rodado uma vez, com zero ferramentas de escrita encontradas nos quatro servidores negados; o `SKILL.md` só gera a folha de contato depois de o `check.ts --files <pasta> --origin` sair com 0 (RN-09 e RN-20)
- [ ] T-07 — Rodada real com a chave da pessoa: buscar, escolher, revisar, folha de contato e PARAR; com a aprovação, `prisma/data/equipment-images.json`. Usa a chave do Pixabay da pessoa, que ela já tem
      CA: CA-08 (a parte do manifesto)
      Verifica: `pnpm test` com `ca_08` no manifesto aprovado; o `--origin` do `check.ts` passando nas fotos aprovadas da rodada, com o host de cada `largeImageURL` em `pixabay.com` ou `cdn.pixabay.com` (ADR-011, seção 6); a folha de contato aprovada pela pessoa; as fotos reprovadas, com o motivo, no manifesto
