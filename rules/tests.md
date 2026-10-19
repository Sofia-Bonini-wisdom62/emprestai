---
description: Como se escreve teste aqui, ao criar ou alterar teste, procedure, service ou policy
globs: ["**/*.test.ts", "**/*.test.tsx", "tests/**", "vitest.config.*", "playwright.config.*"]
alwaysApply: false
---

# Como se testa aqui
> leitor: agente

## Quando
Ao criar ou alterar um teste, um procedure tRPC, um service ou uma migration
que mexe em policy de RLS.

## Procedimento
1. Procedure tRPC: `createCaller` com o contexto montado à mão (sessão, tenant,
   role), passando pelos middlewares. Sem subir HTTP.
2. Integração: Postgres real do Testcontainers, imagem `supabase/postgres` —
   ela traz o schema `auth` e os roles que as policies referenciam. O
   `globalSetup` vai aplicar as migrations reais e entregar a URI do container
   aos testes por `provide`/`inject` do Vitest.
3. Toda tabela protegida por policy chega com um teste que prova o bloqueio: o
   mesmo dado, consultado com o usuário errado, não retorna. Esse teste não
   pode usar banco mocado — a coisa sob teste é a policy.
4. O caso de isolamento entre tenants, com o escopo que o ADR-001 define na
   seção 2.8: tenant A não lê nem altera dado de tenant B.
5. O nome do caso cita o critério que ele prova, no formato `ca_03`, no nome da
   função ou do `it`. O critério vem da spec em `docs/specs/`;
   nenhuma existe ainda, a primeira nasce por `rules/spec-flow.md`.
6. Teste de endpoint verifica status E corpo. Status sozinho não prova nada.

## Verificação
`pnpm test` passa com o Docker de pé. O script nasce com o scaffold do app;
enquanto ele não existir, isto é especificação, não check já rodado. O resto do
fim de tarefa está em `rules/checks.md`.

## Não faça
- Mock do Prisma, banco onde o teste pode rodar e Supabase CLI:
  `rules/restrictions.md`, seção Bancos e schema.
