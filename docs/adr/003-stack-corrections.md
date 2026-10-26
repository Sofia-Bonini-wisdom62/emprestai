# ADR-003 — Correções do ADR-001

| Campo | Valor |
|---|---|
| Status | Aceito. O conteúdo foi aprovado como edição do ADR-001: o produto, a multi-tenancy, os nomes e o gatilho em 2026-10-02, com autorização explícita do time; o design em 2026-10-23, pela pessoa. Em 2026-10-23 saiu do ADR-001 para este ADR, a pedido da pessoa, sem mudar nenhuma decisão. Partes substituídas pelo [ADR-005](005-first-tenant-name.md), em 2026-10-26: a linha Seed da seção 2.5 e a linha Primeiro tenant da seção 2.6; onde os dois tratam do mesmo ponto, vale o ADR-005 |
| Data | 2026-10-23 |
| Turma | B |
| Vínculo | [`docs/PRD.md`](../PRD.md) |
| Substitui | Trechos do [ADR-001](001-stack.md), listados na seção 2 |
| Decide | Contexto do produto, motivo da multi-tenancy e nomes que mudaram depois do ADR-001; nenhuma escolha de stack |

---

## 1. Contexto

O ADR-001 foi escrito em 2026-09-14 a partir de `stacks_H.md`, antes de o PRD entrar no repositório, e descrevia um sistema de suporte de TI. Em 2026-10-02 o time o aceitou com correções escritas dentro do próprio texto: o produto do PRD, o motivo da multi-tenancy, nomes que mudaram no Prisma 7, no Supabase e no Next 16, e exemplos do domínio atual. Em 2026-10-23 as menções a Figma também foram trocadas ali dentro.

A prática da disciplina é que ADR aceito não se atualiza, se substitui: a decisão anterior continua legível e a nova diz o que trocou. Por isso o ADR-001 voltou ao texto de 2026-09-14, com só a linha de Status mudada, e as correções estão aqui. Nenhuma biblioteca, versão, porta ou camada muda: o que este ADR troca é contexto, justificativa e nome.

---

## 2. Decisão

Cada subseção abaixo leva o número da seção do ADR-001 que ela corrige. Onde os dois tratam do mesmo ponto, vale este ADR; o resto do ADR-001 continua valendo como está.

### Seção 1 — Contexto

Substitui a seção 1 do ADR-001 inteira.

O projeto é um sistema web interno de empréstimo de equipamentos, desenvolvido como projeto de disciplina, sem cobrança e sem equipe remunerada. Ele substitui a planilha compartilhada que hoje controla quem pegou qual equipamento. Colaborador consulta o catálogo, pede um item emprestado e devolve; Operações cadastra os equipamentos, vê quem está com o quê e acompanha o que está em aberto. A primeira versão tem login, catálogo, solicitar, devolver e a tela de Operações — o produto e suas regras estão em [`docs/PRD.md`](../PRD.md). As condições que moldam a decisão são:

- **Uma equipe só**, sem separação entre front e back, e sem necessidade conhecida de escalar as partes de forma independente.
- **Multi-tenancy desde o início, por decisão deliberada do time — e não por exigência do produto.** O PRD não pede multi-tenancy: ele descreve dois papéis dentro de uma empresa só. A estrutura entra porque o documento de trabalho da turma já a previa (o ADR-001 do colega de turma carrega a mesma decisão, o que confirma a origem) e porque acrescentar `tenant_id` depois exige backfill e revisão de toda query que toca a tabela. O custo é declarado: toda tabela, todo procedimento, toda policy e todo teste de domínio pagam por ela, o vazamento entre tenants passa a ser a falha mais cara do sistema, e o PRD não cobra nada disso. O que confirma ou derruba essa decisão é a pergunta 6 de `docs/perguntas-prd.md` (Operações é papel global ou por área?).
- **Sem domínio corporativo** de e-mail para federar identidade ou filtrar cadastro.
- **Design próprio**, especificado em `docs/layout.md`, que precisa ser reproduzido de perto. Não há Figma neste projeto. As escolhas de identidade visual estão no ADR-002.
- **Contexto acadêmico**, o que permite planos gratuitos e aceita latência de demonstração, mas impõe que o plano mude antes de qualquer uso real.
- **Decisões anteriores mantidas:** tRPC, PostgreSQL no Supabase, Prisma, Supabase Auth com e-mail e senha, e Vitest. O ADR-001 as confirma e preenche o que faltava em volta delas.

### Seção 2.2 — Camada de apresentação

Substitui o item "Tailwind". A decisão de usar Tailwind não muda.

- **Tailwind** — o design próprio de `docs/layout.md` precisa ser reproduzido de perto; biblioteca com visual próprio brigaria com isso.

### Seção 2.5 — Dados e persistência

Substitui três linhas da tabela e o item `connection_limit=1`. As portas e a decisão de limitar a uma conexão por function não mudam.

| Item | Escolha |
|---|---|
| Conexão de runtime | Supavisor, porta 6543, `?pgbouncer=true`; uma conexão por function |
| Conexão de migration | `DIRECT_URL`, porta 5432, lida em `prisma.config.ts` |
| Seed | `prisma/seed.ts`, idempotente, cria o primeiro tenant, `operations` |

- **Uma conexão por function** — obrigatório em serverless: a Vercel escala instâncias em paralelo e cada uma com pool próprio esgota a conexão do projeto.

No Prisma 7 o `directUrl` saiu do `schema.prisma`, e a URL de migration passou a viver em `prisma.config.ts` como `datasource.url = process.env.DIRECT_URL` (sem o helper `env()`, que quebra `prisma generate` no build da Vercel, onde a variável não existe). O limite de uma conexão é `new PrismaPg({ connectionString, max: 1 })`, porque o adapter não lê `connection_limit` da URL.

### Seção 2.6 — Multi-tenancy

Substitui a linha "Primeiro tenant" e acrescenta uma abertura à seção.

A seção 2.6 do ADR-001 implementa a decisão deliberada registrada na seção 1 deste ADR, que vai além do que o PRD pede e segue pendente da pergunta 6 de `docs/perguntas-prd.md`.

| Item | Escolha |
|---|---|
| Primeiro tenant | `operations`, criado no seed |

### Seção 2.7 — Autenticação e autorização

Substitui a linha "Renovação de sessão" e o item "Cadastro fechado por convite". As decisões não mudam.

| Item | Escolha |
|---|---|
| Renovação de sessão | Middleware do Next em toda rota (no Next 16, o arquivo é `proxy.ts`) |

- **Cadastro fechado por convite** — cadastro aberto deixaria qualquer pessoa com a URL criar conta num sistema que guarda o inventário de equipamentos da empresa.

### Seção 2.8 — Testes

Substitui o item "Playwright". A decisão de usar Playwright não muda; mudam os fluxos.

- **Playwright** — os fluxos que travam a operação (login, solicitação de empréstimo, devolução e cadastro de equipamento) precisam ser testados no navegador.

### Seção 2.9 — Hospedagem e operação

Substitui o item "Limite de 60s".

- **Limite de 60s** — qualquer operação em lote (relatório grande, uma importação futura) precisa ser desenhada em lotes. A importação da planilha atual está fora da v1 pelo PRD.

### Seção 2.10 — Segurança

Substitui a linha da `service_role` key e o item correspondente. A decisão não muda: a chave que ignora RLS só existe em código de servidor.

| Item | Escolha |
|---|---|
| Secret key do Supabase (`SUPABASE_SECRET_KEY`) | Somente em código de servidor |

- **Secret key só no servidor** — essa chave ignora RLS; num arquivo que o bundle do cliente alcança, dá acesso total ao banco a qualquer visitante.

O Supabase renomeou as chaves. A pública é `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no lugar da anon) e a secreta é `SUPABASE_SECRET_KEY` (no lugar da `service_role`); ver `.env.example`.

### Seção 3 — Alternativas consideradas

Substitui a linha "Biblioteca de componentes fechada". O descarte não muda.

| Alternativa | Motivo do descarte |
|---|---|
| Biblioteca de componentes fechada (MUI, Mantine) | O design próprio de `docs/layout.md` precisaria ser imposto por cima do visual da biblioteca |

### Seção 4 — Consequências

Substitui, em "O que isso impede de fazer depois sem custo", o item "Processamento longo".

- Processamento longo (importação grande, relatório pesado): estoura o limite de execução.

### Seção 5 — Gatilhos de revisão

Acrescenta um gatilho à tabela do ADR-001; os outros continuam.

| Gatilho | Decisão afetada |
|---|---|
| A resposta da pergunta 6 de `docs/perguntas-prd.md` diz que Operações é papel global | A multi-tenancy sai inteira, e a saída vira um ADR novo |

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Manter as correções dentro do ADR-001, com linha de Revisão e erratas datadas | Foi o que se fez em 2026-10-02 e 2026-10-23. Contraria a prática da disciplina: o texto aceito muda e a decisão anterior deixa de ser legível |
| Deixar o texto de 2026-10-02 como o aceito e aplicar a regra só daqui para frente | Menos trabalho, mas mantém no ADR-001 correções que nunca viraram ADR próprio; a pessoa preferiu refazer |
| Um ADR novo por correção | Um ADR por trecho, nenhum com decisão nova; um só, com uma subseção por trecho, se lê de uma vez |

---

## 4. Consequências

### Fica mais fácil

- O ADR-001 mostra o que foi decidido em 2026-09-14, e cada correção diz o que substituiu e quando.
- Correção futura tem caminho conhecido: ADR novo, e no antigo só a linha de Status muda.

### Fica mais difícil

- Ler a stack exige dois arquivos. O `AGENTS.md`, seção 5, aponta os dois por assunto.
- Quem cita uma seção do ADR-001 que este ADR corrige precisa citar os dois.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| Outra correção de nome ou de versão na stack (por exemplo, o pacote do tRPC, risco R1 de `docs/plan-andar-zero.md`) | Nenhuma deste ADR: a correção vira ADR novo, que diz o que substitui |
| A resposta da pergunta 6 de `docs/perguntas-prd.md` diz que Operações é papel global | Seções 1 e 2.6 deste ADR, além da multi-tenancy do ADR-001 |

---

## 6. O que este ADR não decide

- Nenhuma escolha de stack: biblioteca, versão, porta e camada continuam as do ADR-001.
- Os pontos em aberto do plano do andar zero (R1 a R15 de `docs/plan-andar-zero.md`); o que virar decisão vira ADR novo.
- Identidade visual: é do ADR-002.
- Ambientes, que o ADR-001, seção 6, também não decide.
