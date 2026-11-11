# Perguntas que o PRD não responde

As lacunas de [`docs/PRD.md`](PRD.md). Enquanto houver pergunta aberta aqui, a
spec correspondente em `docs/specs/` não pode ser aprovada — é o item
"Não decidido" da seção "Fora de escopo / não decidido" do formato em
[`docs/specs/README.md`](specs/README.md).

O agente consulta este arquivo antes de supor qualquer comportamento do
produto. O que ele não pode decidir sozinho está em
[`rules/restrictions.md`](../rules/restrictions.md), seção Autoridade.

Quem responde é o time. O PRD foi escrito por Operações; neste projeto de
disciplina, a pessoa que conduz o trabalho responde pelo time, e cada resposta
diz quem decidiu e quando. O agente acrescenta perguntas, nunca respostas. O arquivo tem duas
partes. **Abertas** guarda o que ainda não tem resposta. **Respondidas,
aguardando spec** guarda a resposta, quem decidiu e quando, o custo aceito
quando houver e a spec em que ela vira regra de negócio (RN-xx). A resposta
fica nessa parte até a spec da funcionalidade a transformar em RN-xx, ou em
item de "Fora de escopo" quando a resposta tira algo da v1, e só então sai
desta lista.

A numeração não muda: outros documentos citam "pergunta 6", "pergunta 9".
Quando parte de uma pergunta foi respondida e parte não, o que ficou aberto
vira sub-pergunta, com o número de origem e uma letra: 4b é o que sobrou da 4.

Em todo o arquivo, "spec 001-telas" é a spec de telas do repositório de
Guilherme (`guinacarelli2/emprestai`). Nas perguntas 8 a 14 e nas
sub-perguntas delas, "layout de referência" é o `layout.md` de Leticia
Nascimento, citado em [`docs/layout.md`](layout.md). Nas respostas 5, 6 e 23,
"modelo da Leticia" é o `spec/modelo-banco-prd.md`, seção "Decisões
confirmadas pelo usuário", e o `prisma/schema.prisma` do repositório dela
(`LeleNascimennto/empresTI`).

---

## Abertas

4b. O que acontece quando o vencimento cai num dia em que o balcão está
    fechado?
    tipo: negócio
    por que importa: os 14 dias são corridos (pergunta 4), então o vencimento
    pode cair em fim de semana ou feriado. O PRD põe a devolução no balcão de
    Operações; se ele está fechado no dia, a pessoa entra em atraso sem ter
    onde devolver, e atraso bloqueia pegar outro item. Liga-se à pergunta 3: o
    colaborador também registra a devolução sozinho, em Meus empréstimos. Sem
    resposta, `docs/layout.md` mostra a data calculada, sem ajuste.

7. O que acontece quando um item volta danificado ou incompleto? O PRD diz que
   "equipamento em manutenção não aparece como disponível", mas não diz quem
   coloca o item nesse estado, nem quando.
   tipo: negócio
   por que importa: o estado "em manutenção" já está no PRD sem dono. Se a
   devolução pode terminar em manutenção, o fluxo de devolução da v1 ganha um
   campo e uma decisão de Operações; se não pode, o item volta a disponível
   mesmo quebrado e a próxima pessoa o pega.

9b. O item fora de uso aparece no catálogo?
    tipo: negócio
    por que importa: a situação existe (pergunta 9), mas a resposta não diz se
    o item fora de uso some do catálogo ou fica listado sem a opção de pedir,
    como o item em manutenção (pergunta 16). Muda a contagem "M de N
    equipamentos podem ser pedidos", o filtro do catálogo, se o detalhe do
    item continua acessível e o que a prévia do cadastro mostra quando
    Operações escolhe essa situação. Liga-se à pergunta 7 (quem põe o item em
    manutenção, e quando). Sem resposta, `docs/layout.md` não desenha o item
    fora de uso no catálogo.

11c. A busca do catálogo procura só pelo nome, ou também por patrimônio? E ela
     aparece em Meus empréstimos?
     tipo: negócio
     por que importa: a resposta da 11b diz que o catálogo tem busca, e a fonte
     só traz o placeholder "Buscar equipamento". O protótipo do mesmo
     repositório repete o campo em Meus empréstimos, onde o layout de
     referência só tem breadcrumb e o botão "Pegar emprestado". Sem resposta,
     `docs/layout.md` procura pelo nome do equipamento, e só no catálogo.

12b. O detalhe do item mostra uma descrição curta que o cadastro não tem.
     Descrição e observações são o mesmo campo, e o colaborador vê esse texto?
     tipo: negócio
     por que importa: se são o mesmo campo, o que Operações anota sobre o item
     aparece para todo colaborador no detalhe; se são campos diferentes, o
     cadastro ganha um campo que a resposta à pergunta 12 não lista. Sem
     resposta, o detalhe não mostra descrição nem observações.

12d. Categoria criada pode ser renomeada ou excluída? E o que acontece com os
     equipamentos dela?
     tipo: negócio
     por que importa: a resposta da 12c deixa Operações criar categoria na v1,
     mas não diz se um nome errado pode ser corrigido, nem o que acontece com
     um equipamento cuja categoria some. Muda o schema e a tela de cadastro.
     Sem resposta, `docs/layout.md` só desenha a criação.

13b. A janela de 3 dias vale para o indicador e também para o filtro? O layout
     de referência e a spec 001-telas têm, além do indicador, um filtro
     "Vencem esta semana", que é outra janela.
     tipo: negócio
     por que importa: com duas janelas na mesma tela, um empréstimo que vence
     em cinco dias entra no filtro e fica fora do indicador. O número de dias
     é regra de negócio, não de layout. Sem resposta, a tela de Operações tem
     o indicador de 3 dias e não tem o filtro.

13c. Nos limites da janela de 3 dias: o que vence hoje entra, e um empréstimo já
     em atraso também conta como "vence em breve"?
     tipo: negócio
     por que importa: os limites mudam o número do indicador e quem Operações
     procura primeiro. Liga-se à pergunta 4 (dias corridos). Sem resposta,
     `docs/layout.md` conta só empréstimos ainda no prazo, e os atrasados ficam
     só em "Em atraso".

17. Quem põe em "Fora de uso" um item já cadastrado, e ele pode voltar a ficar
    disponível?
    tipo: negócio
    por que importa: a resposta da pergunta 9 criou a situação só como situação
    inicial do cadastro. Sem dono, um item perdido ou quebrado de vez continua
    no estado em que estava. Liga-se às perguntas 7 (manutenção, que também não
    tem dono) e 9b. Sem resposta, `docs/layout.md` não tem ação para mudar a
    situação de um item já cadastrado.

18. Quais campos do equipamento são obrigatórios, e o número de série é único?
    tipo: negócio
    por que importa: a resposta da pergunta 12 lista os campos e diz que o
    patrimônio é único, mas não diz quais podem ficar vazios; um cabo raramente
    tem número de série. Muda a validação do cadastro e as constraints do
    schema. Sem resposta, o layout não marca campo obrigatório, e só o
    patrimônio tem erro de valor repetido.

19. Existe mais de um local de retirada? A resposta da pergunta 2 põe a
    retirada no balcão de Operações, e a da pergunta 12 dá a cada equipamento
    um campo "Local de retirada".
    tipo: negócio
    por que importa: com um balcão só, o campo repete o mesmo valor em todo
    registro; com vários, o detalhe precisa dizer onde buscar cada item, e a
    tela de Operações talvez precise do local. Sem resposta, o detalhe mostra o
    local cadastrado no item.

20. O que faz quem confirmou um empréstimo e desistiu antes de buscar o item?
    tipo: negócio
    por que importa: pela resposta da pergunta 2, confirmar já cria o
    empréstimo e já conta para o limite, sem etapa de retirada no sistema. Sem
    cancelamento, a pessoa usa "Devolver" num item que nunca pegou, e o
    histórico (pergunta 8) registra um empréstimo que não houve; como o próprio
    colaborador registra a devolução (pergunta 3), ninguém confere. Sem
    resposta, o layout não tem ação de cancelar.

21. A busca da tela de Operações procura só nos empréstimos em aberto, ou em
    todo o estoque, inclusive item sem empréstimo, como o que está em
    manutenção?
    tipo: negócio
    por que importa: a resposta da pergunta 11 diz o que a busca encontra
    (colaborador, patrimônio ou nome), não onde procura. Num caso ela é um
    filtro da tabela; no outro, a tela precisa de outro tipo de resultado. Sem
    resposta, `docs/layout.md` desenha a busca como filtro da tabela de
    empréstimos em aberto.

22. O convite que cria a conta chega à pessoa por e-mail? Se chega, ele conta
    como a "notificação por e-mail" que o PRD tira da v1?
    tipo: negócio, com consequência técnica
    por que importa: a resposta da 5 põe o convite no Supabase Auth, fora do
    emprestai, sem dizer como ele chega à pessoa. Se for por e-mail, a v1
    manda e-mail, e o PRD põe "Notificação por e-mail" em "O que NÃO entra
    nesta versão". Se não for, a pessoa recebe o primeiro acesso por outro
    caminho, que a spec do login precisa descrever. Liga-se à pergunta 5b.
    conferido pelo agente em 2026-11-11, na documentação do Supabase (guia de
    SMTP do Auth): sem SMTP próprio, o painel e as APIs de admin só entregam
    e-mail a quem é da equipe do projeto no Supabase, até 2 por hora, e o
    convite do painel sai por e-mail, sem opção documentada de copiar o link.
    O link sem e-mail só sai de `auth.admin.generateLink`, uma chamada de
    admin no servidor, e a v1 não tem tela de admin (resposta da 5). A
    proposta que a pessoa aceitou em 2026-11-11, Operações entrega o link por
    um canal interno, não cabe no painel como ele está; por isso a pergunta
    continua aberta.

24. O que Operações faz quando alguém esquece a senha?
    tipo: negócio, com consequência técnica
    por que importa: a resposta da pergunta 15 tira a recuperação de senha da
    v1 e manda a pessoa a Operações ("Sem acesso? Fale com Operações."), mas
    não diz o que Operações consegue fazer por ela. Pelas respostas da 5 e da
    23, as contas vivem no Supabase Auth, fora do emprestai, e quem as
    administra é Operações, sem tela na v1. Redefinir a senha seria então
    trabalho no painel do Supabase, como o convite (pergunta 5b), ou uma ação
    nova sobre a conta de outra pessoa, que o PRD não lista. Liga-se à 5b.
    conferido pelo agente em 2026-11-11: a redefinição pelo painel também sai
    por e-mail, com a mesma restrição da pergunta 22, e a documentação não
    mostra opção de copiar o link. A resposta depende da 22.

---

## Respondidas, aguardando spec

Nenhuma spec existe ainda. "Vira RN em" diz a funcionalidade, não o número da
pasta, que só sai quando a spec for criada.

1. Um equipamento é uma unidade física individual ou um modelo com quantidade?
   resposta: unidade física individual. Um registro por unidade, identificada
   pelo patrimônio, que é único.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   vira RN em: cadastro de equipamento e catálogo.

2. Solicitar um empréstimo é self-service ou depende de aprovação de Operações?
   resposta: self-service, sem aprovação de Operações. Confirmar no sistema já
   cria o empréstimo e já conta para o limite de 3 itens. A retirada é física,
   no balcão de Operações, sem estado próprio no sistema.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   vira RN em: solicitar empréstimo.

3. Quem registra a devolução?
   resposta: os dois lados. O colaborador registra em Meus empréstimos, e
   Operações registra em cada linha da tela de Operações.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   custo anotado, aceito pela pessoa: se o colaborador marca sozinho, ninguém
   confere que o item voltou.
   vira RN em: devolução e tela de Operações.

4. Os 14 dias contam da solicitação ou da retirada, e em dias corridos ou em
   dias úteis?
   resposta: 14 dias corridos, contados da confirmação.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   custo anotado, aceito pela pessoa: a retirada é no balcão, então a pessoa
   perde os dias entre confirmar e buscar o item.
   fica aberto: a 4b, vencimento em dia de balcão fechado.
   vira RN em: solicitar empréstimo.

5. Quem cria as contas de login, e existe tela para isso na v1?
   resposta: o administrador cria as contas por convite, fora do emprestai,
   pelo Supabase Auth. A v1 não tem tela de convite nem tabela de convite. O
   primeiro administrador vem do seed, no banco de dev local.
   decidido: pela pessoa em 2026-11-09, adotando o modelo da Leticia.
   fica aberto: a 22, como o convite chega a quem não é da equipe do
   projeto no Supabase.
   vira RN em: login.

5b. Em produção, onde o seed não roda, como nasce o primeiro administrador? E
    quem faz os convites no painel do Supabase de produção?
    resposta: a conta do primeiro administrador nasce do convite que a pessoa
    faz no painel do Supabase de produção para o próprio e-mail. A área
    `default` e o papel de Operações dessa conta nascem de um passo
    idempotente do workflow de produção, depois do `prisma migrate deploy`:
    cria a `default`, se não existir, e dá o papel de Operações na `default`
    à conta cujo e-mail está num secret do Actions. Ninguém escreve SQL à mão
    na produção. Os demais convites são a pergunta 22.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    fica para a spec do login: o nome do secret, como o passo grava sem SQL à
    mão, e o que ele faz se a conta ainda não existe.
    vira RN em: login.

6. Como o sistema distingue Colaborador de Operações — e Operações é um papel
   global na empresa ou um papel por área?
   resposta: por área. O papel fica no vínculo da pessoa com a área, em
   `memberships (tenant_id, user_id, role)`. A multi-tenancy do ADR-001 e do
   ADR-003 continua valendo: o ADR-003 só a tira, com ADR novo, se a resposta
   for "global" (seção 5).
   decidido: pela pessoa em 2026-11-09, adotando o modelo da Leticia.
   vira RN em: login.

<!-- A numeração segue a das perguntas e pula de 6 para 8; este comentário
     separa as listas para o Markdown não renumerar. -->

8. A v1 mostra histórico de empréstimos já encerrados?
   resposta: sim, em dois lugares. No detalhe do item: a última devolução e
   os eventos do item, cada um com data, evento (empréstimo, devolução,
   manutenção) e resultado. Em Meus empréstimos: o que a pessoa já devolveu,
   no prazo ou com atraso.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   fica aberto: o evento "manutenção" depende das perguntas 7 e 17 (quem põe
   o item nesse estado).
   vira RN em: catálogo (detalhe do equipamento) e Meus empréstimos.

8b. O histórico do item mostra quem pegou?
    resposta: sim. O histórico do item mostra a pessoa de cada empréstimo.
    decidido: pela pessoa, diretamente, em 2026-11-05.
    ainda liga-se à pergunta 6: "qualquer colaborador" depende de quem enxerga
    o estoque de quem.
    vira RN em: catálogo (detalhe do equipamento).

9. Existe uma situação "fora de uso" além de disponível, emprestado e em
   manutenção?
   resposta: sim. No cadastro, a situação inicial é Disponível, Em manutenção
   ou Fora de uso.
   decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
   do repositório do Guilherme.
   fica aberto: a 9b, se o item fora de uso aparece no catálogo.
   vira RN em: cadastro de equipamento.

10. Existe notificação dentro do aplicativo?
    resposta: não na v1.
    decidido: pela pessoa em 2026-10-26, a partir da spec 001-telas do
    repositório do Guilherme, que mostra o sino sem função e não implementa
    notificação.
    no layout: aqui o header não tem sino. É proposta do `docs/layout.md`, não
    da spec nem decisão da pessoa: sino sem função promete o que não existe. A
    spec que desenhar o header confirma.
    vira: item de "Fora de escopo" da primeira spec que desenhar o header, não
    RN.

11. Existe busca, e o que ela procura?
    resposta: existe busca na tela de Operações, e ela encontra colaborador,
    patrimônio ou nome do equipamento.
    decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
    do repositório do Guilherme.
    vira RN em: tela de Operações.

11b. Existe busca no catálogo?
     resposta: sim. O header do catálogo tem um campo "Buscar equipamento",
     como na spec 001-telas.
     decidido: pela pessoa, diretamente, em 2026-11-05.
     fica aberto: a 11c, o que a busca procura e se ela aparece em Meus
     empréstimos.
     vira RN em: catálogo.

12. Quais dados um equipamento tem?
    resposta: Nome, Categoria, Patrimônio, Número de série, Local de retirada,
    Situação e Observações. A situação inicial é Disponível, Em manutenção ou
    Fora de uso (pergunta 9). Cinco categorias iniciais: Notebooks, Monitores,
    Câmeras, Cabos, Projetores. O patrimônio é único (pergunta 1).
    decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
    do repositório do Guilherme.
    fica aberto: a 12b, descrição e observações; e a 18, campos obrigatórios.
    vira RN em: cadastro de equipamento e catálogo.

12c. A lista de categorias é fixa, ou Operações pode criar categoria na v1?
     resposta: não é fixa. Operações pode criar categoria na v1.
     decidido: pela pessoa, diretamente, em 2026-11-05.
     custo aceito: uma tabela a mais no schema e uma ação a mais para
     Operações, que o PRD não lista em "o que precisa existir".
     fica aberto: a 12d, renomear ou excluir categoria.
     vira RN em: cadastro de equipamento.

13. Operações quer ver os empréstimos que estão para vencer, e com quantos
    dias de antecedência?
    resposta: sim. Operações vê o aviso a partir de 3 dias antes do
    vencimento.
    decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
    do repositório do Guilherme.
    fica aberto: a 13b, se a janela de 3 dias vale também para o filtro.
    vira RN em: tela de Operações.

14. O colaborador vê quem está com um item emprestado?
    resposta: sim. O card do catálogo mostra o nome de quem está com o item e
    a data de devolução.
    decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
    do repositório do Guilherme.
    ainda liga-se à pergunta 6, como a 8b: o nome aparece para todo
    colaborador que enxerga o item.
    vira RN em: catálogo.

15. Existe recuperação de senha na v1?
    resposta: não. O login diz "Sem acesso? Fale com Operações."
    decidido: pela pessoa em 2026-10-26, adotando a resposta da spec 001-telas
    do repositório do Guilherme.
    ainda liga-se à pergunta 24: a frase manda a pessoa a Operações, que pela
    resposta da 23 é quem administra as contas, mas o que Operações faz por
    quem esqueceu a senha segue aberto.
    vira RN em: login.

16. Item em manutenção aparece no catálogo? O PRD diz que ele "não aparece
    como disponível", sem dizer se fica listado de outro jeito ou some.
    resposta: aparece, sem a opção de pedir. É como `docs/layout.md` já
    desenhava.
    decidido: pela pessoa, diretamente, em 2026-10-26.
    vira RN em: catálogo.

<!-- A numeração pula de 16 para 23; este comentário separa as listas para o
     Markdown não renumerar. -->

23. Quais papéis existem? O PRD tem duas personas, Colaborador e Operações; o
    ADR-001 fala em administrador, que convida, e em `adminProcedure`.
    resposta: administrador e Operações são o mesmo papel, então a v1 tem dois
    papéis, Colaborador e Operações. No primeiro login, a pessoa ganha o papel
    de Colaborador na área padrão, que aqui é a `default` (ADR-005; no modelo
    da Leticia, `suporte_ti`). O papel de Operações é atribuído à parte, por
    uma operação administrativa no servidor, sem tela na v1.
    decidido: pela pessoa em 2026-11-09, adotando o modelo da Leticia.
    fica para a spec do login: a chave de `role`. O glossário do `AGENTS.md`
    tem `operations` e `admin` para o que agora é um papel só, e `member` para
    colaborador; o modelo da Leticia usa `ADMIN` e `COLLABORATOR`.
    vira RN em: login.

<!-- A numeração pula de 23 para 25; este comentário separa as listas para o
     Markdown não renumerar. -->

25. Quem desativa a conta de quem sai da empresa, e o que acontece com os
    empréstimos em aberto dessa pessoa?
    resposta: Operações bloqueia a conta no painel do Supabase (ban, em
    Authentication > Users). Os empréstimos em aberto da pessoa continuam na
    tela de Operações, com o nome dela, e Operações registra a devolução, como
    a resposta da 3 já permite.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    nota do agente: hoje só a pessoa tem acesso ao painel do Supabase de
    produção; quem mais for Operações precisa desse acesso para bloquear.
    vira RN em: login.

26. Que dados a conta de uma pessoa guarda além de e-mail e senha, e quem os
    preenche?
    resposta: o nome, além de e-mail e senha. A própria pessoa preenche no
    primeiro acesso, num campo só.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    nota do agente: a proposta partiu de o convite do painel não levar nome;
    se a resposta da 22 mudar o caminho do convite, vale rever.
    vira RN em: login.

27. Quanto tempo a pessoa fica logada, e a sessão termina sozinha quando o
    computador fica parado?
    resposta: a v1 não tem limite automático de sessão. O "Sair" fica sempre
    visível, e Operações sai da conta no computador do balcão.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    nota do agente: conferido em 2026-11-11 na documentação do Supabase
    (guia de sessões e página de preços): limite por tempo e por inatividade
    só existem do plano Pro em diante. Um limite feito na aplicação fica para
    depois da v1.
    custo anotado: uma sessão de Operações esquecida aberta no balcão deixa
    quem passa por ali agir como Operações.
    vira RN em: login.

28. Depois de entrar, cada papel cai em que tela?
    resposta: Colaborador cai no catálogo; Operações cai em Empréstimos em
    aberto.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    vira RN em: login.

29. Uma pessoa pode pertencer a mais de uma área? Se pode, como escolhe em
    qual está depois de entrar? E o que vê quem tem conta e nenhuma área?
    resposta: na v1, não. Só existe a área `default`, e não há troca de área.
    No primeiro login a pessoa vira Colaborador na `default` (resposta da 23),
    então ninguém entra sem área.
    decidido: pela pessoa em 2026-11-11, aceitando a proposta do agente.
    vira RN em: login.
