# O roteiro do painel, para a pessoa

Estes passos são da pessoa, à mão, no painel do Supabase do projeto de produção, `emprestai`. O agente não faz nenhum deles e não tem como fazer (spec 002, RN-07; ADR-011). Eles vêm depois de a pessoa aprovar a folha de contato.

## Antes de começar

- Desligue no claude.ai os conectores do Supabase, da Vercel, do Composio e do v0, ou deixe-os só de leitura. É a segunda camada do bloqueio, além do `permissions.deny`.
- Tenha em mãos a lista que a conferência imprimiu no passo 6 do `SKILL.md`, com os objetos a enviar e os objetos a apagar, e a pasta `.skill-output/imagens-equipamentos/` com os arquivos.

## 1. O bucket, na primeira vez

No Storage, crie o bucket com estas configurações (ADR-011, seção 2):
- nome `equipment-images`;
- público;
- tipos aceitos: só `image/jpeg`;
- tamanho máximo por arquivo: 1 MB.

## 2. Enviar os arquivos

- Envie cada arquivo da lista "Objetos a enviar", com o mesmo nome, `<patrimonio>-<idPixabay>.jpg`, na raiz do bucket.
- Antes de enviar, anote quantos objetos o bucket tem. Depois, repita o envio dos mesmos arquivos e confira que a contagem não mudou: repetir não duplica (contrato, "Armazenamento").

## 3. Conferir as URLs públicas

Numa janela anônima, abra a URL pública de cada objeto enviado: `https://zawqxqukgaqjlbtwiogb.supabase.co/storage/v1/object/public/equipment-images/<objeto>`. Cada uma tem de abrir a foto, sem login.

## 4. A variável do catálogo, na primeira vez

Se a `EQUIPMENT_IMAGES_BASE_URL` ainda estiver vazia em Production, no painel da Vercel, preencha com `https://zawqxqukgaqjlbtwiogb.supabase.co/storage/v1/object/public/equipment-images`, sem barra no fim (spec 004, RN-24). No `.env.local` e no Preview, ela fica vazia.

## 5. O merge do manifesto

Só depois dos passos 2 e 3, faça o merge do PR que traz o `prisma/data/equipment-images.json` aprovado. O passo de produção grava a imagem de cada equipamento a partir dele (spec 003; ADR-013 e ADR-014).

A ordem importa. Com o merge antes do envio, o catálogo apontaria para objetos que ainda não estão no bucket. Com os arquivos enviados primeiro, o banco nunca aponta para uma foto que falta.

## 6. Apagar os objetos antigos

Só depois do merge e do passo de produção, apague os objetos da lista "Objetos a apagar". Eles são as fotos trocadas, que o banco deixou de usar no passo 5. Apagar antes deixaria o catálogo sem foto até o merge.

## 7. Registrar

Registre no `ENTREGA.md` o que foi feito e quando, com a evidência:
- o print das configurações do bucket;
- a contagem antes e depois de repetir o envio;
- as URLs públicas abertas na janela anônima.
