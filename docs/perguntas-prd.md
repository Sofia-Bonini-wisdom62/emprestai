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

Nas perguntas 8 a 14, "layout de referência" é o `layout.md` de Leticia
Nascimento, citado em [`docs/layout.md`](layout.md).

---

1. Um equipamento é uma unidade física individual ou um modelo com quantidade?
   No catálogo, "notebook" é um item específico que uma pessoa leva, ou um tipo
   com dez unidades idênticas?
   tipo: negócio
   por que importa: muda o schema inteiro — um registro por unidade, ou um
   registro de modelo mais uma contagem — e muda o que "disponível" significa
   na tela de catálogo e a que o empréstimo se liga. Todas as telas da v1
   (seis em [`docs/layout.md`](layout.md)) dependem desta resposta, por isso
   ela vem primeiro.

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
   há, é uma tela a mais que o PRD não listou.

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

8. A v1 mostra histórico de empréstimos já encerrados? O PRD diz "cada pessoa
   vê os próprios empréstimos" sem dizer se são só os em aberto, e o layout de
   referência traz histórico em dois lugares: no detalhe do item (todas as
   pessoas que já o pegaram) e em Meus empréstimos (o que a pessoa já devolveu).
   tipo: negócio
   por que importa: histórico por item mostra a qualquer colaborador quem pegou
   o quê, o que é decisão de privacidade e se liga à pergunta 6; histórico
   próprio muda Meus empréstimos de uma lista para duas e exige consultar
   empréstimos encerrados. Sem resposta, `docs/layout.md` não desenha nenhum dos
   dois.

9. Existe uma situação "fora de uso" além de disponível, emprestado e em
   manutenção? O layout de referência a oferece como situação inicial no
   cadastro de equipamento; o PRD só cita manutenção.
   tipo: negócio
   por que importa: é um valor a mais no estado do equipamento no schema, e
   muda o catálogo (o item fora de uso aparece ou some?) e o que Operações faz
   com um item que não volta mais, como baixa de patrimônio. Liga-se à
   pergunta 7 (quem põe o item em manutenção, e quando).

10. Existe notificação dentro do aplicativo? O PRD tira da v1 a notificação por
    e-mail e não fala da notificação no app; o layout de referência põe um sino
    no header.
    tipo: negócio
    por que importa: notificação no app é funcionalidade inteira, com tabela,
    regra de quando dispara (prazo perto do fim, atraso, devolução registrada)
    e marcação de lida, e o ADR-001 (seção 2.9) não tem fila. Sem resposta, o
    header fica sem sino.

11. Existe busca, e o que ela procura? O layout de referência põe um campo de
    busca no header de todas as telas, sem dizer se encontra equipamento por
    nome, por código ou também pessoa, na tela de Operações.
    tipo: negócio
    por que importa: buscar pessoa expõe quem está com o quê e se liga às
    perguntas 6 e 14; buscar por código depende da pergunta 12; o escopo
    decide se a busca é global ou um filtro de cada tela, e se o banco precisa
    de índice de texto. Sem resposta, o catálogo tem só os filtros por
    categoria e por disponibilidade.

12. Quais dados um equipamento tem? O PRD fala em "cadastra equipamentos" e
    cita notebooks, monitores, cabos e câmeras, sem dizer os campos. O layout
    de referência pede nome, categoria, patrimônio, número de série, local de
    retirada e observações.
    tipo: negócio
    por que importa: define o schema do equipamento, o formulário de cadastro,
    o que o card e o detalhe mostram, o que é obrigatório e o que é único (o
    patrimônio identifica a unidade?), e se as categorias são uma lista fixa ou
    cadastrável. Depende da pergunta 1: modelo com quantidade não tem número de
    série por registro.

13. Operações quer ver os empréstimos que estão para vencer, e com quantos
    dias de antecedência? O layout de referência tem um indicador e um filtro
    "vencem em breve" na tela de Operações; o PRD só pede os empréstimos em
    aberto.
    tipo: negócio
    por que importa: é um número e um filtro a mais na tela de Operações, e o
    limite em dias é regra de negócio, não de layout. Depende da pergunta 4,
    que define a contagem dos dias. Sem resposta, a tela mostra só em aberto,
    em atraso e em manutenção.

14. O colaborador vê quem está com um item emprestado? O layout de referência
    mostra o nome da pessoa e a data de devolução no card do catálogo.
    tipo: negócio
    por que importa: é dado de uma pessoa visível para todas as outras, o que é
    decisão de privacidade de Operações, e se liga à pergunta 6 (quem enxerga o
    estoque de quem) e à pergunta 8 (o histórico por item também mostra quem
    pegou). Sem resposta, o card mostra só "Emprestado" e a data de
    volta.

15. Existe recuperação de senha na v1? O PRD pede login com e-mail e senha e
    não diz o que acontece quando a pessoa esquece a senha.
    tipo: negócio, com consequência técnica
    por que importa: sem recuperação, cada senha esquecida vira um pedido a quem
    administra as contas, o que se liga à pergunta 5 (quem cria as contas). Com
    recuperação, entram o link no login, o e-mail de redefinição e a página que
    recebe o link, e o ADR-001 já exige que esse fluxo rode no servidor. Sem
    resposta, o login não oferece recuperação.
