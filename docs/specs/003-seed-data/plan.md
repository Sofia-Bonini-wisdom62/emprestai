# 003 — Plano

## Caminho

A mudança entra pelo schema e por um módulo de carregamento em `prisma/`, fora do Next.
- A regra do RN-07 e do RN-08 mora num só módulo: o que criar, o que atualizar e o que recusar.
- Quem chama o módulo são dois pontos de entrada finos: o seed do dev e o script do passo de produção (ADR-013).

Não há router, service nem tela nesta spec. O catálogo é da spec 004.

## Ordem

**Decisão de 2026-11-16, sem imagem** (spec, "Regras"; ADR-014). Ela muda três coisas na ordem abaixo:
- um passo 1b entra entre o 1 e o 2: a migration `make_equipment_image_optional` deixa `equipments.image_object` aceitar nulo, e `imageUrlFor`, da spec 004, passa a devolver `null` para a imagem nula. Vem antes do 2, porque o carregamento grava nulo. O DDL vai para aprovação antes (`rules/migration.md`, passo 1);
- os passos 4 e 5 deixam de esperar o manifesto aprovado (spec 002, T-07). Sem ele, o seed e o passo de produção gravam os 12 com a imagem nula;
- quando o manifesto aprovado entrar, o deploy seguinte preenche as fotos, desde que elas já estejam no bucket.


1. **Schema.** A migration `add_equipment_tables` cria:
   - o enum `EquipmentStatus`;
   - `equipment_categories` e `equipments`, com `tenant_id`, as uniques do Contrato afetado, `ENABLE ROW LEVEL SECURITY` e uma policy `deny_all` por tabela, no mesmo padrão de `tenants`, `memberships` e `profiles` (ADR-001, seções 2.6 e 2.7; `rules/migration.md`).

   O `AGENTS.md`, seção 7, ganha `asset_tag` e `category` no glossário. Vem primeiro porque o resto grava nessas tabelas. Antes de gerar a migration, o DDL e o SQL da policy vão na resposta para aprovação (`rules/migration.md`, passo 1).
2. **Módulo de carregamento.** Recebe o banco e o conteúdo já lido dos dois arquivos. Faz duas coisas, sem ler o ambiente nem o disco:
   - valida o conjunto inteiro antes de gravar (RN-08);
   - numa transação, garante as cinco categorias e cria ou atualiza os equipamentos na `default` (RN-05 e RN-07).

   Vem antes dos pontos de entrada, que só o chamam. Ele reusa o formato e a conferência do manifesto da spec 002 (T-03 da 002), em vez de repetir a regra de "foto aprovada". Os testes usam a lista real de `prisma/data/equipment.json` e um manifesto fictício, com fotógrafos fictícios (spec 002, RN-11), porque o manifesto aprovado ainda não existe.
3. **Script do passo de produção.** Lê `DIRECT_URL` do ambiente, como o `prisma/first-admin.ts`. A exceção que o ADR-013 cita ainda não está escrita: `rules/secrets.md` a ganha nesta mesma tarefa, ao lado da do ADR-009. Lê os dois arquivos, chama o módulo e escreve no log só as contagens. Aceita os caminhos dos arquivos como argumentos, com os de `prisma/data/` por padrão, para o teste rodá-lo com o manifesto fictício, do jeito que o `first-admin.test.ts` roda o script dele. A conferência do CA-08 entra aqui: e-mail e senha nos arquivos de `prisma/`. A tarefa entrega também o texto do passo novo do `.github/workflows/production.yml`, depois de "Garante a área default e o primeiro administrador", só com o `DIRECT_URL`. A pessoa aplica o texto à mão, no momento do passo 5 (`rules/restrictions.md`, Escopo).
4. **Seed do dev.** O `prisma/seed.ts` chama o módulo depois da área `default` e da conta de Flávia Rocha. O CA-07 é provado no `pnpm test:e2e`, junto do `ca_13` de `e2e/seed.e2e.ts`, porque o Vitest não sobe o Auth. Pela decisão de 2026-11-16, não espera mais o manifesto aprovado (spec 002, T-07): sem ele, o seed grava os 12 com a imagem nula.
5. **Passo do workflow, pela pessoa.** Não é tarefa do agente nem tem CA próprio: o agente entrega o texto na T-03, e o passo só roda o script que o CA-09 prova. A pessoa o aplica à mão por último, porque:
   - pela decisão de 2026-11-16, sem o manifesto aprovado o passo grava os 12 com a imagem nula, em vez de travar o deploy (ADR-014);
   - o manifesto aprovado só entra no repositório depois de as fotos estarem no bucket: senão, o banco aponta para objetos que não abrem.

Fora desta ordem, a pessoa:
- envia as fotos pelo roteiro da spec 002 antes do passo 5;
- confere no painel o "Add user" e cria a conta do professor, a qualquer momento (resposta 35);
- depois do primeiro deploy com o passo, faz a conferência em produção da spec, com uma conta dela, e repete o deploy para provar que nada duplica.

## Risco

- **Um deploy travado por dado inválido.** O passo roda antes do deploy e falha alto (ADR-013). Prova: o CA-05 e o CA-09 no `pnpm test`, e, pela decisão de 2026-11-16, o manifesto só barra o deploy quando existe e não passa na conferência da spec 002.
- **O seed do dev e do E2E quebrarem antes do manifesto existir.** Pela decisão de 2026-11-16, eles gravam com a imagem nula. Prova: o CA-01 sem manifesto e o `pnpm test:e2e` no fim do passo 4.
- **A imagem nula quebrar a tela da spec 004.** Prova: o passo 1b ajusta `imageUrlFor`, com teste, e o `pnpm test` completo roda as specs da 004.
- **A rodada nova desfazer empréstimos da spec 004.** Prova: o CA-03, com o TI-0001 em `loaned`.
- **A migration nova mexer em tabela que já tem dado.** Não mexe: só cria tabelas e um enum. Prova: `pnpm test` do zero e `pnpm prisma migrate deploy` no dev (`rules/checks.md`, passo 4).
- **Dado real entrar no git.** Prova: o CA-08. O e-mail e a senha do professor não aparecem em nenhum arquivo, nem nos testes.
- **A tela não ter de onde montar a URL da imagem no dev**, que não tem Storage (ADR-004, ADR-006). Esta spec só guarda o nome do objeto (RN-04). De onde vem a base da URL, no dev e na produção, é decisão da spec do catálogo, a 004, e fica registrado aqui para ela não supor.

## Depende de

- Spec 002:
  - a T-03, para o formato e a conferência do manifesto, e a T-06, para `prisma/data/equipment.json`, antes do passo 2;
  - a T-07, para o manifesto aprovado. Pela decisão de 2026-11-16, ela só preenche as fotos, numa rodada depois dos passos 4 e 5, e deixa de bloqueá-los. A T-07 usa a chave do Pixabay da pessoa, que ela já tem.
- A pessoa:
  - aprovar o DDL do passo 1;
  - enviar as fotos ao bucket antes do merge do manifesto aprovado;
  - aplicar à mão o texto do passo 5 no workflow;
  - criar a conta do professor no painel.
- O ADR-011, ainda Proposto, para o bucket `equipment-images`.
