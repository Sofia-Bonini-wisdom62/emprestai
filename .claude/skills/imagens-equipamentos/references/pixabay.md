# A API do Pixabay

Consulta para a skill. Os fatos vêm da [documentação da API](https://pixabay.com/api/docs/) e do [resumo da licença](https://pixabay.com/service/license-summary/), lidos em 2026-11-13, sem login. A decisão de usar o Pixabay, e o motivo, estão no ADR-011.

## A chave

- A chave é obrigatória e só aparece para quem está logado, em `pixabay.com/api/docs`. A pessoa já tem a dela, desde 2026-11-13.
- Ela vai no `.env.local` da pessoa, como `PIXABAY_API_KEY=`, nunca no chat nem no git. Só o `scripts/lib/api-key.ts` a lê (RN-08), e ela tem de ser só de ASCII visível (RN-19).
- A busca leva a chave no parâmetro `key` da URL, o único jeito que a API documenta. Por isso nenhuma mensagem da skill mostra a URL da busca nem o corpo da resposta (RN-18).

## A busca

- `GET https://pixabay.com/api/`, com `q` (o termo, até 100 caracteres), `image_type`, `orientation`, `page` e `per_page` (de 3 a 200).
- A skill pede `image_type=photo` e `orientation=horizontal`, página 1, 20 por página (RN-01).
- A resposta traz `total`, `totalHits` (no máximo 500 por busca) e `hits`. De cada resultado, a skill usa `id`, `pageURL`, `user`, `user_id`, `tags` e `largeImageURL`.
- A página do autor é `https://pixabay.com/users/<user>-<user_id>/`, com o `user` codificado para URL.

## Os tamanhos

- `previewURL`: até 150 px.
- `webformatURL`: até 640 px. Vale 24 h.
- `largeImageURL`: até 1280 px no lado maior. É o que a skill baixa. A documentação não diz quanto tempo essa URL vale, e a skill a trata como temporária.
- O original (`imageURL`) e o `fullHDURL` só vêm com acesso completo, que pede aprovação da conta.
- Não há parâmetro de corte nem de tamanho exato: o recorte em 800×600 é do `sharp` (RN-03).

## Os hosts

Nos exemplos da documentação, a busca e o `largeImageURL` estão em `pixabay.com`, e o `previewURL` e a foto do autor em `cdn.pixabay.com`. A skill aceita só esses dois hosts, só `https`, sem porta, sem usuário e sem seguir redirecionamento. A rodada real (T-07) confirma o host do `largeImageURL` e se ele redireciona (ADR-011, seção 6).

## Limite, cache e hotlink

- **Limite:** 100 pedidos a cada 60 s, por chave. O 429 vem com o texto "API rate limit exceeded", e todo erro vem em texto puro.
- **Cache:** a resposta de cada busca tem de ficar guardada por 24 h. A skill a guarda em `.skill-output/imagens-equipamentos/cache/`, sem a chave e sem a URL da busca.
- **Volume:** a API é para pedidos de pessoas, e o download em massa, sistemático, não é permitido. A skill faz uma busca por equipamento sem foto aprovada e baixa só as fotos escolhidas.
- **Hotlink:** as URLs da resposta servem para mostrar resultados por um tempo. O hotlink permanente é proibido. A foto vai para o bucket do Storage, e nenhuma tela usa endereço do Pixabay como imagem.

## O crédito e a licença

- **Licença:** a Pixabay Content License deixa usar sem citar o autor. Ela lembra que marca, logo ou pessoa reconhecível podem pedir outros direitos, o que reforça a régua de `visual-review.md`.
- **Manifesto:** registra o crédito de cada foto mesmo assim, como o contrato pede (RN-05), com a licença "Pixabay Content License" e `https://pixabay.com/service/license-summary/`.
- **Origem das fotos:** a documentação pede que se mostre de onde vêm as imagens sempre que aparecem resultados de busca. A folha de contato faz isso com o link da página de cada foto (RN-09). A tela do catálogo mostra "Fotos: Pixabay", com link para `https://pixabay.com` (spec 004, RN-14).
