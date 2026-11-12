# ADR-012 — O nonce da CSP para os estilos que os primitivos do Radix injetam

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-11-12, pela pessoa, que escolheu a saída B ("Confirmo a B") e aprovou o `get-nonce` 1.0.1 como dependência direta |
| Data | 2026-11-12 |
| Turma | B |
| Vínculo | [ADR-002](002-design-system.md), seção 5, gatilho de revisão "`Select`, `DropdownMenu`, `Sidebar` ou `ToggleGroup` é bloqueado"; [`docs/layout.md`](../layout.md), seção 11; spec 001, [`plan.md`](../specs/001-login/plan.md), Risco, e a T-12 (CA-16) |
| Substitui | Nenhum trecho. Escolhe como cumprir o ADR-001, 2.10 (CSP sem `unsafe-inline`), sem mudar a decisão |
| Decide | Como os `<style>` que o Radix injeta no navegador recebem o nonce da CSP, ou se o app evita que eles sejam injetados |

---

## 1. Contexto

A T-12 ligou a CSP do ADR-001, 2.10, no padrão do guia do Next 16:
- um nonce novo por request, gerado no `proxy.ts`;
- `script-src 'self' 'nonce-…' 'strict-dynamic'`;
- `style-src 'self' 'nonce-…'`, sem `'unsafe-inline'`.

O Next lê o nonce do cabeçalho e o põe nos scripts e estilos que ele mesmo escreve.

O `DropdownMenu` do menu do usuário (T-11) vem do Radix e, no modo padrão (`modal`), trava a rolagem da página enquanto o menu está aberto. Essa trava é feita pelo `react-remove-scroll`, que, pelo `react-remove-scroll-bar`, injeta um `<style>` no `<head>` com regras como `body[data-scroll-locked] { overflow: hidden }`. Quem cria esse `<style>` é o `react-style-singleton`, que pede o nonce ao `get-nonce`.

O `get-nonce` 1.0.1 só devolve um nonce de duas fontes: o que alguém passou por `setNonce()`, ou a variável `__webpack_nonce__`. O Next 16.4.5 não define essa variável no navegador e não chama `setNonce`. Então o `<style>` sai sem nonce, e a CSP o barra assim que o menu abre. É o caso que o ADR-002, seção 5, e o `docs/layout.md`, seção 11, mandam trazer para decisão.

O mesmo vai acontecer com todo primitivo do Radix que trava a rolagem: `Dialog`, `Select`, `AlertDialog` e `Sheet`. O `Dialog` não tem modo sem trava, e as telas de Operações e de empréstimo vão precisar de diálogo de confirmação (`docs/layout.md`, seção 5).

Fatos conferidos no código instalado, em 2026-11-12:
- `@radix-ui/react-menu` 2.2.1: o modo `modal` monta o `RemoveScroll`, e o modo não modal não monta. O não modal também não esconde o resto da página do leitor de tela (`hideOthers`), deixa o clique de fora chegar ao alvo e, depois de um clique fora, não devolve o foco ao gatilho.
- `react-style-singleton` depende de `get-nonce` `^1.0.0`. Os dois já estão no `pnpm-lock.yaml` como dependências do `radix-ui`, mas não são dependências diretas do app.
- O Turbopack do Next 16.4.5 deixa o `typeof __webpack_nonce__` intacto no bundle do navegador (`.next/static/chunks`). Portanto, uma variável global com esse nome seria lida pelo `get-nonce`.
- Prova no E2E, com o build de produção e a CSP ligada:
  - `/`, `/login` e `/auth/confirm` abrem sem violação;
  - abrir o menu do usuário, no modo modal, gera `Applying inline style violates the following Content Security Policy directive 'style-src …'`, com a diretiva `style-src-elem` e o bloqueio `inline`;
  - com `modal={false}`, a mesma tela não gera violação. Isso foi medido numa rodada anterior desta T-12, antes de o modo voltar ao padrão para esperar esta decisão.

## 2. Decisão

**Saída B**, escolhida pela pessoa em 2026-11-12, como o agente recomendou. O menu do usuário continua modal.

| Alternativa | Como funciona | O que custa |
|---|---|---|
| **A. Menu não modal** (`modal={false}`) | O Radix não monta a trava de rolagem, e nenhum `<style>` é injetado | Muda o comportamento do menu: a página rola com o menu aberto, o resto da página não fica escondido do leitor de tela, o clique fora chega ao que foi clicado e o foco não volta ao gatilho. Não serve para o `Dialog`, que não tem modo sem trava |
| **B. `setNonce` do `get-nonce`** (escolhida) | Um módulo de cliente do layout raiz (`src/app/csp-client.tsx`) chama `setNonce(nonce)` quando carrega, antes de qualquer primitivo montar. Todo `<style>` do Radix sai com o nonce | O `get-nonce` 1.0.1 vira dependência direta, o que pede aprovação (`rules/operacao.md`). Vale também para o `Dialog` e o `Select` que vierem |
| **C. Variável global `__webpack_nonce__`** | O mesmo componente de cliente define `globalThis.__webpack_nonce__ = nonce`, e o `get-nonce` a lê | Sem dependência nova, mas depende de um detalhe interno: o Turbopack deixar o nome intacto. Uma versão nova do bundler pode trocá-lo, e o `ca_16` só pega isso quando a tela abre o menu |
| D. `'unsafe-inline'` no `style-src` | Libera todo estilo inline | Contraria o ADR-001, 2.10. Descartada |
| E. Hash do estilo no `style-src` | Libera o `<style>` pelo hash do conteúdo | O conteúdo muda com a largura da barra de rolagem de cada máquina. Inviável |

Nas alternativas B e C, o nonce chega ao navegador pela página, como já chega aos scripts do Next. Ele já está no HTML, então essa ida não expõe nada que um script injetado não alcançasse.

Na implementação da B, o módulo lê o nonce dos scripts que o Next já escreveu na página (`script[nonce]`), e não de uma prop do layout. A CSP do documento fica fixa no carregamento, e um `router.refresh()` renderiza o layout de novo com o nonce de outro request, que essa CSP barraria.

## 3. Consequências

- Com A, o menu do usuário muda de comportamento agora, e a questão volta no primeiro `Dialog`.
- Com B, o app ganha uma dependência pequena, que já está na árvore. A regra fica uma só, e cada primitivo novo do Radix funciona com a CSP sem ajuste.
- Com C, não há dependência nova, mas o app fica preso a um detalhe que nenhum dos dois projetos promete.

## 4. Antes de aceitar

1. Feito em 2026-11-12: a pessoa escolheu a B.
2. Feito em 2026-11-12: o `get-nonce` 1.0.1 entrou como dependência direta, com versão exata (`docs/specs/001-login/plan.md`, tabela de dependências).
3. A T-12 aplica a solução e mostra o `ca_16` do header, com o menu aberto, sem violação no console.

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| O Next passa a definir `__webpack_nonce__` ou a chamar `setNonce` sozinho | A escolha inteira: talvez nada seja preciso |
| O Radix troca o `react-remove-scroll` por outra trava de rolagem | O motivo do `<style>` injetado |
