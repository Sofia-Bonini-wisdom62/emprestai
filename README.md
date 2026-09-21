# emprestai

Sistema de suporte de TI (chamados e inventário de ativos). Projeto de disciplina, turma B.

## Decisões

- [ADR-001 — Stack da aplicação](docs/adr/001-stack.md)
- [Insumo do ADR (documento de trabalho)](stacks_H.md)

## Infraestrutura

| Item | Onde |
|---|---|
| Banco e Auth | Supabase, projeto `emprestai`, região `sa-east-1` |
| Hospedagem | Vercel, plano Hobby |
| CI | GitHub Actions |

Variáveis de ambiente: copie `.env.example` para `.env.local` e preencha. Nada com valor real vai para o repositório.
