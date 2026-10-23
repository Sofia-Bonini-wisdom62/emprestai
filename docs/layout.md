# Layout — emprestai

Especificação visual e de telas do emprestai: os valores que a implementação usa (cores, tipografia, medidas, componentes, telas). As decisões e o porquê delas ficam em [`docs/adr/002-design-system.md`](adr/002-design-system.md); este arquivo guarda os valores e muda junto com elas.

Requisitos derivados de `layout.md` de Leticia Nascimento (repositório LeleNascimennto/empresTI; aviso do LICENSE de origem: "Copyright (c) 2026 lemosriosl", sob licença MIT); identidade visual e texto próprios. O que veio de lá e como cada item foi tratado está na seção 12.

Vínculos: produto em [`docs/PRD.md`](PRD.md); lacunas do produto em [`docs/perguntas-prd.md`](perguntas-prd.md); stack e segurança em [`docs/adr/001-stack.md`](adr/001-stack.md), seções 2.2 e 2.10, com as correções de [`docs/adr/003-stack-corrections.md`](adr/003-stack-corrections.md). Onde uma tela precisaria de resposta que o PRD não deu, o texto diz "depende da pergunta N" e o desenho fica neutro.

---

## 1. Princípios visuais

1. **Só tema escuro.** Não há tema claro nem alternador. `color-scheme: dark` no documento.
2. **Indigo é marca e ação, nunca estado.** Botão primário, link, foco e item ativo usam indigo. Estado de equipamento usa outras três cores fixas: verde = disponível, âmbar = manutenção, vermelho = atraso. Emprestado é neutro (cinza).
3. **Arejado.** Mais espaço que o padrão do shadcn/ui, alvos de clique grandes, uma ideia por bloco. O custo é aceito: menos linhas por tela na tabela de Operações, compensado por paginação.
4. **Superfície por cor, não por sombra.** Camadas se distinguem por tom de fundo e borda fina; sombra só em diálogo e menu flutuante.
5. **Plano.** Sem gradiente, sem textura, sem ilustração. Ícone de linha em tamanho fixo.
6. **Estado sempre com texto.** Cor reforça, nunca é o único sinal.
7. **Texto começa pela esquerda.** Título, parágrafo, rótulo e célula de tabela alinhados à esquerda, sem recuo próprio do título; nenhum bloco de texto centralizado. Controles agrupados à direita (ações do diálogo, contador e menu do header) são posição de controle, não alinhamento de texto.
8. **Neutros frios.** Fundos, bordas e textos neutros têm saturação baixa e matiz levemente azul, para conversar com o indigo sem competir com ele.

## 2. Cores

Todos os valores em hex para conferir contraste. As razões foram calculadas pela fórmula de luminância relativa do WCAG 2.x. Meta: 4.5:1 para texto normal, 3:1 para texto grande e para borda ou elemento de interface que comunica estado.

### 2.1 Fundo, superfícies, bordas e texto

| Token nosso | Hex | Variável do shadcn/ui | Uso | Contraste conferido |
|---|---|---|---|---|
| `--background` | `#0B0C14` | `--background` | Fundo da aplicação | — |
| `--sidebar` | `#090A11` | `--sidebar` | Fundo da sidebar | — |
| `--card` | `#13151F` | `--card` | Cards, contêiner de tabela, painéis | — |
| `--popover` | `#1A1C28` | `--popover` | Diálogo, menu do select, menu do usuário | — |
| `--surface-sunken` | `#0F1019` | (novo) | Fundo de input e cabeçalho de tabela | — |
| `--muted` | `#1D2030` | `--muted`, `--secondary` | Hover neutro, skeleton | — |
| `--accent` | `#1F2238` | `--accent`, `--sidebar-accent` | Hover de item de menu, item ativo da sidebar | — |
| `--border` | `#262938` | `--border`, `--sidebar-border` | Divisor decorativo (não comunica estado) | 1.35 no fundo, decorativo |
| `--input` | `#626888` | `--input` | Borda de input, select, textarea, botão outline, chip inativo, contêiner do controle segmentado | 3.58 fundo · 3.63 sidebar · 3.48 sunken · 3.34 card · 3.11 popover |
| `--border-strong` | `#6B7190` | (novo) | Borda em hover, segmento vazio do limite, borda da pill Emprestado | 3.80 card · 3.54 popover |
| `--foreground` | `#EDEEF5` | `--foreground`, `--card-foreground`, `--popover-foreground`, `--accent-foreground`, `--secondary-foreground` | Texto principal | 16.85 fundo · 15.72 card · 14.63 popover |
| `--text-secondary` | `#BCC0D2` | `--sidebar-foreground` | Texto de apoio, item inativo da sidebar | 10.78 fundo · 10.05 card · 9.36 popover |
| `--muted-foreground` | `#9196AE` | `--muted-foreground` | Metadado, rótulo, placeholder, data | 6.67 fundo · 6.22 card · 5.79 popover · 5.51 muted |
| `--text-disabled` | `#5E6380` | (novo) | Só texto de controle desabilitado; nunca informação | 3.32 fundo · 2.74 muted (botão desabilitado) · 3.22 sunken (input desabilitado); isento pelo WCAG 1.4.3 |

### 2.2 Escala do indigo

| Passo | Hex | Uso |
|---|---|---|
| 50 | `#EEEFFF` | Reserva |
| 100 | `#DDE0FF` | Texto sobre indigo 900 (chip ativo): 10.65 |
| 200 | `#C4C8FF` | Reserva |
| 300 | `#A5ACFF` | `--ring` (foco); hover de link |
| 400 | `#8C93FA` | Link, ícone ativo, preenchimento da barra de prazo e dos segmentos: 7.12 fundo · 6.64 card |
| 500 | `#6E75EE` | Borda do chip ativo e da opção ativa do controle segmentado: 5.05 fundo · 4.71 card · 4.39 popover · 3.58 sobre indigo 900 |
| 600 | `#5257E0` | `--primary`, `--sidebar-primary`; fundo do botão primário |
| 700 | `#454AC9` | Hover do botão primário |
| 800 | `#363A9E` | Reserva |
| 900 | `#24275C` | Fundo do chip ativo, da opção ativa do controle segmentado e do badge de contagem (texto indigo 100 nos três) |
| 950 | `#171936` | Painel da marca no login (texto `--text-secondary` sobre ele: 9.45) |

`--primary-foreground` = `#F7F7FF` (branco puro fica de fora): 5.19 sobre indigo 600, 6.41 sobre indigo 700 e 4.87 sobre `--destructive`. `--foreground` não serve aqui: sobre `--destructive` dá 4.49 e reprova. A borda do botão primário dá 3.53 fundo · 3.29 card · 3.06 popover; em botão com texto o contorno não é exigido pelo WCAG 1.4.11, mas a margem no popover é pequena e precisa ser conferida de novo se `--popover` mudar.

### 2.3 Estados

| Estado | Texto | Fundo | Borda | Texto/fundo próprio | Borda/card | Borda/fundo próprio |
|---|---|---|---|---|---|---|
| Disponível | `#5BD69B` | `#0E2A1E` | `#2F8F62` | 8.43 | 4.53 | 3.82 |
| Emprestado | `#C3C7D8` | `#1F2232` | `#6B7190` | 9.36 | 3.80 | 3.29 |
| Manutenção | `#F0C05A` | `#2D2410` | `#9A7420` | 9.04 | 4.24 | 3.57 |
| Em atraso | `#FF9497` | `#33171B` | `#C24C55` | 7.77 | 3.86 | 3.49 |

Tokens novos (o shadcn/ui não tem): `--status-available`, `--status-available-bg`, `--status-available-border`, e o mesmo trio para `loaned`, `maintenance` e `overdue`. Mais quatro:

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--status-overdue-row` | `#1C1418` | Fundo da linha em atraso na tabela | `--foreground` 15.61 · `--muted-foreground` 6.17 · texto de atraso 8.55 · borda de atraso 3.84 |
| `--meter-track` | `#2E3144` | Trilha da barra de prazo | preenchimento indigo 400 sobre ela: 4.68; preenchimento de atraso: 6.06. A trilha contra o card dá 1.42 e contra o fundo 1.52: a extensão total da barra quase não aparece, e é por isso que o prazo sempre vem em texto ao lado (seção 5). Clarear a trilha até 3:1 derrubaria o preenchimento abaixo de 3:1 contra ela; se um dia a proporção tiver de ser lida sem o texto, a saída é contornar a trilha com 1px em `--border-strong` (3.80 card), por classe |
| `--destructive` | `#C9343F` | `--destructive`; erro de formulário usa o texto de atraso `#FF9497` | `--primary-foreground` `#F7F7FF` sobre ele: 4.87 |
| `--overlay` | `#05060B` a 70% de opacidade | Backdrop do diálogo de confirmação | Sobre o fundo resulta em `#07080E`; texto `--foreground` sobre ele: 17.28. A caixa `--popover` contra o backdrop dá 1.18: ela se separa pelo tom e pela sombra, e o contorno da caixa não comunica estado |

`--destructive` existe porque os componentes do shadcn/ui o referenciam; nenhuma tela da v1 tem ação destrutiva. Atenção ao nome: `--accent` do shadcn/ui é o fundo de hover de menu, não a cor de marca; a marca é `--primary`.

### 2.4 Foco

`--ring` = indigo 300 `#A5ACFF`, contorno de 2px com afastamento de 2px na cor do fundo. Como o anel fica sobre o fundo e não sobre o botão, a razão que vale é a do anel contra a superfície: 9.23 fundo · 8.61 card · 8.02 popover · 9.35 sidebar (`--sidebar-ring`).

## 3. Tipografia

Família única: **Geist**, servida pelo próprio Next.js via `next/font` (seção 11). Fallback `ui-sans-serif, system-ui, sans-serif`. Números de data, prazo e contagem usam `tabular-nums` para não dançar em tabela.

| Papel | Tamanho / altura de linha | Peso |
|---|---|---|
| Display (login) | 36 / 44px | 600 |
| Título de página (H1) | 28 / 36px | 600 |
| Número de destaque (cards de número em Operações, números do painel do login) | 28 / 36px, `tabular-nums` | 600 |
| Título de seção, de card lateral, de diálogo (H2) | 20 / 28px | 600 |
| Nome de equipamento em card e em linha (H3) | 17 / 24px | 600 |
| Corpo, input, célula de tabela | 15 / 24px | 400 |
| Rótulo de campo, texto de botão, item de navegação | 15 / 20px | 500 |
| Texto de apoio, metadado, cabeçalho de tabela | 14 / 20px | 400 (cabeçalho de tabela 500) |
| Pill, badge, nota | 13 / 18px | 500 |

Pesos usados: 400, 500 e 600. Sem 700. Sem caixa-alta em rótulo: cabeçalho de tabela e rótulo de grupo da sidebar ficam em caixa normal, peso 500, cor `--muted-foreground`. **Tamanho mínimo: 13px**, em qualquer texto. Espaçamento entre letras padrão da fonte em todos os papéis, sem ajuste negativo em título. Parágrafo com `text-wrap: pretty`, para não deixar palavra sozinha na última linha; onde o navegador não suporta, a quebra comum vale.

## 4. Espaçamento, raios e alturas

Escala de espaço em múltiplos de 4px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Agrupamento por `gap` em flex e grid.

| Medida | Valor |
|---|---|
| Largura da sidebar | 272px (abaixo de 1024px vira painel lateral sobreposto) |
| Altura do header | 72px, padding lateral 32px |
| Padding do conteúdo | 40px vertical, 32px lateral (20px abaixo de 768px); largura máxima 1280px |
| Espaço entre blocos da página | 32px; dentro de um bloco, 16px |
| Padding de card | 24px; grid de cards com gap de 24px |
| Botão padrão / input / select | 44px de altura; padding lateral 20px (botão) e 14px (input) |
| Botão grande (login, solicitar) | 48px |
| Botão pequeno (em linha de tabela) | 40px, padding lateral 16px |
| Botão só de ícone | 44 × 44px, ícone 20px |
| Chip de filtro | 40px de altura, padding lateral 16px |
| Textarea | mínimo 120px, padding 12px 14px |
| Linha de tabela | mínimo 64px, padding lateral 20px; cabeçalho 48px |
| Item de navegação | 44px, padding lateral 12px, gap 12px |
| Alvo de clique mínimo | 40 × 40px em qualquer controle; 44 × 44px em ação principal |

Raios: `--radius` = 10px. Derivados: 6px (badge de contagem), 8px (botão, input, select, controle segmentado), 10px (card, tabela), 14px (diálogo), 9999px (pill, chip, avatar, barra).

Custo do arejado: numa tela de 900px de altura a tabela de Operações mostra cerca de oito linhas. Paginação de 10 por página.

## 5. Componentes

Primitivos do shadcn/ui copiados para `src/components/ui/` e ajustados aos tokens. Nenhum componente nosso usa atributo `style` (seção 11). Primitivo que escreve `style` de fábrica é ajustado ao ser copiado (caso do `Sidebar`) ou fica na lista de conferência do scaffold (seção 11).

| Componente | Primitivo shadcn/ui | Variantes | Estados |
|---|---|---|---|
| Botão | `Button` | `default` (primário: fundo indigo 600, texto `--primary-foreground`); `outline` (secundário: borda `--input`, fundo transparente, texto `--foreground`); `ghost` (terciário, sem borda); `link` (indigo 400). Tamanhos `default` 44px, `lg` 48px, `sm` 40px, `icon` 44px | Hover: primário indigo 700; outline e ghost fundo `--muted`, borda `--border-strong`. Foco: anel da 2.4. Desabilitado: texto `--text-disabled`, fundo `--muted`, cursor bloqueado, motivo escrito ao lado. Carregando: `LoaderCircle` girando e texto mantido, botão desabilitado |
| Pill de estado | `Badge` com variantes `available`, `loaned`, `maintenance`, `overdue` | Trio de cores da 2.3, altura 28px, padding 0 12px, ícone 14px à esquerda | Sem hover; não é clicável. Sempre com texto ("Disponível", "Emprestado", "Manutenção", "Em atraso") |
| Chip de filtro | `ToggleGroup` (categoria, escolha única) e `Toggle` ("Mostrar só o que está livre") | Inativo: borda `--input`, texto `--text-secondary`. Ativo: fundo indigo 900, borda indigo 500, texto indigo 100, ícone `Check` | Hover: fundo `--muted`. Foco: anel. `aria-pressed` vem do primitivo |
| Card de equipamento | `Card` inteiro como link para o detalhe | Topo: ícone da categoria em 20px, `--muted-foreground`. Nome em H3 e, abaixo, uma linha de metadado em 14px `--muted-foreground` (categoria; o que mais entra depende da pergunta 12). Disponível: pill verde, rodapé "Ver e solicitar" em indigo 400 com `ArrowRight`. Emprestado: pill neutra, rodapé "Volta até dd/mm" (quem está com o item: depende da pergunta 14). Manutenção: pill âmbar, rodapé "Em manutenção" | Hover: borda `--border-strong`. Foco: anel no card. Os três estados levam ao detalhe; só o disponível oferece solicitar lá |
| Input, select, textarea | `Input`, `Select`, `Textarea`, `Label` com React Hook Form | Fundo `--surface-sunken`, borda `--input`, placeholder `--muted-foreground`, rótulo acima, ajuda abaixo em 14px | Hover: borda `--border-strong`. Foco: anel. Inválido: borda `#C24C55`, mensagem em `#FF9497` com `CircleAlert`, `aria-invalid` e `aria-describedby`. Desabilitado: texto `--text-disabled` |
| Controle segmentado | `RadioGroup` estilizado como faixa | Opções lado a lado em contêiner com borda `--input`, 44px. Ativa: fundo indigo 900, borda de 1px indigo 500 (a mesma do chip ativo; 4.71 card, 4.39 popover) e texto indigo 100 (10.65). Inativa: sem fundo próprio, texto `--text-secondary` (10.05 card) | Setas do teclado trocam a opção (semântica de rádio). Foco: anel na opção |
| Tabela | `Table` | Contêiner `--card` com borda `--border`, cabeçalho `--surface-sunken` | Linha em hover: fundo `--muted`. Linha em atraso: fundo `--status-overdue-row`, filete de 3px à esquerda em `#C24C55`, pill "Em atraso" na coluna de situação e texto "N dias em atraso" |
| Quadro de regras | `Alert` | Fundo `--card`, borda `--border`, ícone `Info` em indigo 400, título 15px/600, corpo 14px | Estático. Variante de bloqueio: borda `#C24C55`, ícone `Ban` em `#FF9497` (8.60 card), aparece quando a pessoa tem item em atraso |
| Diálogo de confirmação | `AlertDialog` | Backdrop `--overlay` (2.3). Caixa 480px, `--popover`, raio 14px, padding 32px, sombra única. Título → texto → **resumo do que muda** (fundo `--surface-sunken`, borda `--border`, raio 8px, padding 16px, lista curta) → ações à direita: `outline` "Cancelar" e `default` "Confirmar ..." | Foco inicial em "Cancelar"; Esc fecha; foco volta ao botão de origem |
| Aviso de resultado | componente próprio, sem o toast do shadcn/ui (Sonner escreve `style` e seria biblioteca fora do ADR-001) | Região fixa abaixo do header, `role="status"` e `aria-live="polite"`, fundo `--card`, borda `--border`, texto 15px `--foreground` | Some na navegação seguinte; sem animação de entrada. O texto e em que tela aparece dependem do fluxo (seção 7.1) |
| Indicador de limite (3 itens) | componente próprio, três `span` | Três barras de 8px de altura e gap de 8px; preenchida indigo 400, vazia só com borda `--border-strong`. Texto ao lado: "Você está com 2 de 3 itens" | Com 3 de 3: texto "Limite atingido" e solicitar desabilitado. O que entra na contagem depende da pergunta 2 |
| Barra de prazo | elemento nativo `<progress>` estilizado | Trilha `--meter-track`, 6px, raio cheio; preenchimento indigo 400; em atraso, `#FF9497` e cheia | Sempre com texto: "Vence em 5 dias" ou "3 dias em atraso". A partir de quando conta e em que tipo de dia: depende da pergunta 4 |
| Sidebar | `Sidebar`, copiado sem o `style` do `SidebarProvider` (largura de 272px por classe ou token em `globals.css`); `SidebarMenuSkeleton` não usado, porque sorteia a largura por `style` | Marca no topo, dois grupos, identidade da pessoa no rodapé (só leitura) | Item ativo: fundo `--accent`, texto `--foreground`, ícone indigo 400, filete de 3px indigo 400 à esquerda, `aria-current="page"`. Hover: fundo `--muted` |
| Breadcrumb | `Breadcrumb` | Links em indigo 400, separador `ChevronRight` 16px, item atual `--foreground` | Hover de link: indigo 300 |
| Header | componente próprio | Título ou breadcrumb à esquerda; à direita, slot de ação da página (botão `default`; em Empréstimos em aberto, "Cadastrar equipamento"), contador "Você está com 2 de 3 itens" (texto + indicador de limite compacto) e menu do usuário (`DropdownMenu`, único lugar com "Sair") | Espaço da busca reservado e vazio: depende da pergunta 11. Se quem é de Operações também pega emprestado, e portanto vê o contador: depende da pergunta 6 |
| Paginação | `Pagination` | "11–20 de 47 empréstimos" + Anterior / Próximo (`outline`, 40px) | Desabilitado nas pontas |
| Carregamento | `Skeleton` | Mesma forma do card ou da linha | `motion-reduce`: sem pulsar |

### 5.1 Ícones

**Lucide, pelo pacote `lucide-react`**, que o shadcn/ui já usa. Proposta do agente, confirmada com a aprovação do ADR-002 (que tem status Proposto). Traço padrão, tamanhos 14px (pill), 16px (breadcrumb), 20px (navegação, botão, card) e 48px (imagem do detalhe). Ícone decorativo leva `aria-hidden`; botão só de ícone leva `aria-label`.

| Uso | Ícone | Uso | Ícone |
|---|---|---|---|
| Marca | `Package` | Notebook | `Laptop` |
| Catálogo | `LayoutGrid` | Monitor | `Monitor` |
| Meus empréstimos | `Backpack` | Câmera | `Camera` |
| Empréstimos em aberto | `ClipboardList` | Cabo | `Cable` |
| Cadastrar equipamento | `SquarePlus` | Dock / adaptador | `Usb` |
| Disponível | `CircleCheck` | Projetor | `Projector` |
| Emprestado | `Clock` | Categoria desconhecida | `Package` |
| Manutenção | `Wrench` | Quadro de regras | `Info` |
| Em atraso, erro | `CircleAlert` | Bloqueio por atraso | `Ban` |
| Devolver | `Undo2` | Avançar, solicitar | `ArrowRight` |
| Breadcrumb, página seguinte | `ChevronRight` | Página anterior | `ChevronLeft` |
| Select | `ChevronDown` | Filtro ativo | `Check` |
| Adicionar | `Plus` | Sair | `LogOut` |
| Carregando | `LoaderCircle` | Mostrar/ocultar senha | `Eye`, `EyeOff` |

Nomes conferidos em 2026-10-23 contra a lista de tags do pacote `lucide-static` publicada no npm (mesma base de ícones do `lucide-react`). Conferir de novo contra a versão instalada na tarefa de scaffold. `Search` e `Bell` existem, mas não entram enquanto as perguntas 11 e 10 estiverem abertas.

## 6. Telas

Todas as telas, menos o login, usam a moldura sidebar + header + conteúdo. Rotas em inglês; título visível em português. Todo texto de interface entre aspas nesta seção e na seção 7 é provisório: mostra o tom e o tamanho, e a copy final entra na spec de cada funcionalidade (ADR-002, seção 6).

| # | Tela | Rota | Quem acessa |
|---|---|---|---|
| 1 | Login | `/login` | Sem sessão |
| 2 | Catálogo | `/catalog` (`/` redireciona para cá) | Qualquer pessoa logada |
| 3 | Detalhe do equipamento | `/catalog/[equipmentId]` | Qualquer pessoa logada |
| 4 | Meus empréstimos | `/my-loans` | Qualquer pessoa logada |
| 5 | Empréstimos em aberto | `/operations/loans` | Papel Operações |
| 6 | Cadastrar equipamento | `/operations/equipment/new` | Papel Operações |

**1. Login.** Duas colunas no desktop (5/12 e 7/12), uma no celular. Esquerda: painel indigo 950 com a marca, uma frase do que o sistema faz e os dois números do PRD ("3 itens por pessoa", "14 dias de prazo"). Direita: formulário de 400px com "Entrar", e-mail, senha (com mostrar/ocultar), botão `lg` "Entrar" e mensagem de erro genérica ("E-mail ou senha incorretos"). Sem link de criar conta: cadastro é fechado por convite (ADR-001, 2.7; respaldo no PRD depende da pergunta 5). Recuperação de senha: depende da pergunta 15; sem resposta, o formulário não tem link para isso. Contato de suporte: não entra, sem respaldo no PRD.

**2. Catálogo.** H1 "Catálogo" + linha "M de N equipamentos podem ser pedidos". Quadro de regras (seção 7.2). Linha de filtros: chips de categoria (lista de categorias: depende da pergunta 12) e o toggle "Mostrar só o que está livre". Grid de cards: 3 colunas a partir de 1280px, 2 a partir de 768px, 1 abaixo. Estado vazio: "Nenhum equipamento nesta categoria". O card representa uma unidade; se o equipamento for um modelo com quantidade, a pill vira contagem: depende da pergunta 1.

**3. Detalhe do equipamento.** Breadcrumb "Catálogo › categoria › nome" (categoria: depende da pergunta 12). Duas colunas: principal (fluida) e lateral (360px). Principal: área de ícone de 240px de altura em `--card` com o ícone da categoria em 48px; nome (H1) + pill; descrição limitada a 65 caracteres por linha; ficha com os campos do equipamento (quais: depende da pergunta 12). Lateral: card **Solicitar empréstimo** com prazo padrão de 14 dias, a data "Devolver até" (valor em `--foreground`, peso 600, para ser o dado mais visível do card) e o botão `lg`; card **Seu limite** com o indicador de limite e o texto dele. A data calculada e o que acontece entre solicitar e ter o item em mãos: depende das perguntas 2 e 4. Histórico do item: não entra (pergunta 8). Ao solicitar, o diálogo de confirmação mostra no resumo do que muda o prazo e a contagem resultante ("depois deste, você fica com 3 de 3 itens"; o que entra na contagem depende da pergunta 2).

**4. Meus empréstimos.** H1 + indicador de limite com texto ("Você está com 2 de 3 itens, todos no prazo."). Botão `outline` "Ver catálogo". Lista "Itens com você": uma linha por empréstimo, 88px, com ícone da categoria, nome, código (formato: depende da pergunta 12), barra de prazo com texto e, se a pessoa puder devolver por aqui, botão `sm` "Devolver" (depende da pergunta 3). Se existe uma seção de solicitações pendentes acima dessa lista: depende da pergunta 2. Estado vazio: "Você não está com nenhum item" + link para o catálogo. Histórico de empréstimos encerrados: não entra (pergunta 8).

**5. Empréstimos em aberto.** H1 + "N itens emprestados". No header, o botão "Cadastrar equipamento" (slot de ação, seção 5). Cards de número em linha: Em aberto, Em atraso (borda e número em vermelho de atraso, sempre com o rótulo), Em manutenção. Um quarto card "Vencem em breve" depende da pergunta 13. Chips: Todos, Em atraso, e categorias (lista: depende da pergunta 12). Tabela: Equipamento, Pessoa, Desde, Prazo (barra + texto), Situação (pill), Ação ("Devolver", `outline` `sm`; em linha em atraso, `default` `sm`). Quem pode registrar a devolução aqui: depende da pergunta 3. Ação para pôr em manutenção um item já cadastrado: depende da pergunta 7. Ordenação padrão, como proposta (a final entra na spec de Operações): atrasados primeiro, depois prazo mais próximo. Paginação de 10.

**6. Cadastrar equipamento.** Breadcrumb "Empréstimos em aberto › Cadastrar equipamento" (não existe página `/operations` para servir de primeiro nível). Duas colunas: formulário (até 640px, grid de 2 colunas com gap de 24px, campos largos ocupam as duas) e lateral de 320px. Campos: depende da pergunta 12; o que é unidade e o que é modelo, da pergunta 1. Situação inicial em controle segmentado com Disponível e Manutenção, com a nota "Em manutenção, o item fica visível, mas não pode ser pedido"; uma terceira opção "Fora de uso" depende da pergunta 9. Ações: `default` "Salvar equipamento" e `outline` "Salvar e cadastrar outro". Lateral: **Como vai aparecer no catálogo**, o mesmo componente de card alimentado pelo formulário, e **Cadastrados recentemente** (três linhas, nome e data).

## 7. Navegação, fluxos e regras visíveis

### 7.1 Navegação e fluxos

A navegação lateral separa o que serve a qualquer pessoa (Catálogo e Meus empréstimos, este com a contagem de itens num badge indigo 900) do que é trabalho de Operações (Empréstimos em aberto e Cadastrar equipamento), cada parte com um rótulo próprio. O grupo Operações só aparece para quem tem esse papel; a autorização de verdade é do servidor (ADR-001, 2.7). Se quem é de Operações também pega emprestado (e portanto vê o grupo Colaborador e o contador do header): depende da pergunta 6. Rodapé da sidebar: avatar com iniciais, nome e e-mail, só como identidade; "Sair" fica apenas no menu do usuário no header. Breadcrumb nas telas de profundidade dois (3 e 6).

Fluxos:

- Catálogo → card → Detalhe → Solicitar → diálogo → resultado. Texto do aviso de resultado, tela de destino e se o item já aparece em "Itens com você": depende da pergunta 2.
- Meus empréstimos → "Ver catálogo" → Catálogo.
- Meus empréstimos ou Empréstimos em aberto → "Devolver" → diálogo → linha sai da lista (qual tela tem o botão: pergunta 3). Se o diálogo pergunta o estado do item e se a devolução pode terminar em manutenção: depende da pergunta 7.
- Empréstimos em aberto → "Cadastrar equipamento" (slot de ação do header) → Cadastrar → volta à lista ou limpa o formulário ("Salvar e cadastrar outro").

### 7.2 Onde cada regra do PRD aparece

As quatro regras estão em [`docs/PRD.md`](PRD.md), seção "Regras que Operações já decidiu"; aqui só o lugar de cada uma na interface. Cada uma aparece em texto no quadro de regras do catálogo.

| Regra do PRD | Onde aparece |
|---|---|
| Limite de itens por pessoa | Quando a pessoa chega a 3, o botão de solicitar some do alcance e o motivo aparece escrito. Antes disso, a contagem fica visível em três lugares: no header, no detalhe do item e em Meus empréstimos. O diálogo de confirmação avisa quando o pedido vai completar o limite |
| Prazo padrão | Card de solicitação (data "Devolver até"), barra de prazo em Meus empréstimos e em Operações |
| Atraso bloqueia novo empréstimo | Quadro de regras na variante de bloqueio, no catálogo e no detalhe; solicitar desabilitado com o motivo; linha marcada em Operações |
| Manutenção não aparece como disponível | O item continua listado, sem a opção de pedir, com o estado escrito na pill âmbar. O toggle "Mostrar só o que está livre" o tira da lista, e o cadastro explica a consequência ao escolher esse estado |

Fora da v1 pelo PRD e fora deste layout: reserva com data futura, notificação por e-mail, importação da planilha.

## 8. Movimento e acessibilidade

| Elemento | Propriedade | Duração |
|---|---|---|
| Hover de botão, chip, item de navegação, card | cor de fundo, borda e texto | 150ms `ease-out` |
| Abertura de diálogo e menu | opacidade e escala 0.98 → 1 | 180ms `ease-out` |
| Fechamento | opacidade | 120ms `ease-in` |
| Barra de prazo e indicador ao mudar | largura e cor | 200ms `ease-out` |

Toda transição termina em até 200ms e só acontece em resposta a uma ação da pessoa. O anel de foco aparece e some sem transição. Botão pressionado não se desloca: muda só de cor, como no hover. Linha devolvida sai da lista sem animação de saída; o aviso de resultado diz o que aconteceu. Com `prefers-reduced-motion: reduce` (variante `motion-reduce:` do Tailwind), transições de transform e escala somem e o resto vira troca imediata; skeleton não pulsa.

Acessibilidade: foco sempre visível com o anel da 2.4, nunca removido sem substituto; ordem de tabulação segue a leitura; estado nunca só por cor (pill com texto, linha em atraso com pill e texto, barra com texto); tamanho mínimo de fonte 13px; alvo mínimo da seção 4; cada tela com um H1, landmarks `nav`, `header` e `main`, e link "Pular para o conteúdo"; diálogos prendem e devolvem o foco; mensagens de resultado em `aria-live="polite"`.

## 9. Tom do texto e datas

Fala com a pessoa em segunda pessoa e diz o que fazer em seguida ("Você está com 2 de 3 itens"); botão começa por verbo ("Solicitar empréstimo", "Devolver", "Salvar equipamento"); nada de exclamação, emoji ou desculpa. Erro diz o que aconteceu e o que fazer ("Você tem um item em atraso. Devolva-o para pedir outro."). Todos os textos deste documento são provisórios; a copy final entra na spec (ADR-002, seção 6).

Datas com `Intl.DateTimeFormat('pt-BR')`, exibidas no fuso `America/Sao_Paulo`: `23/10` em lista e tabela do ano corrente, `23/10/2026` no detalhe, no diálogo e em data de outro ano. Prazo relativo ao lado da data: "vence em 5 dias", "vence hoje", "3 dias em atraso"; se a contagem é em dias corridos ou úteis, depende da pergunta 4.

## 10. Dados de exemplo

Fictícios, só para protótipo, teste e seed de dev. E-mails no domínio reservado `example.com`.

| Pessoa | Papel | Situação no exemplo |
|---|---|---|
| Beatriz Fontes | Colaborador | 2 itens, nenhum em atraso |
| Caio Moreira | Colaborador | 1 item, em atraso |
| Denise Araújo | Colaborador | 3 itens, no limite |
| Enzo Paiva | Colaborador | nenhum item |
| Flávia Rocha | Operações | — |

| Código | Equipamento | Categoria | Situação no exemplo |
|---|---|---|---|
| EQ-0107 | Notebook 14 pol. | Notebook | Emprestado (Beatriz) |
| EQ-0108 | Notebook 14 pol. | Notebook | Disponível |
| EQ-0213 | Monitor 27 pol. | Monitor | Emprestado (Denise) |
| EQ-0311 | Câmera mirrorless | Câmera | Emprestado (Caio, em atraso) |
| EQ-0402 | Cabo HDMI 2 m | Cabo | Disponível |
| EQ-0415 | Dock USB-C | Dock / adaptador | Manutenção |
| EQ-0501 | Projetor portátil | Projetor | Disponível |

O formato do código e a lista de categorias são de exemplo: depende da pergunta 12.

## 11. Notas de implementação

- **Tokens** em `src/app/globals.css`: valores hex da seção 2 em `:root` (não em `.dark`, porque só há um tema) e expostos ao Tailwind por `@theme inline` (`--color-background: var(--background)`, `--color-status-overdue: var(--status-overdue)` e assim por diante). Raios e fonte também no `@theme`. A classe `dark` vai fixa no `<html>` para os componentes do shadcn/ui que usam a variante `dark:`.
- **Fonte**: Geist por `next/font/google`, com `variable: '--font-geist-sans'` aplicada no `<html>` e ligada a `--font-sans` no `@theme`. O `next/font` baixa o arquivo no build e o serve do próprio domínio; nada é carregado de CDN no navegador, e a CSP pode manter `font-src 'self'`. O template do `create-next-app` já importa Geist desse módulo; confirmar na tarefa de scaffold.
- **Ícones**: `lucide-react`, importados por nome (seção 5.1). SVG inline, sem fonte de ícone, sem CDN.
- **Sem atributo `style`** em nenhum componente nosso, para a CSP sem `unsafe-inline` (ADR-001, 2.10). Medida dinâmica vira elemento nativo (`<progress>` na barra de prazo) ou classe escolhida por estado (os três segmentos do limite). O `Progress` do shadcn/ui não é usado porque posiciona o preenchimento por `style`. O `Sidebar` é copiado sem o `style` do `SidebarProvider` (seção 5), e o aviso de resultado não usa Sonner. Na tarefa de scaffold, com a CSP ligada, conferir `Select`, `DropdownMenu`, `Sidebar` e `ToggleGroup` (versões recentes podem passar `--gap` por `style`): nenhum `style` no HTML do servidor e nenhum bloqueio no navegador; se houver, parar e levar ao ADR-002. Sugestão a confirmar no scaffold: regra de lint que proíbe a prop `style`.
- **Nada por CDN**: CSS, fonte, ícone e script saem do build.
- **Testes de interface** (Playwright e Testing Library) acham elemento por papel e nome acessível; nenhum atributo só para teste.

## 12. Rastreabilidade de requisitos

Cada requisito do `layout.md` de origem, por seção, e onde este documento cobre. "Substituído" = mesmo requisito, valor nosso.

| Seção de origem | Requisito | Aqui | Tratamento |
|---|---|---|---|
| 1 | Só escuro, sem alternador | 1, 2 | Coberto |
| 1 | Primária escura usada como fundo; cor de ação mais clara | 2.2 | Substituído: indigo 600 é fundo de botão, indigo 400 é link e ícone |
| 1 | Botão primário contornado | 5 | Substituído: primário preenchido; contornado vira `outline` |
| 1 | Elevação por borda, sem sombra pesada | 1 | Coberto |
| 1 | Layout denso | 1, 4 | Substituído: arejado, por decisão da pessoa |
| 1 | Sem gradiente agressivo, emoji, preto ou branco puros | 1, 2.2, 9 | Coberto; sem gradiente nenhum; texto sobre o primário em `#F7F7FF` |
| 1.5 | Neutros de baixa saturação puxados para o azul | 1, 2.1 | Coberto |
| 1.6 | Alinhamento à esquerda, títulos sem recuo | 1 | Coberto |
| 2.1 | Token de moldura da página (`--page`) | — | Não adotado: moldura de protótipo estático, sem papel no app |
| 2.1–2.2 | Fundos, superfícies, texto em níveis, bordas | 2.1 | Substituído: valores próprios, contraste conferido |
| 2.3 | Rampa da cor primária | 2.2 | Substituído: escala do indigo |
| 2.4 | Quatro estados com texto, fundo e borda | 2.3 | Coberto, com valores próprios |
| 2.5 | Rampa neutra | 2.1 | Coberto pelos quatro níveis de texto e três de borda |
| 2.6 | Três níveis de sombra | 1, 5 | Substituído: uma sombra, só em diálogo e menu |
| 2.7 | Três gradientes | 1 | Não adotado: tudo plano |
| 2.8 | Divisor que esmaece nas pontas | 2.1 | Não adotado: divisor sólido `--border` |
| 2.9 | Cor de link e hover | 2.2 | Coberto: indigo 400 → 300 |
| 3 | Família única, pesos, escala, mínimo | 3 | Substituído: Geist, mínimo 13px em vez de 10px |
| 3 | Tamanho da métrica do card de estatística e dos números do hero | 3 | Coberto: papel "Número de destaque" |
| 3 | `text-wrap: pretty` | 3 | Coberto, em parágrafo |
| 3 | Letter-spacing negativo em título | 3 | Não adotado: espaçamento padrão da fonte em todos os papéis, sem ajuste por papel, para manter a Geist como foi desenhada e evitar mais um valor por papel |
| 4.1 | Escala de espaço | 4 | Substituído: múltiplos de 4px |
| 4.2 | Raios | 4 | Coberto, valores próprios |
| 4.3 | Molduras fixas de 1440px por tela | 4, 6 | Substituído: layout responsivo, 1440px como referência |
| 4.4 | Sidebar, header, conteúdo | 4, 5, 7.1 | Coberto: 272px, 72px |
| 4.5 | Alturas de controles | 4 | Coberto, maiores |
| 4.6 | Grids internos por tela | 6 | Coberto em parte: grids de catálogo, detalhe e cadastro definidos; a ficha do detalhe e as colunas da tabela de Operações dependem da pergunta 12 |
| 4.7 | Largura de linha de texto | 6 | Coberto em parte: 65 caracteres na descrição; o painel do login não tem limite próprio |
| 5.1 | Variantes de botão, foco, desabilitado | 5, 2.4 | Coberto |
| 5.2 | Pill de estado | 5 | Coberto |
| 5.3 | Chips de filtro | 5 | Coberto |
| 5.4 | Card nos três estados, só o disponível clicável | 5 | Substituído: todos os estados levam ao detalhe, para ver o prazo; só o disponível oferece solicitar. Nome de quem está com o item depende da pergunta 14 |
| 5.4 | Ícone da categoria e linha de metadado no card | 5 | Coberto: ícone 20px, metadado 14px |
| 5.5 | Input e select | 5 | Coberto |
| 5.6 | Controle segmentado | 5 | Coberto, como `RadioGroup` |
| 5.7 | Tabela com linha em atraso | 5 | Coberto, com pill e filete além da cor |
| 5.8 | Aviso das regras no topo do catálogo | 5, 7.2 | Coberto: quadro de regras |
| 5.9 | Diálogo de confirmação com o que muda | 5 | Coberto: resumo do que muda |
| 5.9 | Backdrop do diálogo | 2.3, 5 | Coberto: `--overlay` |
| 5.10 | Segmentos de limite e barra de prazo | 5 | Coberto; barra por `<progress>` |
| 5.11 | Ícones Phosphor e mapa | 5.1 | Substituído: Lucide (proposta do agente, confirmada com a aprovação do ADR-002, que tem status Proposto) |
| 6.01 | Login dividido, números do PRD | 6 | Coberto |
| 6.01 | Nota de suporte no login | 6 | Não adotado: contato de suporte sem respaldo no PRD |
| 6.01 | Subtítulo do formulário de login | 6 | Não adotado: com dois campos, o título "Entrar" basta |
| 6.01 | Rodapé de versão no painel do login | — | Não adotado: sem respaldo no PRD |
| 6.02 | Catálogo com contagem, aviso, chips, grid | 6 | Coberto |
| 6.02 | Busca e sino no header | 5, 13 | Depende das perguntas 11 e 10 |
| 6.03 | Detalhe: imagem, ficha, card de solicitar, card de itens, diálogo | 6 | Coberto; campos da ficha dependem da pergunta 12 |
| 6.03 | Nota de status no card de itens e destaque do valor "Devolver até" | 5, 6 | Coberto: texto do indicador de limite; data em `--foreground` 600 |
| 6.03 | Bloco "Retirada" e nota de retirada | 6 | Depende da pergunta 2 |
| 6.03 | Histórico do item e "Última devolução" | 13 | Depende da pergunta 8 |
| 6.04 | Lista dos itens em mãos, com prazo e Devolver | 6 | Coberto; botão Devolver depende da pergunta 3 |
| 6.04 | Tabela de histórico do colaborador | 13 | Depende da pergunta 8 |
| 6.05 | Cards de número, chips, tabela, paginação | 6 | Coberto; "Vencem em breve" depende da pergunta 13 |
| 6.05 | Botão de cadastrar no header de Operações | 5, 6 | Coberto: slot de ação do header |
| 6.05 | Indicação de "atualizado agora" | — | Não adotado: a tela busca os dados ao abrir e depois de cada devolução; carimbo de atualização só faz sentido com atualização automática, que o PRD não pede |
| 6.05 | Local do balcão no bloco do usuário | — | Não adotado: dado que o PRD não tem |
| 6.06 | "Um registro por unidade física" | 6 | Depende da pergunta 1 |
| 6.06 | Campos do formulário | 6 | Depende da pergunta 12 |
| 6.06 | Situação "Fora de uso" | 13 | Depende da pergunta 9 |
| 6.06 | Prévia do card, cadastros recentes, ação de salvar e continuar cadastrando | 6 | Coberto, com textos próprios |
| 7 | Grupos da sidebar, item ativo, badge, breadcrumb, fluxos, rotas | 6, 7.1 | Coberto; rotas em inglês |
| 7 | Telas ligadas por âncora | — | Não adotado: é recurso de protótipo estático |
| 8 | Durações curtas, reduced motion | 8 | Coberto |
| 8 | Foco sem transição | 8 | Coberto |
| 8 | Estado pressionado com deslocamento de 1px | 8 | Não adotado: botão pressionado muda só de cor; movimento fica para diálogo e menu |
| 8 | Animação de remoção da linha após devolver | 8 | Não adotado: a linha sai sem animação e o aviso de resultado informa; uma saída animada atrasaria a lista e somaria movimento que o `motion-reduce` teria de desligar |
| 9 | Quatro regras visíveis e fora de escopo | 7.2 | Coberto, apontando para o PRD |
| 10 | Estilo inline no componente | 11 | Não adotado: contradiz o ADR-001, 2.10 (CSP sem `unsafe-inline`) |
| 10 | Fonte e ícones por CDN, design system carregado de bundle externo | 11 | Não adotado: contradiz o ADR-001, 2.10 |
| 10 | Layout por flex/grid + gap | 4 | Coberto |
| 10 | Rótulo de tela em atributo de dados | 11 | Substituído: teste por papel e nome acessível |
| 10 | Dados de exemplo | 10 | Substituído: dados fictícios próprios |
| 10 | Tom da copy, português | 9 | Coberto, com tom e textos próprios |
| 10 | Datas `dd/mmm` | 9 | Substituído: `dd/mm`, número sem abreviação de mês |

## 13. O que este layout não decide

Itens que o layout de origem traz e o PRD não pede, e pontos do desenho que o PRD deixa sem dono. Nenhum entra nas telas até a pergunta correspondente ser respondida.

| Item | Onde aparecia | Pergunta |
|---|---|---|
| Estado do item na devolução e entrada em manutenção de item já cadastrado | Diálogo de devolução e Empréstimos em aberto | 7 |
| Histórico de empréstimos encerrados | Detalhe do item e Meus empréstimos | 8 |
| Situação "Fora de uso" | Cadastro de equipamento | 9 |
| Sino de notificação no app | Header | 10 |
| Busca no header | Header de todas as telas | 11 |
| Campos do equipamento (patrimônio, número de série, local, observações, categorias) | Detalhe e cadastro | 12 |
| "Vencem em breve" | Card e chip em Operações | 13 |
| Nome de quem está com um item emprestado, visto pelo colaborador | Card do catálogo | 14 |
| Recuperação de senha | Login | 15 |
