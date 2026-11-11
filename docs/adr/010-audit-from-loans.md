# ADR-010 — Auditoria a partir da spec de solicitar empréstimo

| Campo | Valor |
|---|---|
| Status | Aceito em 2026-11-11, pela pessoa, que responde pelo time ([`rules/restrictions.md`](../../rules/restrictions.md), seção Autoridade), na revisão da spec 001 |
| Data | 2026-11-11 |
| Turma | B |
| Vínculo | [`docs/specs/001-login/spec.md`](../specs/001-login/spec.md), "Fora de escopo"; [`docs/plan-andar-zero.md`](../plan-andar-zero.md), seção 5.5 |
| Substitui | Do [ADR-001](001-stack.md), seção 2.10, o item "Auditoria desde o início". A linha "Auditoria" da tabela não muda. Ao aceitar, a linha de Status do ADR-001 aponta para este ADR |
| Decide | Em que spec a auditoria começa |

---

## 1. Contexto

O ADR-001, seção 2.10, quer uma tabela de auditoria append-only, com ator, tenant, ação e recurso, "desde o início", porque retrofitar a auditoria depois não recupera o passado. O plano do andar zero, seção 5.5, a punha antes da primeira escrita de domínio.

A spec 001, de login, é a primeira que grava dado depois do andar zero: `memberships`, `profiles` e o contador do rate limit. A auditoria pede revisão humana (`rules/restrictions.md`, Bancos e schema), e trazê-la para o login aumentaria uma spec que já carrega Auth, sessão, rate limit e CSP. Na revisão da spec 001, em 2026-11-11, a pessoa decidiu que a auditoria entra com a spec de solicitar empréstimo.

---

## 2. Decisão

A auditoria começa com a spec de solicitar empréstimo, a primeira que grava empréstimo. A tabela continua a do ADR-001, seção 2.10.

O item "Auditoria desde o início" do ADR-001, seção 2.10, passa a ser:

- **Auditoria a partir da spec de solicitar empréstimo** — o que o PRD quer controlar é o empréstimo: quem pegou o quê, e quando devolveu. As escritas da spec 001 ficam sem registro de auditoria. O `created_at` de `memberships` guarda quando cada vínculo nasceu, mas não quem o criou.

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Auditoria na spec 001, como o ADR-001 previa | Soma revisão humana e uma tabela a mais a uma spec que já é a maior da v1 |
| Auditoria só depois da v1 | Perderia o histórico dos empréstimos, que é o que a planilha de hoje não tem |

---

## 4. Consequências

### Fica mais fácil

- A spec 001 fica menor e sai antes.

### Fica mais difícil

- Quem ganhou vínculo, papel ou nome antes da spec de solicitar empréstimo não tem autor registrado. O primeiro administrador nasce do passo do ADR-009, e os demais vínculos nascem do primeiro login, então o autor dessas escritas é previsível.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| Alguém precisa saber quem deu um papel antes de a auditoria existir | O início da auditoria |

---

## 6. O que este ADR não decide

- O formato da tabela e o que cada ação registra. Ficam com a spec de solicitar empréstimo.
