# Perguntas que o PRD não responde

As lacunas de [`docs/PRD.md`](PRD.md). Enquanto houver pergunta aberta aqui, a
spec correspondente em `docs/specs/` não pode ser aprovada — é o item
"Não decidido" da seção "Fora de escopo / não decidido" do formato em
[`docs/specs/README.md`](specs/README.md).

O agente consulta este arquivo antes de supor qualquer comportamento do
produto. O que ele não pode decidir sozinho está em
[`rules/restrictions.md`](../rules/restrictions.md), seção Autoridade.

Quem responde é o time de Operações, que escreveu o PRD. Cada resposta vira
regra de negócio (RN-xx) na spec da funcionalidade e sai desta lista.

---

1. Um equipamento é uma unidade física individual ou um modelo com quantidade?
   No catálogo, "notebook" é um item específico que uma pessoa leva, ou um tipo
   com dez unidades idênticas?
   tipo: negócio
   por que importa: muda o schema inteiro — um registro por unidade, ou um
   registro de modelo mais uma contagem — e muda o que "disponível" significa
   na tela de catálogo e a que o empréstimo se liga. Todas as cinco telas da
   v1 dependem desta resposta, por isso ela vem primeiro.

2. Solicitar um empréstimo é self-service ou depende de aprovação de Operações?
   O PRD diz que o colaborador "pede um item emprestado" e também que
   Operações "registra devolução no balcão", o que sugere retirada física no
   meio do caminho.
   tipo: negócio
   por que importa: se existir aprovação ou retirada, existe um estado
   intermediário (solicitado → retirado → devolvido) em vez do par
   disponível/emprestado hoje implícito — e o limite de 3 itens por pessoa
   precisa dizer se conta a solicitação pendente ou só o item já em mãos.

3. Quem registra a devolução? O PRD lista "devolver um item que está comigo"
   como ação do colaborador e, duas seções antes, diz que Operações registra a
   devolução no balcão.
   tipo: negócio
   por que importa: são dois fluxos, com telas e permissões diferentes, e a
   regra de atraso depende de qual dos dois grava a data. Se o colaborador
   marca sozinho, ninguém confere que o item voltou de fato.

4. Os 14 dias contam da solicitação ou da retirada, e em dias corridos ou em
   dias úteis?
   tipo: negócio
   por que importa: essa data é a única definição de atraso que o produto tem,
   e atraso bloqueia pegar outro item emprestado — errar a origem ou a
   contagem bloqueia a pessoa errada. Depende da pergunta 2: sem etapa de
   retirada, só existe uma data possível.

5. Quem cria as contas de login, e existe tela para isso na v1? O PRD pede
   "Login" sem dizer de onde vêm os usuários, e não cita gestão de usuários
   nem em "o que precisa existir" nem em "o que NÃO entra nesta versão".
   tipo: negócio, com consequência técnica
   por que importa: o ADR-001 já decidiu cadastro fechado por convite de
   administrador (ver [`docs/adr/001-stack.md`](adr/001-stack.md), seção 2.7) e
   essa decisão precisa de respaldo no PRD, não só na arquitetura. Se não há
   tela de convite na v1, isso tem que estar escrito em "o que NÃO entra"; se
   há, é uma sexta tela que o PRD não listou.

6. Como o sistema distingue Colaborador de Operações — e Operações é um papel
   global na empresa ou um papel por área?
   tipo: técnica
   por que importa: a primeira metade o ADR-001 já respondeu, com tabela de
   membership e três middlewares de tRPC (ver
   [`docs/adr/001-stack.md`](adr/001-stack.md), seções 2.6 e 2.7). A segunda
   metade é o que decide se a multi-tenancy do ADR descreve este produto: se o
   catálogo é um só para a empresa inteira, o `tenant_id` em toda tabela é
   custo sem benefício; se cada área tem o próprio estoque, o ADR está certo e
   a spec precisa dizer quem enxerga o estoque de quem.

7. O que acontece quando um item volta danificado ou incompleto? O PRD diz que
   "equipamento em manutenção não aparece como disponível", mas não diz quem
   coloca o item nesse estado, nem quando.
   tipo: negócio
   por que importa: o estado "em manutenção" já está no PRD sem dono. Se a
   devolução pode terminar em manutenção, o fluxo de devolução da v1 ganha um
   campo e uma decisão de Operações; se não pode, o item volta a disponível
   mesmo quebrado e a próxima pessoa o pega.
