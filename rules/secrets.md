---
description: Onde cada variável de ambiente vive e qual chave usar
globs: ["**/.env*", "src/env/**", "prisma.config.ts", "next.config.*"]
alwaysApply: false
---

# Variáveis de ambiente e chaves
> leitor: agente

## Quando
Ao criar, renomear ou ler variável de ambiente, e ao instanciar cliente Supabase
ou Prisma. Os nomes exatos e o que cada um significa estão em `.env.example`.

## Procedimento
1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é pública por design: quem protege o
   dado é a policy de RLS, não a chave. `SUPABASE_SECRET_KEY` bypassa RLS e só
   aparece em módulo que começa com `import 'server-only'`.
2. Quando o andar zero existir, o schema Zod nasce dividido em três: `src/env/server.ts` (com
   `import 'server-only'`), `src/env/client.ts` (só as `NEXT_PUBLIC_`, cada uma
   mapeada literalmente — `process.env.NEXT_PUBLIC_X`, senão o Next não inlina)
   e `src/env/runtime.ts` (derivados das `VERCEL_*`). O schema do servidor fica
   em `src/env/schema.ts`, sem `server-only`, para o `next.config.ts` validar
   no build e no dev.
3. Variável nova entra no `.env.example` (versionado, com placeholder) e, por
   padrão, no `.env.local` (máquina) e no painel da Vercel (production e
   preview). Exceção fica escrita ao lado da variável, na linha `onde:` do
   `.env.example` (ex.: `DIRECT_URL` não vai para a Vercel; os ambientes estão
   no ADR-004). Edite o `.env.example` e DECLARE na resposta o que falta a
   pessoa fazer no `.env.local` e no painel. Variável na Vercel não se mexe por sua iniciativa,
   mesmo que você tenha a ferramenta: `rules/restrictions.md`, seção Produção.

## Verificação
Busca por `SUPABASE_SECRET_KEY` em código que vai ao navegador (`"use client"`,
`src/components/**`, `src/env/client.ts`) não retorna nada; e `.env.example`
tem toda chave que o projeto usa, sem nenhum valor real. Enquanto não houver
`src/`, a busca passa por vacuidade: não a apresente como evidência.

## Não faça
- Não dê prefixo `NEXT_PUBLIC_` a segredo, nem leia `process.env` fora de `src/env/`.
  Exceção: `prisma.config.ts`, que o ADR-003, 2.5, manda ler `DIRECT_URL` direto.
- Proibições sobre `.env.local`, segredo em log ou PR e painel de provedor: `rules/restrictions.md`.
