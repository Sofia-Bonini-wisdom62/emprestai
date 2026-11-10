# emprestai

Sistema web interno para controlar empréstimo de equipamentos. Projeto de disciplina, turma B.

## Estado atual

O andar zero está em andamento: existe o scaffold do Next.js e uma landing provisória, ainda sem banco, login nem telas do produto. Comandos para instalar, subir o banco e rodar: [AGENTS.md, seção 8](AGENTS.md).

## Documentos

- [PRD — Empréstimo de Equipamentos Internos](docs/PRD.md) — o que o negócio precisa. Não é spec.
- [Perguntas que o PRD não responde](docs/perguntas-prd.md) — enquanto houver pergunta aberta, a spec correspondente não é aprovada.
- [Formato de spec](docs/specs/README.md) — uma pasta por funcionalidade, com spec, plano e tarefas.
- [Layout](docs/layout.md) — tokens, componentes e telas. Requisitos derivados de um layout da turma, identidade própria.
- [Andar zero](docs/andar-zero.md) e [plano](docs/plan-andar-zero.md) — o esqueleto que prova a stack, esperando aprovação.

## Decisões

- [ADR-001 — Stack da aplicação](docs/adr/001-stack.md) — aceito em 2026-10-02. O texto é o de 2026-09-14; as correções estão no ADR-003.
- [ADR-002 — Sistema de design](docs/adr/002-design-system.md) — proposto: só escuro, índigo, Geist, densidade arejada.
- [ADR-004 — Ambientes e bancos](docs/adr/004-environments.md) — aceito: dev em Postgres local no Docker, testes no Testcontainers, preview sem banco, produção no Supabase só pelo CI.
- [ADR-005 — Nome do primeiro tenant](docs/adr/005-first-tenant-name.md) — aceito: `default`, no lugar de `operations`, que é o nome do papel.
- [ADR-003 — Correções do ADR-001](docs/adr/003-stack-corrections.md) — aceito: produto do PRD, motivo da multi-tenancy, nomes do Prisma 7, do Supabase e do Next 16, e o fim da menção a Figma. Nenhuma escolha de stack muda.
- [Insumo do ADR](stacks_H.md) — documento de trabalho, congelado antes de o PRD entrar. Não copie nada dele.

## Para agentes

- [AGENTS.md](AGENTS.md) — como trabalhar neste repositório.
- [rules/](rules/) — o que não fazer, o que conta como pronto e os procedimentos por gatilho.

## Infraestrutura

| Item | Valor |
|---|---|
| GitHub | `Sofia-Bonini-wisdom62/emprestai`, privado |
| Supabase (produção e Auth) | Projeto `emprestai`, ref `zawqxqukgaqjlbtwiogb`, região `sa-east-1`, plano free. **Pausado por inatividade**: a reativação é manual, no painel, por uma pessoa — https://supabase.com/dashboard/project/zawqxqukgaqjlbtwiogb |
| Banco de dev | Postgres local em Docker, pelo `compose.yaml` ([ADR-004](docs/adr/004-environments.md)); não há projeto Supabase de dev |
| Vercel | Projeto `emprestai`, id `prj_ZazuIw4JaAibAjyNU49xkwo4tMr2`, plano Hobby, functions nos EUA. URL de produção reservada: https://emprestai-beta.vercel.app |
| CI | GitHub Actions, em `.github/workflows/`. O `ci.yml` roda lint, typecheck, testes e build em todo PR. O `production.yml`, a cada push na `main`, roda o CI, o `prisma migrate deploy` e o Deploy Hook da Vercel, nessa ordem, porque o `vercel.json` desliga o deploy por push na `main`. Secrets do repositório: `DIRECT_URL` e `VERCEL_DEPLOY_HOOK_URL` |

Variáveis de ambiente: copie `.env.example` para `.env.local` e preencha. A lista completa, e onde cada uma vive, está no próprio `.env.example`. Nada com valor real vai para o repositório.

## Configuração do operador

Para a pessoa, não para o agente: ele não escolhe o próprio modelo.

| Fase | Modelo / raciocínio |
|---|---|
| Escrever a spec e o plano | raciocínio alto |
| Executar uma tarefa já decidida | rápido |
| Debugar o que quebrou | raciocínio alto |
| Revisar o diff | padrão |

- Revisão de diff em sessão limpa e, de preferência, com modelo diferente do que escreveu.
- Sessão longa não se corrige com regra mais enfática: encerre com handoff e abra outra.

## Pendência

A multi-tenancy do ADR-001 é decisão deliberada do time (ADR-003, seção 1), não exigência do PRD. Ela depende da pergunta 6 de [`docs/perguntas-prd.md`](docs/perguntas-prd.md): se Operações for papel global, a multi-tenancy sai inteira e a saída vira um ADR novo.
