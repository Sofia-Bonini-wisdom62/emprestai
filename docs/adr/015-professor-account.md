# ADR-015 — Conta do professor fora do convite

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-11-17, pela pessoa, que responde pelo time ([`rules/restrictions.md`](../../rules/restrictions.md), seção Autoridade): escolheu resolver o conflito por um ADR novo com a exceção ("ADR novo com a exceção"), na conversa com o agente, e aprova este texto ao mesclar o PR que o traz |
| Data | 2026-11-17 |
| Turma | B |
| Vínculo | [`docs/specs/003-seed-data/spec.md`](../specs/003-seed-data/spec.md), RN-13; resposta 35 de [`docs/perguntas-prd.md`](../perguntas-prd.md); [`docs/specs/001-login/spec.md`](../specs/001-login/spec.md), RN-01, RN-13 e CA-06; [ADR-008](008-email-provider.md) |
| Substitui | Do [ADR-001](001-stack.md), seção 2.7, a linha "Cadastro" da tabela, "Fechado, somente por convite de administrador", ganha uma exceção, só para a conta do professor. O item "Cadastro fechado por convite", que o [ADR-003](003-stack-corrections.md) reescreveu, não muda. Ao aceitar, a linha de Status do ADR-001 aponta para este ADR |
| Decide | Como nasce em produção a conta do professor, a única que não nasce por convite |

---

## 1. Contexto

A prática pede que o professor entre no link de produção com a conta dele e a senha padrão da turma (enunciado, seção 07, a conferência no link de produção; briefing da Entrega 3). O enunciado não está no repositório, e por isso é citado pela seção.

Em 2026-11-12, a resposta 35 de `docs/perguntas-prd.md` decidiu que a pessoa cria essa conta no painel do Supabase de produção, e a spec 003 registrou a decisão no RN-13, com as palavras "e não por convite".

O ADR-001, seção 2.7, diz "Cadastro: Fechado, somente por convite de administrador", e o ADR-003 confirma que a decisão não muda. A spec 001 repete a regra no RN-01. A decisão da spec 003 contrariava o ADR-001, e nada reconciliava os dois: a spec 001 não foi emendada, e nenhum ADR tratava da exceção. O ADR pesa mais que a spec (`AGENTS.md`, seção 3), e ADR aceito só se corrige por ADR novo.

Em 2026-11-17, a pessoa escolheu resolver o conflito por este ADR, nestas palavras: "ADR novo com a exceção". No mesmo dia, ela disse que criou a conta: "fiz a conta do professor".

---

## 2. Decisão

| Item | Escolha |
|---|---|
| Conta do professor | Criada pela pessoa no painel do Supabase de produção, em Authentication > Users > Add user, com a senha padrão da turma e o e-mail já confirmado. Não nasce por convite |
| Alcance | Só essa conta. Nenhuma outra nasce pelo Add user |
| Todo outro cadastro | Continua só por convite de administrador (ADR-001, seção 2.7; spec 001, RN-01 e RN-02) |
| Cadastro público | Continua fechado: a tela de login não tem link de criar conta (spec 001, CA-12) |
| Primeiro acesso | É do próprio professor ("O próprio professor", decisão da pessoa de 2026-11-17). A conta nasce sem nome, e é ele quem passa por `/account/setup`. Ninguém entra com a conta dele antes da correção |
| Senha e e-mail | Ficam só no painel. Não entram no git, no Actions nem na conversa com o agente (respostas 35 e 36; spec 003, RN-09 e RN-14) |

A linha "Cadastro" da tabela do ADR-001, seção 2.7, passa a ser:

| Item | Escolha |
|---|---|
| Cadastro | Fechado, somente por convite de administrador. Exceção única: a conta do professor, criada pela pessoa no painel do Supabase de produção (ADR-015) |

- **Por que não por convite**: quem é convidado define a própria senha em `/account/setup` (spec 001, RN-21), e a prática pede que o professor entre com a senha padrão da turma.
- **Por que pela pessoa, no painel**: na v1, só ela acessa o painel de produção (spec 001, RN-05), e o agente não escreve em produção (`rules/restrictions.md`, seções Bancos e schema e Produção). A senha não passa por nenhum arquivo.
- **Por que só essa conta**: o motivo do cadastro fechado continua valendo para todas as outras (ADR-003, seção 2.7). A exceção existe por um pedido da prática, que vale para uma conta.

O resto da conta segue a spec 001: na primeira entrada, ela ganha o vínculo `member` na `default` (RN-13) e, como não tem nome, vai para `/account/setup` (CA-06).

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Convite pelo painel, como o ADR-001, seção 2.7, manda | A pessoa convidada define a própria senha (spec 001, RN-21), e a prática pede a senha padrão da turma. O convite também depende do e-mail do Auth de produção, do ADR-008, que segue Proposto |
| Gravar a conta pelo seed | O seed não roda em produção (ADR-009, seção 1) e recusa banco e Auth fora da máquina. A senha teria de estar em arquivo, contra a seção 01 do enunciado e `rules/restrictions.md`, seção Dados e segredos (resposta 35) |
| Um passo do workflow de produção que cria a conta pela API de administrador do Auth | A senha e o e-mail iriam para secrets do Actions, e o workflow passaria a criar conta, contra a resposta 5 (resposta 35, alternativas descartadas). O passo do ADR-009 só grava a área `default` e o vínculo do primeiro administrador, sem criar conta, e o ADR-013 já deixava a conta do professor fora do workflow (seção 6) |
| Deixar a decisão só na resposta 35 e no RN-13 da spec 003, como estava desde 2026-11-12 | Os dois documentos seguiriam discordando, e o ADR-001 pesa mais que a spec (`AGENTS.md`, seção 3) |
| Abrir o cadastro para o professor criar a própria conta | O cadastro aberto deixa qualquer pessoa com a URL criar conta (ADR-003, seção 2.7), e a senha deixaria de ser a padrão da turma |

---

## 4. Consequências

### Fica mais fácil

- A resposta 35 e o RN-13 da spec 003 deixam de contrariar o ADR-001.
- O professor entra com a senha padrão sem depender do e-mail do ADR-008.

### Fica mais difícil

- Existe uma conta que não passou pelo convite. Quem lê o ADR-001, seção 2.7, precisa ler este ADR junto.
- A conta entra com uma senha que ela não escolheu. O `/account/setup` do primeiro acesso pede só o nome: a senha só muda pelo "Esqueci minha senha" (spec 001, RN-41 e RN-59), que depende do e-mail do ADR-008.
- A criação da conta não deixa rastro no repositório. Ela acontece no painel, e quem a registra é o `ENTREGA.md`.
- Como ninguém entra com a conta antes da correção, nenhum login de prova confere, antes dela, que a conta entra com a senha padrão. A conferência em produção da spec 003 lista esse item ("Fora de escopo", a conferência da pessoa).

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| A correção da prática termina | Se a conta do professor continua, com que senha, ou se é bloqueada no painel |
| Outra conta precisa nascer com a senha definida por quem a cria | O alcance da exceção, que hoje é de uma conta só |
| O ADR-008 é aceito e o convite chega por e-mail em produção | Se uma conta nova com senha combinada ainda precisa do Add user |

---

## 6. O que este ADR não decide

- O e-mail e a senha da conta, que ficam só no painel (respostas 35 e 36).
- O papel da conta, que segue a spec 001, RN-13: `member` na `default`.
- O que acontece com a conta depois da correção.
- Quem confere antes da correção, e como, que a conta entra com a senha padrão.
- O e-mail do Auth de produção, que é do ADR-008.
