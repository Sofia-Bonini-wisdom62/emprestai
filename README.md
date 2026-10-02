# emprestai

Sistema web interno para controlar empréstimo de equipamentos. Projeto de disciplina, turma B.

> O ADR-001 ainda descreve outro domínio (suporte de TI, chamados, multi-tenancy). Ver a seção
> "Pendência" no fim deste arquivo.

## Documentos

- [PRD — Empréstimo de Equipamentos Internos](docs/PRD.md) — o que o negócio precisa. Não é spec.

## Decisões

- [ADR-001 — Stack da aplicação](docs/adr/001-stack.md)
- [Insumo do ADR (documento de trabalho)](stacks_H.md)
- [AGENTS.md — como trabalhar neste repositório](AGENTS.md)

## Infraestrutura

| Item | Onde |
|---|---|
| Banco e Auth | Supabase, projeto `emprestai`, região `sa-east-1` |
| Hospedagem | Vercel, plano Hobby, produção em https://emprestai-beta.vercel.app |
| CI | GitHub Actions |

Variáveis de ambiente: copie `.env.example` para `.env.local` e preencha. Nada com valor real vai para o repositório.

## Pendência

O ADR-001 foi escrito antes de o PRD entrar no repositório e descreve, no Contexto, um sistema de
suporte de TI com multi-tenancy. O PRD descreve empréstimo de equipamentos, com dois papéis numa
empresa só e nenhuma exigência de multi-tenancy. As decisões de stack do ADR seguem válidas; o
Contexto e a seção de multi-tenancy precisam da decisão do time antes da primeira spec.
