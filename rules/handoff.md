---
description: Como encerrar uma sessão deixando a próxima capaz de continuar sozinha
globs: []
alwaysApply: false
---

# Passagem de bastão
> leitor: agente

## Quando
Ao fechar uma tarefa do `tasks.md`; quando a pessoa disser que vai parar ou
trocar de sessão; ou quando você notar que está relendo contexto já lido aqui.

## Procedimento
1. PERGUNTE "quer que eu escreva o handoff?" e PARE. Não é automático — nem no
   fim da tarefa, nem para sobrescrever um `handoff.md` que já exista.
2. Depois do sim, sobrescreva `handoff.md` na raiz, no máximo 25 linhas, no
   formato abaixo. Existe um handoff só: histórico é o git, não este arquivo.
3. Cole o "Próximo passo" na resposta, para a pessoa conferir antes de sair.

```text
# Handoff — AAAA-MM-DD
Parei em: <NNN-nome-curto> · T-xx · CA-xx em andamento
Branch: <nome> · último commit: <assunto> · não commitado: <arquivos ou nada>
Banco de dev: <migration aplicada por migrate dev e ainda sem commit, ou nada>
Publicado: <push na branch, PR #n aberto, ou nada publicado>
Não faça: <o que a próxima sessão não deve refazer ou tentar de novo, e por quê>
Próximo passo: <uma frase, no imperativo>
```

## Verificação
Uma sessão nova, lendo só o `handoff.md` e a spec da funcionalidade, continua o
trabalho sem perguntar nada sobre o que já foi feito.

## Não faça
- Não trate o handoff como fonte da verdade: ele é efêmero. Comportamento é da
  spec, decisão é do ADR; o que divergir deles está errado no handoff.
- Não escreva nele valor de variável, chave nem connection string: ver
  `rules/restrictions.md`, seção Dados e segredos.
- Não registre como pronto o que não passou por `rules/checks.md`.
