import { z } from "zod";

import { serverEnvSchema } from "./schema";

// A origem das fotos para a CSP (spec 004, RN-26). O proxy.ts monta a CSP de toda resposta e não
// importa o src/env/server.ts, que valida o ambiente inteiro; lê só esta variável, com a mesma regra
// do schema. Não é segredo: é a base pública do bucket.
const imagesBaseUrl = serverEnvSchema.shape.EQUIPMENT_IMAGES_BASE_URL.parse(
  process.env.EQUIPMENT_IMAGES_BASE_URL,
);

export const equipmentImagesOrigin: string | null = imagesBaseUrl
  ? z.url().transform((url) => new URL(url).origin).parse(imagesBaseUrl)
  : null;
