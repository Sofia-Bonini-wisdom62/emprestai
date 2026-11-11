# ADR-008 — Provedor de e-mail do Supabase Auth

| Campo | Valor |
|---|---|
| Status | Proposto em 2026-11-11. No mesmo dia, a pessoa escolheu a saída B, o SMTP do Gmail (seção 2). Falta a conferência da seção 7 para virar Aceito |
| Data | 2026-11-11 |
| Turma | B |
| Vínculo | [`docs/perguntas-prd.md`](../perguntas-prd.md), respostas da 22 e da 24; [ADR-001](001-stack.md), seção 6 ("Provedor de e-mail transacional e demais integrações") |
| Substitui | Nada. Decide o que o ADR-001, seção 6, deixou de fora |
| Decide | Por qual SMTP o Supabase Auth de produção manda o convite e a redefinição de senha, e onde ficam as credenciais dele |

---

## 1. Contexto

As respostas da 22 e da 24 decidiram que Operações convida pelo painel do Supabase de produção, que a própria pessoa pede a redefinição de senha pelo "Esqueci minha senha" do login (a resposta da 24 mudou em 2026-11-11, porque o painel não tem a opção de redefinir), e que o Supabase manda os dois e-mails por um SMTP próprio. Sem SMTP próprio, o Supabase só entrega a quem é da equipe do projeto, até 2 e-mails por hora: o convite não chegaria a nenhum colaborador. Com SMTP próprio, entrega a qualquer endereço, começando em 30 por hora, limite que se ajusta no painel.

O volume é pequeno: poucas dezenas de pessoas, menos de 100 e-mails por mês. Quase todo provedor tem plano gratuito que cobre isso.

O que decide é outra coisa: **o projeto não tem domínio próprio**. A produção é um `*.vercel.app`, e nele não dá para publicar registro DNS. Sem DNS não há SPF nem DKIM num domínio do time, e a pesquisa de 2026-11-11 (seção 8) mostra o que isso faz com cada provedor gratuito:

- **Exigem domínio verificado:**
  - o endereço de teste do Resend e o do Mailtrap só entregam ao e-mail do dono da conta;
  - o domínio de teste da MailerSend entrega a 2 destinatários;
  - a ZeptoMail não envia nada antes de verificar o domínio;
  - o Postmark recusa remetente de domínio público e, enquanto a conta está pendente, só entrega a destinatários do domínio do remetente.
- **Enviam sem domínio, com o remetente desalinhado:**
  - Mailjet, Amazon SES e SendGrid aceitam verificar um único remetente por link, sem DNS. Com um @gmail.com, o e-mail falha no alinhamento DMARC;
  - hoje o DMARC do gmail.com é `p=none`, então a entrega fica a critério do filtro de quem recebe, e o Google anunciou, sem data, que vai endurecer essa política;
  - a Brevo também aceita remetente único. Com @gmail.com, ela trocaria o domínio do remetente por um dela, segundo resumos de busca de páginas da central de ajuda que não abriram (seção 8).
- **Não servem no plano gratuito:**
  - o SendGrid só tem trial de 60 dias;
  - o Amazon SES só tem crédito por até 6 meses;
  - a SMTP2GO não aceita cadastro com e-mail de domínio público.

---

## 2. Decisão

**Escolha da pessoa, em 2026-11-11: a saída B**, o SMTP do Gmail, para não pagar um domínio. Ela contraria a recomendação do agente, e a pessoa a fez sabendo do risco descrito na saída B. A saída A fica registrada como o caminho do gatilho "o time compra um domínio" (seção 5).

O agente tinha recomendado a saída A. Na precedência do `AGENTS.md`, segurança vem antes de custo:

- **na saída A,** o Supabase guarda uma credencial que só envia;
- **na saída B,** guarda uma que lê tudo o que o Auth já mandou e deixa tomar contas da produção.

A saída B só vale se a pessoa aceitar esse risco para não pagar um domínio.

### Saída A — domínio próprio e Resend (recomendada pelo agente)

O time compra um domínio e verifica no Resend um subdomínio só de envio, por exemplo `auth.<domínio>`.

| Item | Escolha |
|---|---|
| Plano | Free do Resend: 3.000 e-mails por mês, 100 por dia, sem prazo e sem cartão |
| DNS do subdomínio | SPF e DKIM, que o Resend exige para verificar, e um registro DMARC com pelo menos `p=none`, que ele trata como opcional e a seção 7 confere |
| Servidor | `smtp.resend.com`, porta 465, usuário `resend` |
| Senha | Uma chave de API com permissão de envio apenas (`sending_access`), que não lê nada |
| Conta do Resend | Da pessoa, com verificação em duas etapas: quem toma a conta lê o conteúdo enviado |
| Remetente | Um endereço do subdomínio de envio, com o nome "emprestai" |
| Custo | O registro anual do domínio, que esta pesquisa não cotou |

- **Por que o Resend** — está na lista de provedores da documentação de SMTP do Supabase, tem integração de parceiro com ele e oferece SMTP no plano gratuito.
- **O que custa** — dinheiro, por pouco que seja, e DNS para configurar e manter. O ADR-004 já descartou o plano Pro por custo, então a decisão de pagar um domínio é da pessoa.

### Saída B — Gmail, sem custo e sem domínio

O Supabase Auth envia pelo SMTP do Gmail, com uma conta Google criada só para o projeto.

| Item | Escolha |
|---|---|
| Conta | Uma conta Google só do emprestai, criada e recuperável pela pessoa. Nunca a conta pessoal de ninguém |
| Acesso | Verificação em duas etapas ligada e uma senha de app usada só pelo Supabase |
| Servidor | `smtp.gmail.com`, porta 465 ou 587, as duas que o artigo de KB do Supabase sobre Gmail relata funcionando |
| Remetente | O próprio endereço da conta, com o nome "emprestai" |
| Limites | 500 e-mails por dia no Gmail; no Supabase, os 30 por hora padrão, que bastam |

- **Por que o Gmail** — é a única saída gratuita da pesquisa que entrega a qualquer destinatário com o remetente no mesmo domínio do servidor que envia, sem comprar domínio. O Supabase tem um artigo de KB sobre usá-lo como SMTP próprio.
- **O que essa credencial vale.** A senha de app vale tanto quanto um acesso de Operações na produção, por três motivos:
  - o Gmail guarda em Enviados toda mensagem mandada por SMTP, e o IMAP não pode ser desligado;
  - por isso, quem tem a senha de app, ou a conta Google, lê os links de convite e de redefinição ainda válidos;
  - além disso, pode gerar um link novo para qualquer e-mail, porque a rota de recuperação do Auth é aberta com a chave publicável.
- **Proteção possível da conta.** Com senha de app, a conta não pode usar a Proteção Avançada do Google nem verificação em duas etapas só por chave de segurança.
- **Por que uma conta só do projeto** — o vazamento não alcança dado pessoal de ninguém, e a conta não some quando alguém sai do time.
- **Cuidados com a conta.** Como ela vale um acesso de Operações:
  - a senha é forte e não se repete em nenhum outro lugar;
  - a verificação em duas etapas usa aplicativo autenticador ou telefone, porque só chave de segurança impede a senha de app;
  - a recuperação vai para contato da pessoa;
  - a conta não serve para mais nada além do envio do Auth.
- **O que não está confirmado** — nenhuma fonte oficial lida diz que o envio por `smtp.gmail.com` sai assinado com DKIM de gmail.com, e portanto alinhado no DMARC. É o comportamento esperado, e o primeiro convite confere (seção 7).

### Nas duas saídas

| Item | Escolha |
|---|---|
| Onde ficam as credenciais | Só no painel do Supabase de produção (Authentication > Emails > SMTP Settings). Não vão para o repositório, para a Vercel, para os secrets do Actions nem para o `.env.example`: a aplicação não manda e-mail |
| Quem configura | A pessoa, pelo painel (`rules/operacao.md`). O agente não toca no painel |
| Uso | Só o e-mail do Auth: convite e redefinição de senha. A notificação por e-mail continua fora da v1, como o PRD decidiu |

---

## 3. Alternativas consideradas

| Alternativa | Motivo do descarte |
|---|---|
| Ficar com o SMTP padrão do Supabase | Só entrega à equipe do projeto, até 2 e-mails por hora: o convite não chega a colaborador |
| Resend ou Mailtrap sem domínio | O endereço de teste só entrega ao e-mail do dono da conta; no Resend, os demais dão erro 403 |
| MailerSend | O domínio de teste entrega a 2 destinatários; para mais, exige domínio verificado |
| ZeptoMail | Não envia nada antes de verificar o domínio |
| Postmark | Recusa remetente de domínio público e, com a conta pendente, só entrega ao domínio do remetente |
| Brevo com remetente @gmail.com | Sem domínio, o remetente fica desalinhado. Pelos resumos de busca da central de ajuda, que não abriu, a Brevo troca o remetente por um domínio dela. A conta nova depende de aprovação para enviar (página de preços) |
| Mailjet com remetente @gmail.com | Aceita um único remetente verificado, mas sem alinhamento DMARC, com a entrega a critério de quem recebe |
| SMTP2GO | O cadastro da conta não aceita e-mail de domínio público. Se ela também recusa @gmail.com como remetente único, não foi verificado (central de ajuda deu 403) |
| Amazon SES | Sem plano gratuito permanente: só crédito por até 6 meses. A sandbox só entrega a destinatários verificados, e o pedido de produção sem domínio próprio tem resultado incerto |
| SendGrid | Só trial de 60 dias |
| Mailgun | O plano Free pede domínio próprio; o sandbox entrega a até 5 destinatários autorizados |
| Domínio do Instituto J&F | Depende de a TI do Instituto publicar registros DNS e autorizar o envio em nome dele: fora do controle do time |
| Link gerado no servidor por `auth.admin.generateLink`, sem e-mail | Já descartado na resposta da 22: pediria uma ação de administrador e contrariaria a resposta da 5 |

---

## 4. Consequências

### Fica mais fácil

- O convite e a redefinição de senha chegam a qualquer pessoa, como as respostas da 22 e da 24 pedem.
- Os templates do Auth voltam a ser editáveis. Desde 2026-06-03, projeto Free novo com o SMTP padrão não edita template; com SMTP próprio, edita.
- Trocar de saída depois é trocar os campos do painel. Não há código nem migration envolvidos.

### Fica mais difícil

- **Saída A:** custo anual e DNS para manter; domínio vencido derruba o envio. A conta do Resend precisa de dona com verificação em duas etapas.
- **Saída B:**
  - a conta Google do projeto vira credencial de produção, pelo que a seção 2 descreve, e precisa de dona;
  - trocar a senha dessa conta revoga a senha de app, e o envio para sem aviso;
  - o Google diz que senha de app não é recomendada na maioria dos casos;
  - remetente @gmail.com parece menos institucional e pode cair no spam em caixa corporativa;
  - a entrega depende do DMARC do gmail.com.

### O que isso impede de fazer depois sem custo

- Nada relevante: a troca de saída fica no painel.

---

## 5. Gatilhos de revisão

| Gatilho | Decisão afetada |
|---|---|
| Saída B: o primeiro convite não chega, chega no spam ou mostra DMARC sem alinhamento | A saída B, em favor da A |
| Saída B: suspeita de vazamento da senha de app ou da conta Google | Trocar a senha da conta (o que revoga a senha de app), gerar outra, preencher de novo o SMTP no painel e revisar as contas da produção |
| Saída A: suspeita de vazamento da chave do Resend | Revogar a chave, criar outra só de envio e preencher de novo o SMTP no painel |
| Saída B: o time compra um domínio | A saída, em favor da A |
| O Google endurece o DMARC do gmail.com ou deixa de aceitar senha de app | A saída B |
| O produto passa a mandar e-mail fora do Auth (notificação de empréstimo, que hoje está fora da v1) | O provedor e o escopo deste ADR |

---

## 6. O que este ADR não decide

- O texto dos templates, a validade do link de convite e as Redirect URLs: são da spec do login. A validade padrão é 1 hora, e o mesmo ajuste vale para convite e redefinição.
- O e-mail no desenvolvimento: pelo ADR-006, o Auth local roda sem servidor de e-mail.
- Domínio próprio da aplicação, que o ADR-007, seção 6, também deixou de fora.

---

## 7. Antes de aceitar

1. A pessoa escolhe a saída A ou a B. Feito em 2026-11-11: saída B.
2. Saída A:
   1. comprar o domínio;
   2. verificar o subdomínio no Resend e publicar o DMARC;
   3. criar a chave só de envio;
   4. preencher o SMTP no painel.
3. Saída B:
   1. criar a conta Google do projeto;
   2. ligar a verificação em duas etapas;
   3. gerar a senha de app;
   4. preencher o SMTP no painel.
4. Nas duas: mandar um convite pelo painel a um endereço de fora da equipe do Supabase, de preferência corporativo, e conferir nos cabeçalhos da mensagem recebida que SPF, DKIM e DMARC passam.
   - **Se passarem**, a pessoa muda o Status para Aceito, com a data.
   - **Se falharem na saída A**, corrigir os registros no Resend e no DNS e repetir. Se continuar falhando, a escolha volta para a pessoa, e o Status fica Proposto.
   - **Se falharem na saída B**, vale o primeiro gatilho da seção 5.

---

## 8. Fontes

Consultadas em 2026-11-11. As páginas de preço não trazem data de vigência.

- Supabase: [SMTP próprio no Auth](https://supabase.com/docs/guides/auth/auth-smtp), [rate limits](https://supabase.com/docs/guides/auth/rate-limits), [templates no Free](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier), [Gmail como SMTP (KB)](https://supabase.com/kb/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y), [integração com o Resend](https://supabase.com/partners/integrations/resend)
- Vercel: [registros DNS](https://vercel.com/docs/domains/managing-dns-records)
- Resend: [preços](https://resend.com/pricing), [SMTP](https://resend.com/docs/send-with-smtp), [domínios](https://resend.com/docs/dashboard/domains/introduction), [erro 403 do domínio de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [chaves de API](https://resend.com/docs/api-reference/api-keys/create-api-key)
- Google: [limites de envio do Gmail](https://support.google.com/mail/answer/22839), [senhas de app](https://support.google.com/accounts/answer/185833), [cópia em Enviados no envio por SMTP](https://support.google.com/mail/answer/78892), [IMAP sempre ligado](https://support.google.com/mail/answer/7126229), [diretrizes de remetente](https://support.google.com/a/answer/81126)
- Demais provedores, lidos direto: [Brevo, preços](https://www.brevo.com/pricing/), [Mailjet, preços](https://www.mailjet.com/pricing/), [SMTP2GO, remetente único](https://www.smtp2go.com/blog/sender-domain-vs-single-sender-emails/), [Mailtrap](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain), [MailerSend](https://www.mailersend.com/help/getting-started), [Amazon SES](https://aws.amazon.com/ses/pricing/), [Postmark](https://postmarkapp.com/blog/why-cant-i-use-gmail-address), [Mailgun](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-sandbox), [SendGrid](https://support.sendgrid.com/hc/en-us/articles/35270136965403-Overview-of-60-Day-Free-Trial-Plans-for-New-SendGrid-Accounts), [ZeptoMail](https://www.zoho.com/zeptomail/help/domains.html)
- Vistos só por resumo de busca, porque a página respondeu 403: [Brevo, remetente e requisitos de Gmail](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders), [Brevo, criar remetente](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [SMTP2GO, remetentes verificados](https://support.smtp2go.com/hc/en-gb/articles/115004408567-Verified-Senders)
- DMARC do gmail.com: consulta DNS pública a `_dmarc.gmail.com`, que respondeu `v=DMARC1; p=none; sp=quarantine`
