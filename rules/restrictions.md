---
description: O que o agente não pode fazer neste projeto
globs: []
alwaysApply: true
---

# O que não fazer
> leitor: agente

## Autoridade

- Não decida ADR. Decisão nova: rascunhe `docs/adr/00N-<assunto>.md`
  com a decisão e as alternativas, e PARE. Quem aprova é o time.
- Não edite ADR aceito. Correção, errata ou decisão nova vira ADR novo,
  que diz quais trechos substitui; no antigo, só a linha de Status muda,
  para apontar o novo. ADR com status Proposto ainda pode ser editado.
- Não contrarie o que está em docs/adr/. Se precisar contrariar, pare.
- Não responda por conta própria o que o PRD ([`docs/PRD.md`](../docs/PRD.md))
  deixou ambíguo. Liste as perguntas em `docs/perguntas-prd.md` e espere.
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
  explícita, mesmo que estejam dentro do escopo da tarefa. São
  arquivos do repositório: com um "pode mudar o workflow", pode.

## Ritmo

- Não escreva código antes de um plano aprovado. Escreva o plano com
  tarefas numeradas, mostre e espere.
- "Pode implementar" NÃO autoriza o plano inteiro: execute UMA tarefa
  do plano, rode `rules/checks.md`, mostre o resultado, faça o commit
  e pare. A próxima tarefa só começa depois disso.
- Não relate sucesso parcial. Se um check falhou, a tarefa não terminou.

## Bancos e schema

- Produção (projeto Supabase `emprestai`, ref `zawqxqukgaqjlbtwiogb`):
  NUNCA. Nem SQL, nem schema, nem dado, nem pelo painel, nem pelo
  Prisma. Migration em produção só acontece pelo GitHub Actions.
- Desenvolvimento (Postgres local em Docker, subido por `docker compose`
  a partir do `compose.yaml` e apontado por `DATABASE_URL` e `DIRECT_URL`
  no `.env.local`; ADR-004): só por `pnpm prisma migrate dev`,
  `pnpm prisma migrate reset`, `pnpm prisma migrate deploy`,
  `pnpm prisma db seed` e pela aplicação. Nada de SQL à mão. Nada de dado
  real. Enquanto o `compose.yaml` não existir ou o Docker estiver parado,
  o passo que depende dele é declarado pulado.
- Preview da Vercel: sem banco. Nunca ponha no ambiente Preview a URL
  do banco de produção (`DATABASE_URL`, `DIRECT_URL`) nem a
  `SUPABASE_SECRET_KEY`. No `.env.local`, também nunca a
  `SUPABASE_SECRET_KEY` nem a URL do banco de produção.
- Testes: só Testcontainers. Nunca rode teste contra banco remoto,
  nem o de dev.
- O banco local é só o Postgres do `compose.yaml`, sem Supabase CLI:
  nada de `supabase start`, `supabase db reset` nem
  `supabase migration new`.
- Não edite migration já aplicada em `prisma/migrations/`. Mudança de
  schema é sempre migration nova.
- Não altere policy de RLS, trigger, função SQL nem a tabela de
  auditoria sem revisão humana explícita, mesmo em migration nova.
- Não mocke o Prisma em teste: isso testa o mock, não o banco.

## Dados e segredos

- Não use dado real em seed, fixture, teste ou exemplo: nada de nome
  de pessoa, número de patrimônio, e-mail ou área real da empresa.
- Não leia nem escreva `.env.local`. Variável nova entra no
  `.env.example` com placeholder, e você avisa qual valor falta.
- Não cole valor de variável de ambiente, token, chave ou connection
  string em resposta, commit, log ou PR.
- Não commite `.env*` (exceto `.env.example`) nem arquivo com segredo.

## Ferramentas

- Não silencie ferramenta: sem `eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`, `as any`, `test.skip`, `it.only`, nem afrouxar
  `tsconfig` ou regra de lint. Se for inevitável, aprovação antes; a
  exceção entra na configuração do lint ou do `tsconfig`, com a
  justificativa ao lado, e não num comentário na linha, que o lint
  ignora a partir da T1 do andar zero.

## Produção

- Não faça push na `main`. Trabalhe em branch e abra PR. Nunca faça
  merge.
- Não faça `git push --force` nem reescreva histórico já publicado.
- Painel e API da Vercel, do Supabase e do GitHub: nunca por sua
  iniciativa. Deploy, variável de ambiente, configuração de projeto,
  secret de Actions e branch de produção só se a pessoa pedir aquela
  mudança, nesta conversa. "Pode implementar" não é esse pedido.
  Isto não contradiz a regra de Escopo sobre `.github/workflows/` e
  `vercel.json`: aqueles são arquivos versionados, isto é o painel.

## Precedência

- Se o código e uma spec discordarem sobre comportamento, a spec está
  certa até que alguém mude a spec.
- Se uma regra de procedimento contrariar um ADR ou uma spec, PARE e
  avise. Não escolha um dos dois por conta própria.
- "Pode ir" e "pode implementar" não revogam nada deste arquivo.
