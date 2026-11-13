# 004 — Plano

## Caminho

A mudança entra por duas tabelas novas (`loans` e `audit_events`), dois services (`src/server/services/equipment.ts` e `src/server/services/loan.ts`), dois routers (`equipment` e `loan`, no `appRouter`) e três telas no grupo `(product)`: `/catalog`, `/catalog/[equipmentId]` e `/my-loans`. A regra de negócio, do RN-03 ao RN-09, mora só em `loan.ts`, dentro de uma transação. Router e tela só repassam (ADR-001, 2.3; `AGENTS.md`, seção 8). Todo procedimento é `tenantProcedure`, e a área sai do contexto, nunca do input (ADR-001, 2.6 e 2.7; spec 001, RN-15).

## Propostas técnicas, aprovadas em 2026-11-12

A spec deixa pontos de "como" para o plano, e a revisão do `revisor-plano`, em 2026-11-12, achou dois conflitos entre documentos que só a pessoa resolve (propostas 4 e 5). A pessoa aprovou as cinco recomendações em 2026-11-12 ("Aprovo as cinco"). Elas estão na spec como RN-22 a RN-26; as alternativas ficam aqui como registro.

1. **Como a foto chega ao navegador.** A CSP da spec 001 (`src/server/csp.ts`) tem `img-src 'self' blob: data:`, e o ADR-002 proíbe o atributo `style` em todo componente, inclusive o que um componente de terceiro escreve (ADR-002, seção 2; `docs/layout.md`, seção 11).
   - Recomendado: `<img>` com `width="800"` e `height="600"` e a classe de tamanho, e a origem da `EQUIPMENT_IMAGES_BASE_URL` (proposta 2) acrescentada ao `img-src`, só quando a variável existe. O `<img>` dispara a regra `@next/next/no-img-element` do `eslint-config-next`; a exceção entra no `eslint.config.mjs`, com a justificativa ao lado, restrita aos arquivos do card e do detalhe (`AGENTS.md`, seção 8; `rules/restrictions.md`, Ferramentas, que pede aprovação antes). Muda a CSP da spec 001, e o `e2e/csp.e2e.ts` passa a cobrir o catálogo e o detalhe com foto.
   - Alternativa: `next/image`, que serve a foto pela `/_next/image`, de `'self'`, e deixa a CSP como está. Ele escreve `style` no `<img>` (`color:transparent`, e posição e tamanho com `fill`), o que o ADR-002 proíbe; entraria só com um ADR novo.
2. **De onde sai a URL pública, e o que o dev e o E2E mostram.** A spec 003 guarda só o nome do objeto (`image_object`), e o ADR-011 (Proposto) deixa para a spec do catálogo de onde vêm as fotos no dev. O dev e a pilha do E2E não têm Storage (ADR-004, ADR-006).
   - Recomendado: variável de servidor nova, `EQUIPMENT_IMAGES_BASE_URL`, opcional, sem segredo, lida só em `src/env/`. Em Production, a URL pública do bucket, cadastrada pela pessoa. Vazia, a API devolve `imageUrl: null`, e a tela mostra o ícone da categoria (resposta 46). No `.env.local` ela fica vazia, e o dev mostra ícones: nada no dev lê o projeto de produção, nem o bucket público. No E2E, o `globalSetup` de `tests/e2e/` sobe um servidor HTTP local que serve um JPEG fictício de 800×600 para qualquer objeto, e a variável aponta para ele; assim o CA-08 é provado no navegador, com a CSP ligada.
   - Alternativa: derivar da `NEXT_PUBLIC_SUPABASE_URL`. No dev ela é o gateway local, que não serve Storage, e toda foto sairia quebrada.
3. **Como `audit_events` fica append-only.** A aplicação conecta como `postgres`, dono das tabelas (`AGENTS.md`, seção 8). Um `REVOKE` do dono não segura, porque o dono pode dar a permissão de volta.
   - Recomendado: um trigger `BEFORE UPDATE OR DELETE` que levanta exceção, mais `REVOKE UPDATE, DELETE, TRUNCATE` de `anon` e `authenticated`. Trigger e função SQL pedem revisão humana (`rules/restrictions.md`, Bancos e schema): o DDL vai à pessoa antes da migration (`rules/migration.md`, passo 1).
   - Alternativa: só o `REVOKE`. Não protege do papel da aplicação.
4. **Paginação.** O ADR-001, seção 2.3, diz "Paginação de listas: Cursor, via `useInfiniteQuery`", e a spec aprovada dá `.input(z.void())` a `equipment.list` e a `loan.listMine`.
   - Recomendado: `equipment.list` paginado por cursor (`{ cursor?, limit }`, 24 por página, ordem por patrimônio), com `useInfiniteQuery`, porque o catálogo cresce com o cadastro. `loan.listMine` sem paginação, porque o RN-03 a limita a 3 linhas, lendo o ADR como "quando a lista pagina, é por cursor, nunca por offset". A spec passa a dizer isso no contrato.
   - Alternativas: cursor nas duas, que pagina uma lista de no máximo 3 linhas; ou nenhuma paginada, que deixa o catálogo sem limite.
5. **A landing de `/`.** O RN-23 desta spec tira a landing e redireciona `/` para `/catalog`, como o `docs/layout.md`, seção 6. O RN-33 da spec 001 permitia isso "até a spec do catálogo", mas o "Não pode mudar" da mesma spec 001, os AZ-05 e AZ-09 de `docs/andar-zero.md`, a verificação de `rules/tests.md` e o passo 5 da subida no `AGENTS.md` contam com a landing mostrando a saúde do banco.
   - Recomendado: a landing fica em `/`, e o RN-23 sai desta spec. Quem entra pelo login cai no catálogo (spec 001, RN-22), então o fluxo da prática não muda, e nenhum desses documentos precisa mudar. O redirecionamento vira item de "Fora de escopo", para quando a pessoa quiser trocar os critérios do andar zero.
   - Alternativa: manter o RN-23 e, na mesma tarefa, reescrever o "Não pode mudar" da spec 001, o AZ-05, o AZ-09, `rules/tests.md` e o `AGENTS.md`, levando a página de saúde para outra rota.

## Ordem

1. **Schema** (`loans` e `audit_events`). Vem primeiro porque os services e os testes de concorrência precisam do banco. Entram, numa migration só:
   - `loans`, com o índice único parcial `WHERE returned_at IS NULL` em `equipment_id`, índice em `(tenant_id, user_id)`, FK para `equipments` e `tenants`, RLS e a policy `loans_deny_all`;
   - `audit_events`, com RLS, a policy `audit_events_deny_all`, o trigger e a função da proposta 3.

   O DDL inteiro vai à pessoa antes do `migrate dev` (`rules/migration.md`, passo 1). O índice parcial, a RLS e o trigger saem em SQL bruto no `migration.sql`, porque o Prisma não os modela.
2. **Leitura dos equipamentos** (`equipment.list` e `equipment.byId`), com a variável da proposta 2 e o cursor da proposta 4. Vem antes do pedido, que reusa a forma do equipamento e a junção com `profiles` (o nome de quem pegou).
3. **Criar o empréstimo** (`loan.create`). A transação do RN-09: o `SELECT ... FOR UPDATE` no vínculo por `$queryRaw`, a contagem, o atraso, o `UPDATE` condicional, o `INSERT` do empréstimo e o da auditoria. A data prevista e o atraso usam um relógio injetado, que o teste fixa (CA-01, CA-04). A violação do índice parcial (erro `P2002` do Prisma) vira `EQUIPMENT_UNAVAILABLE`. O erro do driver não sai do service (`AGENTS.md`, seção 8).
4. **Empréstimos em aberto da pessoa** (`loan.listMine`) e o header: o contador e os links "Catálogo" e "Meus empréstimos" (RN-19).
5. **Catálogo** (`/catalog`): cards, crédito do Pexels, a CSP da proposta 1 com a exceção de lint, e o servidor de imagem fictícia do E2E (proposta 2). No mesmo commit, o `docs/layout.md` passa a desenhar a foto no card e no detalhe (resposta 46) e perde o "depende" do limite, que a resposta 40 fechou em 3. Se a proposta 5 for recusada, a landing sai aqui, e apagar `src/app/health-status.tsx` e `e2e/landing.e2e.ts` é pedir antes (`rules/operacao.md`).
6. **Detalhe e solicitar** (`/catalog/[equipmentId]`): a ficha, o card "Solicitar empréstimo", o diálogo de confirmação e o destino `/my-loans` com o aviso (RN-15 a RN-17).
7. **Meus empréstimos** (`/my-loans`): "Itens com você", sem "Devolver" (RN-18).
O fluxo de solicitar está entre os fluxos críticos do ADR-003, seção 2.8, então cada tarefa de tela (passos 4 a 7) traz o seu caso no Playwright, em `e2e/`, e roda `pnpm test:e2e` (`rules/checks.md`, passo 5). Na pilha efêmera, sem Storage, as fotos saem como ícone. Se a proposta 5 for recusada, os textos que ela lista mudam na T-05, porque a mudança de comportamento entra pela spec (`rules/spec-flow.md`, Ciclo de vida).

Componentes do shadcn/ui que entram, copiados para `src/components/ui/` sem dependência nova, porque o pacote `radix-ui` já está no `package.json`: `card.tsx`, `badge.tsx` e `alert-dialog.tsx`, na tarefa que primeiro usa cada um. Cada um passa pela conferência de `style` do `docs/layout.md`, seção 11, porque a CSP não tem `unsafe-inline`. O `Alert` do quadro de bloqueio também entra; se o primitivo escrever `style`, ele é ajustado ao ser copiado.

## Risco

- **Concorrência que o teste não reproduz.** Duas chamadas em sequência passam sem provar nada. Prova: CA-05 e CA-06 abrem duas transações em conexões separadas do Testcontainers e só deixam a primeira confirmar depois que a segunda chegou à trava, com uma barreira no teste, sem `sleep`.
- **`FOR UPDATE` atrás do pooler de produção.** O Supavisor em transaction mode mantém a trava enquanto a transação durar, e a do Prisma é interativa (`$transaction(async tx => ...)`), na mesma conexão. Prova: o CA-05 roda contra uma conexão `max: 1`, como a de produção (`.env.example`, `DATABASE_URL`).
- **A data prevista no fuso errado.** A Vercel roda em UTC. Um pedido às 22h de 12/11 em São Paulo já é 13/11 em UTC. Prova: o CA-01 fixa o relógio em 12/11/2026 às 22h30 de São Paulo e espera 26/11/2026.
- **A CSP nova abrir mais do que o bucket.** Prova: o `img-src` ganha só a origem da `EQUIPMENT_IMAGES_BASE_URL`, e sem a variável fica como hoje; o `e2e/csp.e2e.ts` confere os dois casos.
- **Componente do shadcn/ui que escreve `style`.** Prova: o `e2e/csp.e2e.ts` da spec 001 roda no catálogo e no detalhe, com foto (proposta 2), sem bloqueio no console.
- **A conta do professor ganhar empréstimo.** Nenhum teste e nenhum seed usam o e-mail dele (spec 003, RN-14). O teste da pessoa em produção usa outra conta (resposta 45).
- **A spec 003 mudar o nome de tabela ou coluna antes de ser implementada.** Esta spec lê `equipments`, `asset_tag`, `image_object` e `equipment_categories`. Prova: a T-01 só começa com a migration da 003 na `main`.

## Depende de

- **Spec 003 implementada**, com `equipments`, `equipment_categories` e os 12 equipamentos no seed do dev. Hoje ela está em rascunho, no PR #44.
- **Spec 002**, com o manifesto aprovado em `prisma/data/equipment-images.json`, para o seed gravar `image_object`. Sem ele, as fotos saem como ícone, e a tela funciona.
- A pessoa:
  - aprovar o DDL da T-01 antes do `migrate dev`;
  - a exceção de lint da proposta 1 já está aprovada com o plano (`rules/restrictions.md`, Ferramentas);
  - cadastrar `EQUIPMENT_IMAGES_BASE_URL` no ambiente Production da Vercel, antes do deploy da T-05. É painel, então só a pessoa faz (`rules/restrictions.md`, Produção);
  - fazer em produção o teste de no máximo um item, com uma conta de teste dela (resposta 45), e a conferência da seção 07 da prática.
