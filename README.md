# emprestai

Sistema web interno para controlar empréstimo de equipamentos. Projeto de disciplina, turma B.

## Estado atual

Não existe código de aplicação, `package.json`, `src/`, `prisma/`, migration nem teste. Hoje o repositório é só documento e regra: PRD, ADR, perguntas em aberto, formato de spec e `rules/`. O inventário completo e o que falta estão em [AGENTS.md, seção Estado atual](AGENTS.md).

## Documentos

- [PRD — Empréstimo de Equipamentos Internos](docs/PRD.md) — o que o negócio precisa. Não é spec.
- [Perguntas que o PRD não responde](docs/perguntas-prd.md) — enquanto houver pergunta aberta, a spec correspondente não é aprovada.
- [Formato de spec](docs/specs/README.md) — uma pasta por funcionalidade, com spec, plano e tarefas.
- [Layout](docs/layout.md) — tokens, componentes e telas. Requisitos derivados de um layout da turma, identidade própria.
- [Andar zero](docs/andar-zero.md) e [plano](docs/plan-andar-zero.md) — o esqueleto que prova a stack, esperando aprovação.

## Decisões

- [ADR-001 — Stack da aplicação](docs/adr/001-stack.md) — aceito em 2026-10-02. O texto é o de 2026-09-14; as correções estão no ADR-003.
- [ADR-002 — Sistema de design](docs/adr/002-design-system.md) — proposto: só escuro, índigo, Geist, densidade arejada.
- [ADR-003 — Correções do ADR-001](docs/adr/003-stack-corrections.md) — aceito: produto do PRD, motivo da multi-tenancy, nomes do Prisma 7, do Supabase e do Next 16, e o fim da menção a Figma. Nenhuma escolha de stack muda.
- [Insumo do ADR](stacks_H.md) — documento de trabalho, congelado antes de o PRD entrar. Não copie nada dele.

## Para agentes

- [AGENTS.md](AGENTS.md) — como trabalhar neste repositório.
- [rules/](rules/) — o que não fazer, o que conta como pronto e os procedimentos por gatilho.

## Infraestrutura

| Item | Onde |
|---|---|
| Banco e Auth | Supabase, projeto `emprestai`, região `sa-east-1`. Pausado por inatividade no plano gratuito |
| Hospedagem | Vercel, plano Hobby. URL reservada https://emprestai-beta.vercel.app, que responde 404 enquanto não houver aplicação |
| CI | GitHub Actions. O workflow ainda não existe |

Variáveis de ambiente: copie `.env.example` para `.env.local` e preencha. Nada com valor real vai para o repositório.

## Pendência

A multi-tenancy do ADR-001 é decisão deliberada do time (ADR-003, seção 1), não exigência do PRD. Ela depende da pergunta 6 de [`docs/perguntas-prd.md`](docs/perguntas-prd.md): se Operações for papel global, a multi-tenancy sai inteira e a saída vira um ADR novo.
