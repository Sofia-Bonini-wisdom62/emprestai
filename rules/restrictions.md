---
description: O que o agente não pode fazer neste projeto
globs: []
alwaysApply: true
---

# O que não fazer
> leitor: agente

## Autoridade

- Não decida ADR. Se encontrar uma decisão que precisa de um, rascunhe
  `docs/adr/00N-<assunto>.md` com a decisão e as alternativas, e PARE.
  Quem aprova é o time. Nunca edite um ADR existente.
- Não contrarie o que está em docs/adr/. Se precisar contrariar, pare.
- Não responda por conta própria o que o PRD (`docs/prd.md`) deixou
  ambíguo. Liste as perguntas e espere.
- Não escolha biblioteca que não esteja no ADR-001. Proponha e espere.
  Vale para dependência "pequena" e para troca de versão major.

## Escopo

- Não altere arquivo fora do escopo da tarefa atual.
- Não gere scaffold automático de framework sem mostrar antes a lista
  do que ele vai criar.
- Não escreva código de funcionalidade sem uma spec correspondente em
  `docs/specs/`. Pode rascunhar a spec a partir do PRD, no formato de
  `docs/specs/README.md`, mas PARE e espere aprovação antes de codar.
- Não edite `.github/workflows/` nem `vercel.json` sem aprovação
  explícita, mesmo que estejam dentro do escopo da tarefa.

## Ritmo

- Não escreva código antes de um plano aprovado. Escreva o plano com
  tarefas numeradas, mostre e espere.
- "Pode implementar" NÃO autoriza o plano inteiro: execute UMA tarefa
  do plano, rode `rules/checks.md`, mostre o resultado, faça o commit
  e pare. A próxima tarefa só começa depois disso.
- Não relate sucesso parcial. Se um check falhou, a tarefa não terminou.

## Bancos

- Produção (projeto Supabase `emprestai`, ref `zawqxqukgaqjlbtwiogb`):
  NUNCA. Nem SQL, nem schema, nem dado, nem pelo painel, nem pelo
  Prisma. Migration em produção só acontece pelo GitHub Actions.
- Desenvolvimento (projeto Supabase de dev, separado do de produção,
  apontado por `DATABASE_URL` e `DIRECT_URL` no `.env.local`): só por
  `pnpm prisma migrate dev`, `pnpm prisma db seed` e pela aplicação.
  Nada de SQL à mão no painel. Nada de dado real.
- Testes: só Testcontainers. Nunca rode teste contra banco remoto,
  nem o de dev.

## Dados e segredos

- Não use dado real em seed, fixture, teste ou exemplo: nada de nome
  de pessoa, ativo, IP, setor ou e-mail real da empresa.
- Não leia `.env.local`. Não cole valor de variável de ambiente,
  token, chave ou connection string em resposta, commit, log ou PR.
- Não commite `.env*` (exceto `.env.example`) nem arquivo com segredo.

## Ferramentas

- Não silencie ferramenta: sem `eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`, `as any`, `test.skip`, `it.only`, nem afrouxar
  `tsconfig` ou regra de lint. Se for inevitável, justificativa na
  mesma linha e aprovação antes.

## Produção

- Não faça push na `main`. Trabalhe em branch e abra PR. Nunca faça
  merge.
- Não rode deploy nem altere configuração da Vercel.
- Não faça `git push --force` nem reescreva histórico já publicado.

## Precedência

- Se o código e uma spec discordarem sobre comportamento, a spec está
  certa até que alguém mude a spec.
- Se uma regra de procedimento contrariar um ADR ou uma spec, PARE e
  avise. Não escolha um dos dois por conta própria.
- "Pode ir" e "pode implementar" não revogam nada deste arquivo.
