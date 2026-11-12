# ADR-011 — Imagens dos equipamentos: Pexels, Storage e envio pela pessoa

| Campo | Valor |
|---|---|
| Status | Proposto |
| Data | 2026-11-11 |
| Turma | B |
| Vínculo | [`docs/specs/002-equipment-images/spec.md`](../specs/002-equipment-images/spec.md); Entrega 2 da prática, contrato da skill `imagens-equipamentos` |
| Substitui | Nenhum trecho de ADR: o [ADR-001](001-stack.md) não decide integração de imagem nem Storage. Ao aceitar, mudam duas rules: em [`rules/restrictions.md`](../../rules/restrictions.md), seção Escopo, e em [`rules/operacao.md`](../../rules/operacao.md), linha dos workflows, `.github/workflows/` e `.claude/settings.json` passam a ser editados pela pessoa, à mão, a partir do texto que o agente prepara; o `vercel.json` continua "pedir antes" |
| Decide | De onde vêm as fotos dos equipamentos, onde ficam, quem as publica e como o agente fica impedido de publicá-las |

---

## 1. Contexto

A prática pede uma foto por equipamento, só da API do Pexels, num bucket público do Supabase Storage, em 800×600 e com o crédito registrado. Ela também diz que o agente nunca escreve em produção: o que vai para o banco ou para o Storage do deploy é executado pela pessoa.

Quatro fatos pesam:
- as sessões deste projeto têm conectores MCP do Supabase e da Vercel autenticados na conta da pessoa, com ferramentas de escrita, e também o Composio, com proxy e bash remoto, e o v0, que publica na Vercel;
- um workflow alterado numa branch roda em `pull_request` com os secrets do repositório (`DIRECT_URL`, `VERCEL_TOKEN` e os demais do `production.yml`);
- o `compose.yaml` não sobe o Storage, então o dev não tem onde provar um bucket;
- o briefing da Entrega 3 pede o `sharp` para padronizar o tamanho. Ele não está no ADR-001 e hoje só aparece como dependência transitiva do `next`.

Em 2026-11-11, um teste com três fotos públicas da documentação do Pexels mostrou que o CDN devolve um JPEG de exatamente 800×600, com orientação EXIF 1 e os mesmos bytes em dois downloads, quando a URL pede `fit=crop&w=800&h=600`. Esses parâmetros não estão documentados: só aparecem nas URLs prontas do exemplo ([documentação da API](https://www.pexels.com/api/documentation/), lida em 2026-11-11).

A emissão de chaves novas do Pexels está pausada desde, no máximo, 2026-09-30. Dizem isso a [página da API](https://www.pexels.com/api/) e a [central de ajuda](https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key), ambas lidas em 2026-11-11. A página de documentação não diz.

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Fonte | Só a API do Pexels, com a chave da pessoa (`PEXELS_API_KEY`, só no `.env.local`) |
| Tamanho | 800×600 pedido ao CDN do Pexels e conferido no arquivo, sem biblioteca de imagem |
| Armazenamento | Bucket público `equipment-images` no projeto de produção, só `image/jpeg`, até 1 MB por arquivo |
| Nome do objeto | `<patrimonio>-<idPexels>.jpg` |
| Quem cria o bucket | A pessoa, pelo painel |
| Quem envia os arquivos | A pessoa, pelo painel, pela lista que a conferência imprime |
| Bloqueio do agente | `permissions.deny` no `.claude/settings.json`: os servidores MCP do Supabase, da Vercel, do Composio e do v0, inteiros, e `Edit(/.github/workflows/**)`, `Edit(/.claude/hooks/**)` e `Edit(/.claude/settings.json)`. Um hook PreToolUse do Bash e do PowerShell nega `git push` e `gh pr create` quando os commits a enviar tocam esses três caminhos. Como segunda camada, a pessoa desliga os conectores no claude.ai, ou os deixa só de leitura |

- **Pexels** — é a fonte que o contrato da prática aceita. O limite padrão, de 200 requisições por hora e 20.000 por mês, sobra para umas 30 chamadas.
- **Sem `sharp`** — o CDN já entrega o tamanho exato, e a conferência do cabeçalho JPEG recusa qualquer arquivo fora de 800×600. Assim, o tamanho fica garantido sem dependência direta nova, fora do ADR-001.
- **Bucket pelo painel** — o schema `storage` é do serviço de Storage. Uma migration do Prisma ali criaria um segundo dono do schema, pediria revisão humana pela rule e não teria como ser provada no dev, que não tem Storage.
- **Envio pela pessoa** — um script de envio exigiria a secret key de produção na máquina, o que o `rules/restrictions.md` proíbe, e daria ao agente um caminho para rodá-lo. Doze arquivos cabem na mão, e o nome fixo faz o reenvio substituir o mesmo objeto.
- **Nome com o id do Pexels** — trocar a foto muda a URL, e o CDN do Storage nunca serve a versão velha. O preço é atualizar o seed e apagar o objeto antigo a cada troca.
- **Deny por servidor inteiro** — uma lista de ferramentas de escrita envelhece a cada versão do conector. O deploy na Vercel também é rota até a produção, porque o código publicado roda com a secret key do ambiente da Vercel.
- **Deny nos workflows, nos hooks e no próprio settings** — a regra `Edit(caminho)` cobre o `Write`, as ferramentas de arquivo e os comandos que o Claude Code reconhece no shell, como `sed`, `tee` e redirecionamento ([permissões do Claude Code](https://code.claude.com/docs/en/permissions), lida em 2026-11-11). Ela não cobre um script em Node nem o git, que escrevem por conta própria. Os hooks entram no deny para o agente não desligar o hook do push editando o próprio arquivo.
- **Hook no `git push`** — é o passo que dispara o CI com os secrets. Negar o push e a abertura de PR quando os commits tocam esses caminhos fecha a rota do Node e do git, que o deny não alcança. A escolha é da pessoa, em 2026-11-11, entre aceitar o risco, este hook e o sandbox do Claude Code.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| `sharp` para redimensionar depois do download, como pede o briefing da Entrega 3 | Dependência direta nova, fora do ADR-001, para um tamanho que o CDN já entrega |
| Variante pronta `landscape` do Pexels | É 1200×627, nem 800×600 nem 4:3 |
| Bucket criado por migration | Segundo dono do schema `storage`, revisão humana e nenhuma prova no dev |
| Script de envio com a secret key na linha de comando | Secret key de produção na máquina e um caminho que o agente conseguiria rodar |
| Deny só das ferramentas de escrita dos conectores | Lista que envelhece; o navegador e o CI ficariam de fora do mesmo jeito |
| Nome fixo `<patrimonio>.jpg`, com sobrescrita | URL estável, mas sujeita ao cache do CDN do Storage no plano Free |

---

## 4. Consequências

### Fica mais fácil

- O tamanho, a origem, a repetição e o crédito são conferidos por código, sem biblioteca nova.
- O agente consegue fazer todo o trabalho que não é publicar.

### Fica mais difícil

- O deny casa pelo id de cada conector. Se a pessoa reconectar, o id muda, e o deny para de casar sem aviso. Duas coisas cobrem isso: a segunda camada, que é a pessoa desligar os conectores no claude.ai, e a conferência que a skill faz em cada rodada, de que nenhuma ferramenta de escrita dos quatro servidores aparece.
- O navegador com as sessões da pessoa alcança o painel do Supabase, e o deny não cobre isso. Esse caminho fica no pedido de permissão por site.
- Pelas ferramentas de arquivo, o agente não edita mais o `.claude/settings.json`, os hooks nem os workflows. Mudança nesses arquivos passa a ser feita pela pessoa, à mão. Isso inclui o job de E2E no CI (ADR-006, seção 6), o passo de gravar os equipamentos em produção, da spec dos dados iniciais, e os hooks que já existem.
- Por um script em Node ou pelo git, o agente ainda escreveria um workflow. O hook nega o push desses commits pelo Bash e pelo PowerShell. Sobra um script que faça o push sozinho, sem passar por nenhum dos dois: esse risco é aceito e fica registrado aqui.
- Sem a chave, a rodada real não acontece. Enquanto a emissão estiver pausada, só quem já tem chave consegue rodar a skill.
- Os Termos do Pexels proíbem cópia em massa ou sistemática, sem dizer onde fica o limite. Doze fotos escolhidas à mão ficam longe disso; o risco é aceito e fica registrado aqui.

---

## 5. O que este ADR não decide

- De onde vêm as fotos no dev, que não tem Storage: fica para a spec do catálogo.
- Onde a imagem e os créditos ficam no banco: fica para a spec dos dados iniciais.

---

## 6. Antes de aceitar

- A pessoa confere em `pexels.com/api/key`, logada, se a conta dela tem chave.

---

## 7. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| O CDN do Pexels deixa de devolver 800×600 exatos | Tamanho, sem `sharp` |
| A emissão de chaves do Pexels continua pausada na data da entrega | Fonte |
| A pessoa reconecta um conector, ou entra um conector novo com escrita | Bloqueio do agente |
| Uma rodada da skill encontra uma ferramenta de escrita de um dos quatro servidores | Bloqueio do agente |
| O dev ganha Storage no `compose.yaml` | Criação do bucket e fotos no dev |
