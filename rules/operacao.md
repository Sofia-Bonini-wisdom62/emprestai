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
| Editar ou criar `vercel.json` (`rules/restrictions.md`, seção Escopo) | pedir antes |
| Editar ou criar arquivo em `.github/workflows/` ou `.claude/hooks/`, ou o `.claude/settings.json` (`rules/restrictions.md`, seção Escopo; ADR-011): o agente prepara o texto, e a pessoa aplica à mão | proibido |
| Merge na `main` (`rules/restrictions.md`, seção Produção) | proibido |
| Painel ou API da Vercel, do Supabase e do GitHub: deploy, variável de ambiente, configuração de projeto, secret de Actions, branch de produção (`rules/restrictions.md`, seção Produção) | só a pedido da pessoa |

Níveis: **livre**, faça e siga em frente; **avisar depois**, faça e diga na resposta o que fez;
**pedir antes**, descreva o que pretende fazer e PARE; **só a pedido da pessoa**, faça só a mudança
que a pessoa pediu nesta conversa e, sem esse pedido, não proponha fazer: diga o que falta a pessoa
fazer; **proibido**, não faça — nem se a pessoa
pedir, e nesse caso lembre esta linha. A matriz só diz quem autoriza: a lista das
proibições permanentes é `rules/restrictions.md`, e esta matriz não a substitui nem a resume.

A configuração do operador (modelo e raciocínio por fase) é da pessoa e fica no `README.md`.
