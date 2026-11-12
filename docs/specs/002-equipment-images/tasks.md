# 002 — Tarefas

Nenhuma tarefa começa antes de a spec e o plano serem aprovados. A skill não acrescenta dependência. Cada tarefa é um PR.

- [x] T-01 — Bloqueio de produção e configuração: o `permissions.deny` e o hook do `git push` no `.claude/settings.json`, o script do hook em `.claude/hooks/`, as linhas sobre `.github/workflows/`, `.claude/hooks/` e `.claude/settings.json` em `rules/restrictions.md` e `rules/operacao.md`, a exceção em `rules/secrets.md`, `PEXELS_API_KEY=` no `.env.example`, `.skill-output/` no `.gitignore`, o `include` do `tsconfig.json` e o bloco da skill no `eslint.config.mjs`
      CA: CA-06, CA-10
      Verifica: `pnpm test` com `ca_06`, que lê o `.claude/settings.json`, e `ca_10`, que roda o hook num repositório git de teste, sem rede; `pnpm typecheck`, `pnpm lint` e `pnpm build` passando com o `include` novo
- [x] T-02 — Leitura do cabeçalho JPEG em `scripts/lib/jpeg.ts`
      CA: CA-02
      Verifica: `pnpm test` com `ca_02` e `rn_12` a `rn_15` sobre cabeçalhos montados em bytes
- [x] T-03 — Manifesto e conferência: `scripts/lib/manifest.ts` e `scripts/check.ts`, com as listas de objetos a enviar e a apagar
      CA: CA-03, CA-09
      Verifica: `pnpm test` com `ca_03` e `ca_09`
- [ ] T-04 — Rede e chave: `scripts/lib/pexels.ts` e o módulo de entrada que lê a chave
      CA: CA-01, CA-07
      Verifica: `pnpm test` com `ca_01` e `ca_07`, com chave fictícia e `fetch` de mentira; `pnpm lint` reprovando `fetch` e `process.env` fora dos dois módulos
- [ ] T-05 — Busca, download, conferência de origem e folha de contato: `scripts/search.ts`, `scripts/download.ts`, o `--origin` do `scripts/check.ts` e `scripts/contact-sheet.ts`, com fixtures
      CA: CA-04, CA-05
      Verifica: `pnpm test` com `ca_04` e `ca_05`, sobre uma resposta de busca fictícia e JPEG montados em bytes, sem rede
- [ ] T-06 — `SKILL.md`, os quatro `references/` e `prisma/data/equipment.json`
      CA: CA-08 (a parte da lista)
      Verifica: `pnpm test` com `ca_08` na lista dos 12; o passo 0 do `SKILL.md` rodado uma vez, com zero ferramentas de escrita encontradas nos quatro servidores negados
- [ ] T-07 — Rodada real com a chave da pessoa: buscar, escolher, revisar, folha de contato e PARAR; com a aprovação, `prisma/data/equipment-images.json`. Espera a chave do Pexels
      CA: CA-08 (a parte do manifesto)
      Verifica: `pnpm test` com `ca_08` no manifesto aprovado; a folha de contato aprovada pela pessoa; as fotos reprovadas, com o motivo, no manifesto
