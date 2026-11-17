# A revisão visual

A régua do RN-02 da spec 002: nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo chega ao sistema. Quem garante é a revisão visual, primeiro do agente, foto a foto, e depois da pessoa, na folha de contato. Nenhum script substitui o olhar: o código só exige que cada foto tenha um veredito e um motivo.

## Como revisar

- Abra o arquivo baixado, `<patrimônio>-<id>.jpg`, e não a página do Pixabay: o que vai ao bucket é o recorte de 800×600, e algo que estava fora do recorte não conta.
- Olhe a foto inteira, inclusive os cantos e os reflexos.
- Grave o veredito e o motivo no manifesto da rodada: `"review": { "verdict": "approved" | "rejected", "reason": "..." }`. O motivo diz o que se vê, e não só "ok".
- Na dúvida, reprove.

## O que reprova

| Na foto | Veredito |
|---|---|
| Pessoa ou parte de uma pessoa, como mão, braço, rosto, silhueta ou reflexo de alguém | Reprova |
| Marca ou logo legível, no aparelho, na caixa, num adesivo ou ao fundo | Reprova |
| Texto legível: etiqueta, papel, livro, tela com letras e as letras das teclas que dá para ler | Reprova |
| Tela com conteúdo: interface, janela, página, código, imagem ou vídeo | Reprova |
| Tela apagada ou preta, sem reflexo legível | Passa |
| Marca, logo ou texto desfocado a ponto de não dar para ler | Passa, com o motivo dizendo que não se lê |
| Só o equipamento, numa mesa ou num fundo neutro | Passa |
| Um equipamento diferente do patrimônio, como um tablet no lugar de um notebook | Reprova: a foto não serve ao item |

A licença do Pixabay também lembra que marca, logo ou pessoa reconhecível podem pedir outros direitos (`pixabay.md`). É mais um motivo para reprovar na dúvida.

## Exemplos de motivo

- Aprovada: "notebook fechado sobre mesa de madeira, sem logo nem texto legível".
- Aprovada: "monitor desligado, tela preta, base sem marca legível".
- Reprovada: "mão de uma pessoa no teclado".
- Reprovada: "tela ligada com uma planilha".
- Reprovada: "logo do fabricante legível na tampa".
- Reprovada: "letras das teclas legíveis em primeiro plano".

## Depois da revisão do agente

A folha de contato mostra cada foto da rodada com o veredito e o motivo. A pessoa aprova ou reprova cada uma. A decisão dela vale sobre a do agente: uma foto que ela reprovar muda de veredito no manifesto, com o motivo dela, e o patrimônio volta à busca de outro candidato.
