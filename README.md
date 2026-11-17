# emprestai

Sistema web interno para controlar empréstimo de equipamentos. Projeto de disciplina, turma B.

## Estado atual

Conferido na `main` em 2026-11-16, no commit `3bb897b`; a linha dos equipamentos em produção, em 2026-11-17, no commit `f64483a`.

- O andar zero está fechado (tag `andar-zero`), e a produção é publicada pelo GitHub Actions a cada push na `main`.
- Já existem o login, com "Esqueci minha senha" e a primeira entrada pelo link do convite, o catálogo, o detalhe do equipamento com "Solicitar empréstimo" e a tela "Meus empréstimos".
- Ainda não existem a devolução, a tela de Operações com os empréstimos em aberto, que hoje é uma página provisória, nem o cadastro de equipamentos. Nenhum dos três tem spec.
- As fotos dos equipamentos ainda não têm manifesto aprovado no repositório: sem foto, o catálogo mostra o ícone da categoria.
- Os 12 equipamentos iniciais estão em produção, sem foto: o passo do workflow que os carrega entrou em 2026-11-17, e a primeira rodada com ele registrou "12 criados" no log.

Comandos para instalar, subir o banco e rodar: [AGENTS.md, seção 8](AGENTS.md).

## Documentos

- [PRD — Empréstimo de Equipamentos Internos](docs/PRD.md) — o que o negócio precisa. Não é spec.
- [Perguntas que o PRD não responde](docs/perguntas-prd.md) — enquanto houver pergunta aberta, a spec correspondente não é aprovada.
- [Formato de spec](docs/specs/README.md) — uma pasta por funcionalidade, com spec, plano e tarefas.
- Specs: [001 — Login](docs/specs/001-login/spec.md), [002 — Imagens dos equipamentos](docs/specs/002-equipment-images/spec.md), [003 — Dados iniciais](docs/specs/003-seed-data/spec.md) e [004 — Solicitar empréstimo](docs/specs/004-loan-request/spec.md). O estado de cada uma está na linha `Status` do `spec.md`, e o das tarefas, no `tasks.md` da mesma pasta.
- [Layout](docs/layout.md) — tokens, componentes e telas. Requisitos derivados de um layout da turma, identidade própria.
- [Andar zero](docs/andar-zero.md) e [plano](docs/plan-andar-zero.md) — o esqueleto que prova a stack, fechado na tag `andar-zero`.

## Decisões

O status de cada ADR é o da linha de Status do próprio arquivo, lida em 2026-11-16.

- [ADR-001 — Stack da aplicação](docs/adr/001-stack.md) — aceito em 2026-10-02. O texto é o de 2026-09-14; as correções estão no ADR-003.
- [ADR-002 — Sistema de design](docs/adr/002-design-system.md) — aceito em 2026-11-11: só escuro, índigo, Geist, densidade arejada.
- [ADR-003 — Correções do ADR-001](docs/adr/003-stack-corrections.md) — aceito: produto do PRD, motivo da multi-tenancy, nomes do Prisma 7, do Supabase e do Next 16, e o fim da menção a Figma. Nenhuma escolha de stack muda.
- [ADR-004 — Ambientes e bancos](docs/adr/004-environments.md) — aceito: dev em Postgres local no Docker, testes no Testcontainers, preview sem banco, produção no Supabase só pelo CI.
- [ADR-005 — Nome do primeiro tenant](docs/adr/005-first-tenant-name.md) — aceito: `default`, no lugar de `operations`, que é o nome do papel.
- [ADR-006 — Auth no desenvolvimento](docs/adr/006-dev-auth.md) — aceito em 2026-11-11: Supabase Auth em contêiner, com o gateway Envoy, no `compose.yaml`.
- [ADR-007 — Deploy de produção pela CLI](docs/adr/007-production-deploy-cli.md) — aceito em 2026-11-11: a CLI da Vercel publica depois da migration, no lugar do Deploy Hook do ADR-004.
- [ADR-008 — Provedor de e-mail do Supabase Auth](docs/adr/008-email-provider.md) — proposto em 2026-11-11: a pessoa escolheu o SMTP do Gmail numa conta só do projeto, sem custo. Falta a conferência da seção 7 para virar Aceito.
- [ADR-009 — Primeiro administrador em produção](docs/adr/009-production-first-admin.md) — aceito em 2026-11-11: um passo do workflow de produção cria a área `default` e dá o papel de Operações à conta do secret `FIRST_ADMIN_EMAIL`.
- [ADR-010 — Auditoria a partir da spec de solicitar empréstimo](docs/adr/010-audit-from-loans.md) — aceito em 2026-11-11: a auditoria começa com a spec de solicitar empréstimo, no lugar do "desde o início" do ADR-001.
- [ADR-011 — Imagens dos equipamentos](docs/adr/011-equipment-images.md) — proposto: fotos do Pixabay recortadas em 800×600 com o `sharp`, bucket público no Storage de produção, criado e alimentado pela pessoa, e o bloqueio que impede o agente de publicar.
- [ADR-012 — Nonce da CSP para os estilos do Radix](docs/adr/012-csp-nonce-radix.md) — aceito em 2026-11-12: o `get-nonce` passa o nonce aos estilos que o Radix injeta, e a CSP segue sem `unsafe-inline`.
- [ADR-013 — Equipamentos iniciais em produção](docs/adr/013-production-equipment-data.md) — aceito em 2026-11-12: um passo do workflow de produção grava as categorias e os equipamentos iniciais.
- [ADR-014 — Equipamentos iniciais sem imagem](docs/adr/014-equipment-without-image.md) — aceito em 2026-11-16: patrimônio sem foto aprovada grava a imagem nula, em vez de travar o carregamento.
- [ADR-015 — Conta do professor fora do convite](docs/adr/015-professor-account.md) — aceito em 2026-11-17: a conta do professor, e só ela, é criada pela pessoa no painel do Supabase de produção, e não por convite. Todo outro cadastro continua só por convite.
- [Insumo do ADR](stacks_H.md) — documento de trabalho, congelado antes de o PRD entrar. Não copie nada dele.

## Para agentes

- [AGENTS.md](AGENTS.md) — como trabalhar neste repositório.
- [rules/](rules/) — o que não fazer, o que conta como pronto e os procedimentos por gatilho.
- [.claude/](.claude/) — os subagentes `revisor-plano` e `verificador-spec`, a skill `imagens-equipamentos`, e os hooks e o `settings.json` do bloqueio de produção, que só a pessoa edita.

## Infraestrutura

O que depende de painel fica dito como tal: o repositório e o GitHub Actions só provam o que a última rodada fez.

| Item | Valor |
|---|---|
| GitHub | `Sofia-Bonini-wisdom62/emprestai`, público (`gh repo view`, em 2026-11-16) |
| Supabase (produção e Auth) | Projeto `emprestai`, ref `zawqxqukgaqjlbtwiogb`, região `sa-east-1`, plano free. A rodada de Produção de 2026-11-16, no commit `3bb897b`, falou com o banco: nenhuma migration pendente e o vínculo do primeiro administrador garantido. No plano free, projeto ocioso pode ser pausado (ADR-001): o estado de agora só o painel diz, e quem confere é a pessoa — https://supabase.com/dashboard/project/zawqxqukgaqjlbtwiogb |
| Banco de dev | Postgres local em Docker, com o Supabase Auth e o gateway Envoy ao lado, pelo `compose.yaml` ([ADR-004](docs/adr/004-environments.md) e [ADR-006](docs/adr/006-dev-auth.md)); não há projeto Supabase de dev |
| Vercel | Projeto `emprestai`, id `prj_ZazuIw4JaAibAjyNU49xkwo4tMr2`, plano Hobby, functions nos EUA. URL de produção: https://emprestai-beta.vercel.app, o alias que a CLI da Vercel deu ao deploy dessa mesma rodada |
| CI | GitHub Actions, em `.github/workflows/`. O `ci.yml` roda lint, typecheck, testes e build em todo PR; o E2E não roda no CI. O `production.yml`, a cada push na `main`, roda o CI, o `prisma migrate deploy`, o passo do primeiro administrador (ADR-009), o passo dos equipamentos iniciais (ADR-013) e o deploy pela CLI da Vercel, nessa ordem, porque o `vercel.json` desliga o deploy por push na `main` (ADR-004 e ADR-007). Secrets que o `production.yml` usa: `DIRECT_URL`, `FIRST_ADMIN_EMAIL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` |

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

## Multi-tenancy

A multi-tenancy do ADR-001 é decisão deliberada do time (ADR-003, seção 1), não exigência do PRD. A pergunta 6 de [`docs/perguntas-prd.md`](docs/perguntas-prd.md) foi respondida em 2026-11-09: o papel de Operações vale por área, então ela fica. Antes da resposta, a regra era: se Operações fosse papel global, a multi-tenancy sairia inteira e a saída viraria um ADR novo.
