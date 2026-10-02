---
description: Quem autoriza o quê entre a pessoa e o agente, e como a pessoa configura cada fase
globs: []
alwaysApply: true
---

# Contrato de operação

Esta é a parte do contrato que a pessoa ajusta: arquivo gerado é rascunho, não entrega.

## 1. Autorização por tipo de ação
> leitor: agente

| Ação | Nível |
|---|---|
| Editar arquivo existente dentro do escopo da tarefa | livre |
| Criar arquivo novo dentro do escopo | avisar depois |
| Commit e push na branch da tarefa, e abrir o PR | livre |
| Deletar ou renomear arquivo | pedir antes |
| Instalar ou atualizar dependência (o ADR-001 fechou a stack) | pedir antes |
| Criar ou alterar migration (fluxo em `rules/migration.md`) | pedir antes |
| Merge na `main`, deploy, painel da Vercel ou do Supabase, secret de Actions | proibido |

Níveis: **livre**, faça e siga em frente; **avisar depois**, faça e diga na resposta o que fez;
**pedir antes**, descreva o que pretende fazer e PARE; **proibido**, não faça — nem se a pessoa pedir
no meio de uma tarefa, e nesse caso lembre esta linha. A matriz só diz quem autoriza: a lista das
proibições permanentes é `rules/restrictions.md`, e esta matriz não a substitui nem a resume.

## 2. Configuração do operador
> leitor: humano — isto não é instrução para o agente; ele não escolhe o próprio modelo

| Fase | Modelo / raciocínio |
|---|---|
| Escrever a spec e o plano | raciocínio alto |
| Executar uma tarefa já decidida | rápido |
| Debugar o que quebrou | raciocínio alto |
| Revisar o diff | padrão |

- Revisão de diff em sessão limpa e, de preferência, com modelo diferente do que escreveu.
- Sessão longa não se corrige com regra mais enfática: encerre com handoff e abra outra.
