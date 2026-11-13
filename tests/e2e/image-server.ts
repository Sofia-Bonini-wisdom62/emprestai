import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// O bucket das fotos no E2E (spec 004, RN-24): a pilha efêmera não tem Storage, então um servidor
// local serve a mesma foto fictícia de 800×600, um retângulo de cor lisa, para qualquer objeto. A
// EQUIPMENT_IMAGES_BASE_URL do app aponta para ele, e o CA-08 se prova no navegador, com a CSP ligada.
const PHOTO = readFileSync("tests/e2e/fixtures/equipment-photo.jpg");
export const IMAGES_PATH = "/storage/v1/object/public/equipment-images";

export type ImageServer = { baseUrl: string; stop: () => Promise<void> };

export async function startImageServer(): Promise<ImageServer> {
  const server = createServer((request, response) => {
    if (request.method !== "GET" || !request.url?.startsWith(`${IMAGES_PATH}/`)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "image/jpeg", "content-length": PHOTO.length });
    response.end(PHOTO);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}${IMAGES_PATH}`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
