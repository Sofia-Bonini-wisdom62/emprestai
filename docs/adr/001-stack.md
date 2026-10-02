# ADR-001 — Stack da aplicação

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 2026-09-14 |
| Turma | B |
| Insumo | `stacks_H.md` (documento de trabalho) |
| Vínculo | [`docs/PRD.md`](../PRD.md) |
| Decide | Arquitetura, linguagem, frameworks, banco, autenticação, multi-tenancy, testes, hospedagem, segurança e qualidade de código |
| Revisão | 2026-10-02, com autorização explícita do time. Status de Proposto para Aceito. Seção 1 (Contexto) corrigida para o produto do PRD, que entrou no repositório depois deste ADR, e multi-tenancy declarada como decisão deliberada. Erratas de nome e de vocabulário, sem mudar decisão: 2.5 (Prisma 7 e nome do primeiro tenant), 2.6 (nome do tenant), 2.7 (`proxy.ts` e domínio), 2.8 e 2.9 (fluxos e exemplos do domínio atual), 2.10 (secret key). Gatilho novo na seção 5. Nenhuma decisão de stack foi alterada ou removida. |

---

## 1. Contexto

O projeto é um sistema web interno de empréstimo de equipamentos, desenvolvido como projeto de disciplina, sem cobrança e sem equipe remunerada. Ele substitui a planilha compartilhada que hoje controla quem pegou qual equipamento. Colaborador consulta o catálogo, pede um item emprestado e devolve; Operações cadastra os equipamentos, vê quem está com o quê e acompanha o que está em aberto. A primeira versão tem login, catálogo, solicitar, devolver e a tela de Operações — o produto e suas regras estão em [`docs/PRD.md`](../PRD.md). As condições que moldam a decisão são:

- **Uma equipe só**, sem separação entre front e back, e sem necessidade conhecida de escalar as partes de forma independente.
- **Multi-tenancy desde o início, por decisão deliberada do time — e não por exigência do produto.** O PRD não pede multi-tenancy: ele descreve dois papéis dentro de uma empresa só. A estrutura entra porque o documento de trabalho da turma já a previa (o ADR-001 do colega de turma carrega a mesma decisão, o que confirma a origem) e porque acrescentar `tenant_id` depois exige backfill e revisão de toda query que toca a tabela. O custo é declarado: toda tabela, todo procedimento, toda policy e todo teste de domínio pagam por ela, o vazamento entre tenants passa a ser a falha mais cara do sistema, e o PRD não cobra nada disso. O que confirma ou derruba essa decisão é a pergunta 6 de `docs/perguntas-prd.md` (Operações é papel global ou por área?).
- **Sem domínio corporativo** de e-mail para federar identidade ou filtrar cadastro.
- **Design vindo do Figma**, que precisa ser reproduzido de perto.
- **Contexto acadêmico**, o que permite planos gratuitos e aceita latência de demonstração, mas impõe que o plano mude antes de qualquer uso real.
- **Decisões anteriores mantidas:** tRPC, PostgreSQL no Supabase, Prisma, Supabase Auth com e-mail e senha, e Vitest. Este ADR as confirma e preenche o que faltava em volta delas.

---

## 2. Decisão

### 2.1 Arquitetura e repositório

| Item | Escolha |
|---|---|
| Arquitetura | Monolito de código |
| Aplicação | Next.js (App Router), front e servidor no mesmo projeto |
| Repositório | Único |
| Deploy | Um projeto na Vercel |
| Camada de servidor | Route Handlers do Next, sem servidor separado |

- **Monolito** — separar front e back criaria dois deploys, dois CI e uma fronteira HTTP para manter, sem equipe separada que justifique.
- **Next.js App Router** — o servidor mora no mesmo projeto do front; a chamada de dados não atravessa domínio nem exige CORS.
- **Repositório único** — o tipo do procedimento e o tipo consumido na tela são o mesmo símbolo TypeScript; em repositórios separados isso viraria arquivo gerado.
- **"Monolito" é de código, não de processo** — na Vercel cada rota vira uma function. O que é único é o codebase e o deploy, não o runtime.

### 2.2 Camada de apresentação

| Item | Escolha |
|---|---|
| Linguagem | TypeScript em modo `strict` |
| Renderização | Client Components como padrão para telas com dados |
| Estado de servidor | TanStack Query via `@trpc/react-query` |
| Estado de cliente | `useState` e Context; sem biblioteca de store |
| Formulários | React Hook Form + `zodResolver` |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |

- **TypeScript `strict`** — sem `strict`, o tipo vindo do tRPC não pega os casos de nulo, que são os que quebram em produção.
- **Client Components como padrão** — Server Components lendo o Prisma direto criariam um segundo caminho de acesso a dado, com duas checagens de permissão para manter em sincronia. Um caminho só é mais fácil de auditar.
- **TanStack Query pelo adapter do tRPC** — cache, revalidação e loading já vêm resolvidos e tipados a partir do procedimento.
- **Sem biblioteca de store** — o que sobra de estado de cliente (filtro, modal, wizard) cabe em `useState`.
- **React Hook Form + zodResolver** — o mesmo schema Zod valida o formulário e a entrada do procedimento; a regra é escrita uma vez.
- **Tailwind** — biblioteca com visual próprio brigaria com o design do Figma.
- **shadcn/ui** — copia o componente para o repositório em vez de escondê-lo atrás de API de biblioteca; customizar não vira luta contra a dependência.

### 2.3 Camada de servidor

| Item | Escolha |
|---|---|
| Padrão de API | tRPC |
| Endpoint | Route Handler em `app/api/trpc/[trpc]/route.ts` |
| Organização | `src/server/api/routers/<dominio>.ts`, um router por domínio |
| Camadas | Router (procedimento) → Service → Prisma |
| Validação de entrada | Zod no `.input()` de todo procedimento |
| Serialização | superjson |
| Contexto de request | Sessão, `tenant_id`, `role` e cliente Prisma montados no `createContext` |
| Server Actions | Não usadas |

- **tRPC** — com front e servidor no mesmo TypeScript, o tipo do retorno chega na tela sem geração de código nem contrato escrito à mão.
- **Um router por domínio** — organizar por camada técnica espalha cada feature em pastas distantes; por domínio, a feature inteira fica junta.
- **Service separado do procedimento** — o procedimento cuida de entrada, contexto e permissão; a regra de negócio no service é testável sem montar contexto de tRPC.
- **Zod em todo `.input()`** — sem ele o procedimento aceita `unknown` e a validação vira `if` manual.
- **superjson** — sem transformer, `Date` e `Decimal` chegam como string e cada componente refaz a conversão.
- **Contexto montado uma vez** — resolver sessão e tenant no `createContext` evita que cada procedimento repita a leitura do cookie, que é onde alguém esquece e abre buraco.
- **Sem Server Actions** — seria um segundo caminho de mutação, com outra validação e outra checagem de permissão.

### 2.4 Contrato e tipos

| Item | Escolha |
|---|---|
| Fonte da verdade | O `AppRouter` do tRPC |
| Consumo no cliente | `RouterInputs` e `RouterOutputs` inferidos, sem tipo escrito à mão |
| Versionamento | Nenhum |
| Formato de erro | `TRPCError` com código, tratado por `errorFormatter` |
| Paginação de listas | Cursor, via `useInfiniteQuery` |
| Consumidor externo | Fora de escopo |
| Tempo real | Fora de escopo |

- **`AppRouter` como fonte da verdade** — mudar o retorno de um procedimento quebra o build da tela que o consome, na hora.
- **Tipos inferidos** — interface de resposta escrita à mão recria a duplicação que o tRPC elimina.
- **Sem versionamento** — cliente e servidor sobem no mesmo deploy; nunca existem duas versões em produção ao mesmo tempo.
- **`TRPCError` com `errorFormatter`** — formato único de erro para a tela tratar sem ler string de mensagem.
- **Cursor** — offset fica lento e duplica registro sob escrita concorrente; `useInfiniteQuery` já espera cursor.
- **Sem consumidor externo e sem tempo real** — se surgir app mobile ou integração de terceiro, será preciso expor REST ao lado. Function serverless não mantém conexão aberta; atualização de tela é polling do TanStack Query.

### 2.5 Dados e persistência

| Item | Escolha |
|---|---|
| Banco | PostgreSQL gerenciado pelo Supabase |
| ORM | Prisma |
| Dono do schema | Prisma Migrate (único) |
| RLS, policies e triggers | SQL bruto dentro das migrations do Prisma |
| Instância do Prisma | Singleton global, para sobreviver ao hot reload |
| Conexão de runtime | Supavisor, porta 6543, `?pgbouncer=true`; uma conexão por function |
| Conexão de migration | `DIRECT_URL`, porta 5432, lida em `prisma.config.ts` |
| Seed | `prisma/seed.ts`, idempotente, cria o primeiro tenant, `operations` |

- **Postgres no Supabase** — traz Auth e Storage sem operar servidor de banco.
- **Prisma** — tipagem gerada a partir do schema evita divergência entre modelo e código e alimenta o tipo que o tRPC devolve.
- **Prisma Migrate como dono único** — dois donos de schema no mesmo banco se sobrescrevem, e é assim que o ambiente diverge de produção sem ninguém notar.
- **Policies em SQL na migration** — o Prisma não modela RLS, policy nem trigger; esses objetos precisam entrar na mesma linha do tempo versionada, não como script aplicado à mão pelo painel.
- **Singleton do Prisma** — sem ele, cada hot reload do Next abre um cliente novo até esgotar a conexão.
- **Uma conexão por function** — obrigatório em serverless: a Vercel escala instâncias em paralelo e cada uma com pool próprio esgota a conexão do projeto.

Errata de 2026-10-02, sem mudar decisão: no Prisma 7 o `directUrl` saiu do `schema.prisma`, e a URL de migration passou a viver em `prisma.config.ts` como `datasource.url = process.env.DIRECT_URL` (sem o helper `env()`, que quebra `prisma generate` no build da Vercel, onde a variável não existe). O limite de uma conexão é `new PrismaPg({ connectionString, max: 1 })`, porque o adapter não lê `connection_limit` da URL. As portas e a decisão de limitar a uma conexão continuam as mesmas.
- **Seed idempotente** — seed que só funciona em banco vazio não serve para ambiente de teste que roda várias vezes.

### 2.6 Multi-tenancy

Esta seção implementa a decisão deliberada registrada na seção 1 (Contexto), que vai além do que o PRD pede e segue pendente da pergunta 6 de `docs/perguntas-prd.md`.

| Item | Escolha |
|---|---|
| Modelo | Tenant discriminado por coluna, banco único |
| Coluna | `tenant_id` em toda tabela de domínio |
| Vínculo usuário–tenant | Tabela `memberships (user_id, tenant_id, role)` |
| Primeiro tenant | `operations`, criado no seed |
| Origem do tenant | Resolvido no `createContext` a partir da sessão, nunca do input |
| Aplicação do filtro | `tenantProcedure` injeta o `tenant_id` no service |

- **Coluna em banco único** — schema por tenant multiplicaria cada migration pelo número de tenants; isolamento lógico basta para o escopo.
- **`tenant_id` em toda tabela** — tabela sem a coluna não pode ser protegida por policy e vira o buraco por onde o dado vaza.
- **Tabela de membership** — a mesma pessoa pode ter papel diferente em cada área; papel gravado no usuário não representa isso.
- **Tenant vindo da sessão** — se o cliente manda o tenant no input, trocar o valor é toda a exploração necessária.
- **Filtro por middleware** — depender de cada service lembrar do `where: { tenantId }` é depender de ninguém esquecer nunca.
- **Estrutura desde o primeiro schema** — adicionar `tenant_id` depois exige backfill e revisão de toda query que toca a tabela.

### 2.7 Autenticação e autorização

| Item | Escolha |
|---|---|
| Provedor de identidade | Supabase Auth, e-mail e senha |
| Cadastro | Fechado, somente por convite de administrador |
| Integração com o Next | `@supabase/ssr` |
| Sessão no navegador | Cookie `httpOnly`, escrito pelo `@supabase/ssr` |
| Renovação de sessão | Middleware do Next em toda rota (no Next 16, o arquivo é `proxy.ts`) |
| Autorização | Middlewares do tRPC: `protectedProcedure`, `tenantProcedure`, `adminProcedure` |
| RLS | Habilitado em todas as tabelas, deny by default |
| Papel do RLS | Defesa em profundidade, não autorização primária |

- **E-mail e senha, sem SSO** — não há domínio corporativo para federar.
- **Cadastro fechado por convite** — cadastro aberto deixaria qualquer pessoa com a URL criar conta num sistema que guarda o inventário de equipamentos da empresa.
- **`@supabase/ssr` com cookie `httpOnly`** — mesma origem faz o cookie funcionar até em `*.vercel.app`, e o token nunca fica legível por JavaScript. É a vantagem concreta do monolito neste projeto.
- **Middleware renovando a sessão** — sem ele o token expira no meio da navegação e o usuário é deslogado sem motivo aparente.
- **Três middlewares em vez de biblioteca de permissão** — as regras são "está logado", "pertence ao tenant" e "é administrador"; uma camada de política seria conceito a mais para aprender.
- **Autorização no servidor, não no RLS** — o Prisma conecta com um role dono das tabelas, que bypassa RLS por padrão. Fazer as policies valerem exigiria `SET LOCAL role` e `SET LOCAL request.jwt.claims` em transação a cada request, com custo por chamada e atrito com o pooler.
- **RLS ligado mesmo assim** — se uma credencial vazar ou um procedimento esquecer o middleware, a policy é a última barreira. Deny by default garante que tabela nova nasce fechada.

### 2.8 Testes

| Item | Escolha |
|---|---|
| Runner | Vitest, único para servidor e componentes |
| Componentes | Testing Library |
| Integração de banco | Testcontainers com Postgres real |
| Teste de procedimento | `createCaller` do tRPC, chamando o router direto |
| E2E de interface | Playwright |
| Teste obrigatório de isolamento | Um caso por procedimento: tenant A não enxerga dado de tenant B |
| Meta de cobertura | Sem percentual; caminhos críticos obrigatórios |

- **Vitest único** — um projeto, um runner, a mesma config do build.
- **Testcontainers com Postgres real** — mockar o Prisma testa o mock. Constraint, cascade, transação e policy só falham contra Postgres de verdade.
- **`createCaller`** — testa o procedimento com contexto montado à mão, incluindo os middlewares, sem subir servidor HTTP.
- **Playwright** — os fluxos que travam a operação (login, solicitação de empréstimo, devolução e cadastro de equipamento) precisam ser testados no navegador.
- **Teste de isolamento por procedimento** — vazamento entre tenants precisa ser verificado por teste, não por revisão.
- **Sem meta de percentual** — meta de cobertura produz teste escrito para subir número; caminho crítico é critério verificável.

### 2.9 Hospedagem e operação

| Item | Escolha |
|---|---|
| Hospedagem | Vercel, um projeto, plano Hobby |
| Região das functions | Padrão do Hobby (Estados Unidos) |
| Região do Supabase | `sa-east-1` (São Paulo), plano gratuito |
| Limite de execução | 60s por request |
| Fila e agendamento | Fora de escopo; tudo roda dentro do request |
| Configuração | Variáveis de ambiente validadas com Zod no boot |
| Log | Estruturado em JSON, com `request_id` e `tenant_id` |
| Rastreamento de erro | Sentry |
| CI | GitHub Actions |
| Migration em deploy | `prisma migrate deploy` em job do GitHub Actions, antes do deploy |

- **Vercel, um projeto** — o Next é o caso nativo da plataforma; build, preview e roteamento funcionam sem adapter.
- **Plano Hobby** — cobre uso pessoal não-comercial, que é o caso. Se o sistema sair do contexto acadêmico, o plano precisa mudar antes.
- **Região padrão** — São Paulo só existe no Pro; cada query paga ida e volta transatlântica. Aceitável em demonstração, primeiro item a mudar em uso real.
- **Supabase gratuito** — projeto ocioso pode ser pausado; confirmar o estado antes de uma apresentação.
- **Limite de 60s** — qualquer operação em lote (relatório grande, uma importação futura) precisa ser desenhada em lotes. A importação da planilha atual está fora da v1 pelo PRD.
- **Sem fila** — envio de e-mail e integração externa rodam dentro do request e seguram a resposta.
- **Env validado com Zod** — falhar na subida é melhor que `undefined` virando comportamento silencioso. Variáveis `NEXT_PUBLIC_` vão para o bundle e ficam separadas das de servidor.
- **Log com `tenant_id`** — investigar incidente multi-tenant sem filtrar por tenant é procurar no escuro.
- **Migration no CI, não no boot** — em serverless várias instâncias sobem em paralelo e tentariam migrar ao mesmo tempo.

### 2.10 Segurança

| Item | Escolha |
|---|---|
| Cabeçalhos HTTP | Configurados em `next.config.js` |
| CSP | Restritiva, sem `unsafe-inline` |
| Rate limit | Por IP e por usuário, com contador no Postgres |
| Segredos | Environment variables da Vercel; nada secreto com prefixo `NEXT_PUBLIC_` |
| Secret key do Supabase (`SUPABASE_SECRET_KEY`) | Somente em código de servidor |
| Auditoria | Tabela append-only com ator, tenant, ação e recurso |

- **Cabeçalhos no `next.config.js`** — cabeçalho ausente é achado previsível e barato de evitar.
- **CSP restritiva** — o cookie é `httpOnly`, mas um XSS ainda faz request autenticado em nome do usuário; a CSP é o que impede.
- **Rate limit em Postgres** — contador em memória não funciona em serverless: cada instância tem o seu e o limite nunca é atingido.
- **Secret key só no servidor** — essa chave ignora RLS; num arquivo que o bundle do cliente alcança, dá acesso total ao banco a qualquer visitante.

Errata de 2026-10-02, sem mudar decisão: o Supabase renomeou as chaves. A pública é `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no lugar da anon) e a secreta é `SUPABASE_SECRET_KEY` (no lugar da `service_role`); ver `.env.example`. A decisão continua a mesma: a chave que ignora RLS só existe em código de servidor.
- **Auditoria desde o início** — retrofitar log de auditoria depois não recupera o passado.

### 2.11 Qualidade de código

| Item | Escolha |
|---|---|
| Lint e formatação | ESLint + Prettier |
| Hook de pré-commit | lint-staged + husky, apenas lint e formatação |
| Convenção de commit | Nenhuma automação; mensagem escrita pela pessoa |

- **ESLint + Prettier** — com repositório único, uma config só vale para tudo.
- **Pré-commit só de lint** — barra o erro trivial antes do CI sem interferir na mensagem de commit.
- **Sem commitlint** — validação de formato seria cerimônia sem changelog gerado para justificar.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Front e API em projetos separados | Criaria fronteira HTTP, CORS e dois deploys sem equipe separada para justificar |
| REST com OpenAPI gerado | Passo de geração e cliente versionado que o tRPC dispensa dentro de um projeto só |
| GraphQL | Custo de schema, resolver e cache não se paga no volume de telas atual |
| Server Actions para mutação | Segundo caminho de mutação, com outra validação e outra checagem de permissão |
| Server Components buscando dado direto no Prisma | Segundo caminho de leitura, com a checagem de tenant duplicada em outro lugar |
| RLS como autorização primária | O Prisma bypassa RLS por padrão; fazer valer exigiria transação com `SET LOCAL` a cada request |
| Acesso a dado pelo cliente do Supabase em vez do Prisma | Deixaria RLS como autorização, mas espalharia o acesso em dois caminhos e tiraria o tipo do Prisma de dentro do tRPC |
| Cadastro aberto por e-mail | Sem domínio corporativo para filtrar, qualquer pessoa com a URL criaria conta |
| SSO corporativo (OIDC/SAML) | Não há e-mail corporativo para federar |
| Sessão em `localStorage` pelo `supabase-js` | Legível por XSS, e desnecessário: mesma origem permite cookie `httpOnly` |
| Supabase CLI como dono das migrations | Dois donos de schema no mesmo banco se sobrescrevem |
| CASL ou biblioteca de política | As regras cabem em três middlewares de tRPC; a camada extra seria conceito a mais |
| Zustand ou Redux | O estado de cliente que sobra depois do TanStack Query é pequeno demais |
| Biblioteca de componentes fechada (MUI, Mantine) | O design vem do Figma e precisaria ser imposto por cima do visual da biblioteca |
| Fila (BullMQ, pg-boss) | Sem volume assíncrono conhecido, e worker de vida longa não roda na Vercel |
| Schema ou banco por tenant | Multiplicaria cada migration pelo número de tenants sem exigência que justifique |
| Prisma mockado nos testes | Testa o mock; constraint, transação e policy não são exercitadas |

---

## 4. Consequências

### Fica mais fácil

- Mudar o retorno de um procedimento quebra o build da tela que o consome, na hora, sem passo de geração.
- Sessão segura sem esforço: mesma origem permite cookie `httpOnly` sem domínio próprio e sem CORS.
- Uma feature inteira cabe em um PR, num repositório só.
- Menos infraestrutura: um projeto na Vercel, um CI, um runner de teste.
- Deploy atômico: tela e servidor sobem juntos, nunca há cliente de uma versão falando com servidor de outra.

### Fica mais difícil

- Escalar as partes de forma independente: front e servidor sobem sempre juntos.
- Segurar a fronteira servidor/cliente: um import errado leva chave secreta para o bundle, e o compilador não avisa em todos os casos.
- Aproveitar Server Components: buscar tudo por tRPC descarta o principal recurso do App Router.
- Latência: functions nos EUA e banco em São Paulo, cada query paga a travessia.
- Cold start na primeira invocação depois de ociosidade.
- Toda operação precisa caber em 60s; importação e relatório viram lotes.
- Envio de e-mail e integração externa seguram a resposta do request.
- Manter middlewares e RLS coerentes exige disciplina; policy desatualizada dá falsa sensação de proteção.

### O que isso impede de fazer depois sem custo

- Atender consumidor não-TypeScript (app mobile nativo, integração de terceiro, webhook tipado): seria preciso expor REST ao lado do tRPC.
- Funcionalidade com conexão aberta (notificação em tempo real, streaming de log): a Vercel não suporta WebSocket.
- Processamento longo (importação grande, relatório pesado): estoura o limite de execução.
- Trabalho agendado ou assíncrono: exige fila e um lugar para o worker rodar, que não é a Vercel.
- Separar o servidor do front depois: o acoplamento de tipo entre tela e router é o que torna a separação trabalhosa.
- Trocar Prisma por outro ORM: migrations e SQL de RLS estão dentro do Prisma Migrate.
- Sair do Supabase: Auth, banco e políticas estão acoplados ao projeto.
- Adicionar `tenant_id` a uma tabela criada sem ele: exige backfill e revisão de toda query que a toca.
- Federar com identidade corporativa depois: exige migrar os usuários já cadastrados por e-mail e senha.

### Dependência do contexto acadêmico

O plano Hobby da Vercel só vale enquanto o projeto for didático. Se a empresa passar a usar o sistema, é preciso migrar para Pro antes, e a região das functions deve ir para São Paulo no mesmo movimento.

---

## 5. Gatilhos de revisão

Este ADR deve ser revisitado se qualquer um destes fatos mudar:

| Gatilho | Decisão afetada |
|---|---|
| O sistema passa a ser usado fora da disciplina | Plano Hobby, região das functions, plano gratuito do Supabase |
| Surge consumidor não-TypeScript (mobile, integração) | tRPC como único padrão de API |
| Surge exigência de tempo real | Ausência de WebSocket na Vercel |
| Surge processamento que não cabe em 60s ou trabalho agendado | Ausência de fila e de worker |
| A empresa passa a ter domínio de e-mail corporativo | Cadastro por convite e ausência de SSO |
| O número de tenants cresce com exigência de isolamento físico | Tenant por coluna em banco único |
| A resposta da pergunta 6 de `docs/perguntas-prd.md` diz que Operações é papel global | A multi-tenancy sai inteira, e a saída vira um ADR novo |

---

## 6. O que este ADR não decide

- Modelagem de domínio, entidades e relacionamentos.
- Design system, tokens e identidade visual.
- Papéis e matriz de permissão dentro de cada tenant.
- Provisionamento de tenant: quem cria, como se convida usuário.
- Provedor de e-mail transacional e demais integrações.
- Estratégia de backup, retenção e plano de recuperação.
- Ambientes (quantos, como são promovidos) e política de branch.
- Feature flags.
- Observabilidade além de log e erro (métrica, tracing distribuído).
- LGPD: base legal, política de retenção e fluxo de exclusão de dados.
- SLO, meta de latência e orçamento de custo.
