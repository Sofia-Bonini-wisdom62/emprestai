# ADR-002 — Identidade visual e sistema de design

| Campo | Valor |
|---|---|
| Status | Proposto. Quem aceita é o time ([`rules/restrictions.md`](../../rules/restrictions.md), seção Autoridade) |
| Data | 2026-10-23 |
| Turma | B |
| Vínculo | [`docs/PRD.md`](../PRD.md) e [`docs/layout.md`](../layout.md) |
| Decide | Identidade visual e sistema de design |

---

## 1. Contexto

O ADR-001 citava um design vindo do Figma, o que não vale para este projeto: não há Figma. O ADR-003 (seção 1) registra essa correção, e o design passa a ser especificado em [`docs/layout.md`](../layout.md), cujos requisitos derivam do `layout.md` da turma (autora: Leticia Nascimento, LeleNascimennto/empresTI; aviso do LICENSE de origem: "Copyright (c) 2026 lemosriosl", sob licença MIT), com identidade própria. Este ADR registra as escolhas dessa identidade e como elas cabem no que o ADR-001 já fixou: Tailwind e shadcn/ui (seção 2.2) e CSP sem `unsafe-inline` (seção 2.10).

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Tema | Só escuro, sem alternador; `color-scheme: dark` |
| Cor de marca e ação | Indigo (`--primary` = indigo 600), nunca usado como estado |
| Estados | Verde = disponível, âmbar = manutenção, vermelho = atraso, cinza neutro = emprestado, neutro apagado (sem fundo, contorno tracejado) = fora de uso; sempre com texto |
| Tipografia | Geist, família única, servida por `next/font` |
| Densidade | Arejada: alvos de 40 a 44px, mais espaço que o padrão do shadcn/ui |
| Ícones | Lucide, pelo pacote `lucide-react`. **Proposta do agente; confirmada com a aprovação deste ADR** |
| Implementação | Tokens em variáveis CSS em `src/app/globals.css`, expostos ao Tailwind por `@theme inline` e lidos pelo shadcn/ui pelos nomes dele |
| Fonte dos valores | `docs/layout.md` |
| Restrição de segurança | Nenhum atributo `style` em componente nosso; nada de fonte, ícone, CSS ou script por CDN |

- **Só escuro** — escolha da pessoa. Um tema só é um conjunto de tokens e uma conferência de contraste; o que isso custa está na seção 4.
- **Indigo como marca e ação** — a pessoa quis cor própria, distinta do azul-marinho do layout de origem. O matiz fica longe de verde, âmbar e vermelho, então botão primário não é lido como estado; emprestado e fora de uso são neutros para que nenhum estado use indigo, e estado sempre leva texto, porque cor reforça e não informa sozinha.
- **Geist via `next/font`** — escolha da pessoa entre Geist, Inter e IBM Plex Sans. As três seriam entregues do mesmo jeito; o critério foi identidade. O `next/font` baixa o arquivo no build e o serve do próprio domínio, o que mantém `font-src 'self'`.
- **Arejado** — escolha da pessoa: alvo grande e uma ideia por bloco favorecem quem usa o sistema de passagem e quem registra devolução no balcão. O custo em linhas por tela foi aceito em `docs/layout.md`, seção 4.
- **Lucide** — proposta do agente; confirmada com a aprovação deste ADR. É o pacote que o shadcn/ui já usa nos próprios primitivos, então não abre biblioteca fora do ADR-001; vira SVG no bundle, sem fonte de ícone nem CDN.
- **Tokens em variáveis CSS** — o shadcn/ui lê variáveis com nomes fixos (`--background`, `--primary`, `--ring`...). Preenchê-las com os nossos valores e acrescentar só o que falta (os trios de estado, `--status-overdue-row`, `--surface-sunken`, `--border-strong`, `--text-secondary`, `--text-disabled`, `--meter-track`; lista completa em `docs/layout.md`, seção 2) muda o visual sem reescrever componente. Valores em `:root`, não em `.dark`, porque há um tema só.
- **`docs/layout.md` como fonte dos valores** — este ADR guarda o porquê; o layout guarda o onde e o quanto. Mudar um hex ou uma medida é edição do layout; mudar uma linha da tabela acima é revisão deste ADR.
- **Sem `style` e sem CDN** — atributo `style` exigiria `unsafe-inline` (ou hash) em `style-src`, e recurso de CDN exigiria abrir a CSP para outro domínio; as duas coisas contradizem o ADR-001, 2.10. Medida dinâmica vira elemento nativo (`<progress>`) ou classe por estado; o `Progress` do shadcn/ui fica de fora por posicionar o preenchimento com `style`.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Só claro | Recomendação inicial, descartada pela pessoa. O escuro custa a mais: superfícies se separam por tom e não por sombra, cada par de cor tem a razão conferida por nós, a leitura sob luz forte no balcão ainda não foi testada e quem prefere claro fica sem opção |
| Claro e escuro | Dois conjuntos de tokens, toda cor conferida duas vezes, alternador, preferência salva e verificação visual em dobro |
| Grafite neutro como cor de ação | Recomendação inicial, descartada pela pessoa. O indigo custa a mais: neutro nunca colide com estado nem com foco; com indigo, botão (600), link (400) e anel de foco (300) dividem o matiz e só se separam por luminosidade, e a escala de 11 passos precisa ser mantida |
| Verde-petróleo | Matiz vizinho do verde de "Disponível": o botão primário seria lido como estado |
| Inter; IBM Plex Sans | Seriam entregues igual, por `next/font`; descarte por identidade, não por motivo técnico |
| Padrão do shadcn/ui (tokens e tamanhos de fábrica) | Recomendação inicial, descartada pela pessoa. A identidade própria custa a mais: tokens novos fora do vocabulário do shadcn/ui, contraste calculado por nós e não herdado, e cada primitivo copiado ajustado a alturas maiores, ajuste que precisa ser refeito quando o componente for atualizado |
| Compacto | Mostraria mais linhas na tabela de Operações, com alvos menores; a pessoa preferiu arejado e aceitou a paginação |
| Nocturne escuro (layout de origem) | Identidade de outro projeto; e o bundle do Nocturne é carregado em runtime, fora do build |
| Azul-marinho `#001449` (layout de origem) | Identidade de outro projeto; primária escura usada como fundo exige uma segunda cor para a ação |
| Open Sans (layout de origem) | Identidade de outro projeto |
| Phosphor por CDN (layout de origem) | CDN contradiz o ADR-001, 2.10; e Phosphor seria biblioteca fora do ADR-001, quando Lucide já vem com o shadcn/ui |
| Botões só contornados (layout de origem) | Primário e secundário ficariam com o mesmo peso; preenchido marca a ação principal e o contornado vira a variante `outline` |

---

## 4. Consequências

### Fica mais fácil

- Um tema só: um conjunto de tokens, uma conferência de contraste, nenhum alternador.
- Componente do shadcn/ui pega as nossas cores sem ser reescrito; trocar um valor é editar uma variável.
- Fonte e ícone saem do build: a CSP fica em `'self'`, sem exceção para design.
- Estado e ação nunca se confundem: cores separadas, e estado sempre com texto. Revisão de design é diff de texto.

### Fica mais difícil

- Só escuro exige disciplina de contraste: cor nova entra com a razão conferida, e a separação entre superfícies é diferença pequena de tom (`#0B0C14` contra `#13151F`).
- Não atende quem prefere claro nem quem lê sob luz forte; não há saída dentro do produto.
- Arejado mostra cerca de oito linhas por tela na tabela de Operações; a paginação de 10 compensa, mas varrer os empréstimos em aberto pede mais cliques.
- Indigo exige separar bem de "atraso" (link indigo 400 e texto de atraso são ambos claros e frios) e do foco, que é do mesmo matiz do botão primário e só se distingue pela luminosidade e pelo afastamento de 2px.
- Sem `style`: toda medida dinâmica precisa de elemento nativo ou classe por estado, e componente de terceiro que escreva `style` não entra sem revisão. `Select`, `DropdownMenu`, `Sidebar` e `ToggleGroup` ainda precisam ser conferidos com a CSP ligada: nenhum `style` no HTML do servidor.

### O que isso impede de fazer depois sem custo

- Acrescentar tema claro: cada token ganha um segundo valor com contraste conferido, os valores saem de `:root` para dois conjuntos com um seletor de tema, e toda tela é revista nos dois temas.
- Voltar ao compacto: alturas e paddings estão em cada primitivo e em cada tela; reduzir é revisar tela por tela.
- Trocar o pacote de ícones: os nomes estão no mapa de `docs/layout.md`, seção 5.1, e importados por nome em cada tela.
- Usar biblioteca que dependa de `style` inline ou de CDN: exige rever a CSP do ADR-001, não só este ADR.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| O uso no balcão sob luz forte mostra problema de leitura | Só escuro; tons das superfícies |
| A pessoa ou o time pede tema claro | Só escuro; tokens em `:root` |
| A tabela de Operações precisa de densidade que a paginação não resolve | Densidade arejada |
| Alguém confunde indigo com atraso, ou o foco com o botão primário | Escala do indigo; cores de estado |
| Um ícone necessário não existe no Lucide | Ícones |
| Na primeira tela com componentes do shadcn/ui, com a CSP ligada, `Select`, `DropdownMenu`, `Sidebar` ou `ToggleGroup` é bloqueado por escrever `style` | Sem `style`, e o ADR-001, 2.10 |
| Uma resposta do PRD cria outro estado (perguntas 7, 9b e 17) | Cores de estado: a cor nova não pode colidir com o indigo nem com os cinco estados atuais |

---

## 6. O que este ADR não decide

- Telas, fluxos e comportamento: são da spec de cada funcionalidade em `docs/specs/`.
- Copy final de botão, mensagem e estado vazio: entra na spec; `docs/layout.md`, seção 9, dá só o tom.
- Ilustração, foto de equipamento e logotipo além do ícone de marca.
- As perguntas abertas de `docs/perguntas-prd.md`; onde o desenho depende de uma, `docs/layout.md` diz "depende da pergunta N".
- Regra de lint que proíbe a prop `style`: entra na T1 do plano do andar zero.
- Versões: Geist e Tailwind, versão estável atual, conferida na tarefa de scaffold (T1); `lucide-react` e shadcn/ui, na primeira tarefa que os instalar, fora do andar zero.
