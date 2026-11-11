# ADR-007 — Deploy de produção pela CLI da Vercel

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-11-11, pela pessoa, que responde pelo time. A primeira rodada pela CLI, em 2026-11-11, publicou a produção e confirmou os dois pontos da seção 4: o `git.deploymentEnabled` não barra o deploy pela CLI, e o build remoto usa as variáveis de Production |
| Data | 2026-11-10 |
| Turma | B |
| Vínculo | [ADR-004](004-environments.md), seção 2, itens "Produção só pelo CI" e "Caminho de uma mudança"; `.github/workflows/production.yml` |
| Substitui | No ADR-004, seção 2, só o trecho "o deploy de produção sai do Deploy Hook depois do `prisma migrate deploy`" e o último passo do caminho, "Deploy Hook publica". A ordem migration → deploy e o `vercel.json` continuam como o ADR-004 decidiu |
| Decide | Como o GitHub Actions publica a produção depois da migration |

---

## 1. Contexto

O ADR-004 pôs a migration antes do deploy, para o código novo nunca rodar antes do schema novo. Para isso, o `vercel.json` desliga o deploy por push na `main` (`git.deploymentEnabled.main: false`), e o workflow de produção chama um Deploy Hook da Vercel depois do `prisma migrate deploy`.

A primeira rodada de produção, em 2026-11-10, depois do merge do PR #12, mostrou que esse desenho não publica:

- o workflow terminou verde e aplicou as duas migrations no Supabase;
- a chamada ao Deploy Hook voltou sem erro;
- a Vercel não criou deploy nenhum, e a produção seguiu em 404.

A documentação da Vercel diz que o Deploy Hook não dispara quando o `vercel.json` tem `github.enabled = false`, opção que o `git.deploymentEnabled` substituiu. Tudo indica que a regra vale para as duas: a mesma linha que desliga o deploy por push desliga o hook. O que a ordem do ADR-004 pede, desligar o push e publicar pelo hook, não funciona junto.

---

## 2. Decisão

O workflow de produção publica pela CLI da Vercel, rodada no próprio job, depois da migration. O `vercel.json` não muda.

| Item | Escolha |
|---|---|
| Ferramenta | CLI `vercel`, versão exata fixada no workflow (`pnpm dlx vercel@<versão>`). Só roda no CI: não entra no `package.json` nem no lockfile |
| Comando | `vercel deploy --prod`, com o código do commit da rodada. O build roda na Vercel, com as variáveis de Production que já estão lá |
| Credenciais | Três secrets do repositório: `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`. O token tem validade e só existe no passo do deploy |
| Ordem | Igual à do ADR-004: CI → `prisma migrate deploy` → deploy. Se a migration falha, o deploy não roda |
| Rodada atrasada | Se a `main` já andou quando a rodada chega ao deploy, ela só migra e deixa o deploy para a do commit mais novo, como já fazia com o hook |
| Deploy Hook | Sai. Depois que este ADR for aceito e a primeira rodada pela CLI publicar, a pessoa apaga o hook `producao` na Vercel e o secret `VERCEL_DEPLOY_HOOK_URL` no GitHub |

- **Por que a CLI escapa do `vercel.json`** — o `git.deploymentEnabled` vale para os deploys que a integração com o Git cria. O deploy pela CLI é um envio direto de arquivos, então o push continua desligado e a ordem continua nas mãos do workflow.
- **Por que o build fica na Vercel** — com `vercel build` no runner, a `DATABASE_URL` de produção teria de descer para o runner. Com o build remoto, ela fica só na Vercel, como hoje.
- **Por que a rodada atrasada continua só migrando** — a CLI publica o commit da rodada, não a ponta da `main`. Sem essa checagem, reexecutar uma rodada antiga publicaria código antigo por cima do novo.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Tirar `main: false` do `vercel.json` e deixar a Vercel publicar a cada push na `main` | A Vercel compila ao mesmo tempo que o workflow migra, e o código novo pode ir ao ar antes do schema novo: perde a garantia que motivou o ADR-004 |
| Manter o hook e mudar o `vercel.json` para `ignoreCommand` em vez de `deploymentEnabled` | O comando não tem como saber se o build veio do push ou do hook; desligaria os dois ou nenhum |
| `vercel build` no runner e `vercel deploy --prebuilt` | A `DATABASE_URL` de produção desceria para o runner do GitHub, e o build deixaria de ser o mesmo que a Vercel faz nos previews |
| Disparo manual do deploy no painel depois de cada merge | Depende de alguém lembrar; o ADR-004 quer produção só pelo CI |

---

## 4. Consequências

### Fica mais fácil

- A produção publica de fato, com a ordem do ADR-004.
- O deploy fica preso ao commit da rodada, não à ponta da `main` no momento do disparo.
- O log do deploy, com a URL publicada, aparece no próprio log do Actions.

### Fica mais difícil

- Três secrets em vez de um, e um deles, o `VERCEL_TOKEN`, dá acesso à conta da Vercel. Ele precisa ter validade, e trocá-lo é tarefa recorrente da pessoa.
- A CLI é mais uma peça com versão: atualizar a versão fixada no workflow é decisão, não automática.
- A primeira rodada precisa confirmar duas coisas que a documentação não garante por escrito: que o `git.deploymentEnabled` não barra o deploy pela CLI, e que o build remoto usa as variáveis de Production.

### O que isso impede de fazer depois sem custo

- Publicar a produção sem passar pelo Actions: quem não tem os secrets só publica pelo painel, o que o ADR-004 já não quer.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A primeira rodada pela CLI não cria o deploy, ou cria com as variáveis erradas | A CLI como caminho de publicação |
| A Vercel passa a aceitar o hook com `git.deploymentEnabled` desligado | A volta do hook, com um secret só |
| O token da Vercel vence ou vaza | O secret `VERCEL_TOKEN`, que precisa ser trocado |

---

## 6. O que este ADR não decide

- O gatilho do workflow, que continua o push na `main` (ADR-004, seção 6).
- Rollback de produção: continua pelo painel da Vercel, a pedido da pessoa.
- Domínio próprio e alias de produção.
