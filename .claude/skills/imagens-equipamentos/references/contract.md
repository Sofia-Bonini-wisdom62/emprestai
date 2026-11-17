# O contrato da skill e quem garante cada requisito

O contrato é o da Entrega 2 da prática: o que a skill precisa garantir. Como cada requisito é garantido foi decidido pela pessoa e está na spec 002 e no ADR-011. Cada linha traz o tipo da garantia:
- **script**: código com teste no `pnpm test`;
- **instrução**: um passo do `SKILL.md`;
- **referência**: um destes arquivos;
- **revisão humana**: o que só a pessoa faz.

| Requisito | O que o contrato pede | Como a skill garante | Onde se prova |
|---|---|---|---|
| Fonte | Só a API do Pexels, com a chave gratuita da pessoa, e nenhuma outra origem | **Script.** A busca vai só a `https://pixabay.com/api/`, e o download só a `pixabay.com` ou `cdn.pixabay.com`. O lint barra `fetch` e cliente de rede fora do `pixabay.ts`. **Troca:** a pessoa trocou o Pexels pelo Pixabay em 2026-11-13, porque a emissão de chaves do Pexels está pausada. O conflito com o contrato fica no `ENTREGA.md` | RN-01, RN-18; CA-01, CA-13 |
| Direito de imagem | Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo | **Instrução e revisão humana.** O agente olha cada foto pela régua de `visual-review.md` e grava o veredito e o motivo. Depois, a pessoa aprova a folha de contato. A conferência reprova foto sem veredito | RN-02, RN-09; CA-03, CA-14 |
| Mesmo tamanho | Todas em 800×600, garantido e não só pedido | **Script.** O `sharp` recorta em 800×600, e o leitor de JPEG, que não usa o `sharp`, confere cada arquivo no download e na conferência | RN-03, RN-12 a RN-15; CA-02, CA-05, CA-11, CA-14 |
| Sem repetição | A mesma foto não aparece em dois equipamentos | **Script.** A conferência reprova id ou SHA-256 repetido entre as aprovadas, e a busca deixa de fora os ids já usados. Só a revisão humana pega a mesma cena de dois autores | RN-04; CA-03, CA-04 |
| Créditos | De onde veio, quem fotografou e sob qual licença | **Script.** O manifesto registra a página da foto, o autor, a página dele, a Pixabay Content License, a URL de origem, o SHA-256 e a data, e a conferência reprova o campo que falta. A licença não obriga a citar o autor, mas o crédito fica mesmo assim | RN-05, RN-17; CA-12, CA-14 |
| Armazenamento | Bucket público do Supabase Storage, e repetir não duplica | **Script e revisão humana.** O nome do objeto é fixo, `<patrimonio>-<idPixabay>.jpg`. A conferência imprime o que enviar e o que apagar. A pessoa cria o bucket e envia os arquivos pelo roteiro de `manual-upload.md` | RN-06, RN-16; CA-09, CA-12 |
| Produção | O agente prepara as imagens, mas não consegue enviá-las ao Supabase do deploy | **Harness, instrução e revisão humana.** O `permissions.deny` nega os servidores do Supabase, da Vercel, do Composio e do v0, e os arquivos de workflow, de hook e de settings. Um hook nega o push desses arquivos. O passo 0 confere o bloqueio a cada rodada. A pessoa desliga os conectores no claude.ai | RN-07; CA-06, CA-10 |
| Segredos e dependências | Nenhuma chave em código ou no git, e nenhuma biblioteca fora do que as rules e os ADRs permitem | **Script e revisão humana.** A `PIXABAY_API_KEY` vive só no `.env.local`, e só o `api-key.ts` a lê. Nenhuma mensagem, busca guardada ou manifesto a traz. A única dependência nova é o `sharp` 0.35.5, aprovado pela pessoa e registrado no ADR-011 | RN-08, RN-18, RN-19; CA-07, CA-13, CA-14 |
| Crédito na tela | A tela que mostra as fotos traz "Fotos: Pexels", com link | **Fora da skill.** É a spec 004 (RN-14 e CA-08) que põe "Fotos: Pixabay", com link para `https://pixabay.com`, pela troca de 2026-11-13. A skill põe o link do Pixabay em cada foto da folha de contato, onde a API pede o crédito | Spec 004, RN-14; spec 002, RN-09 |
