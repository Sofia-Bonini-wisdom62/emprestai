// Leitura dos dois arquivos de prisma/data/ para o carregamento dos equipamentos iniciais (spec
// 003, RN-07 e RN-17). O módulo de carregamento não lê o disco (plano, passo 2): quem lê são os
// seus dois pontos de entrada, o seed do dev e o passo de produção, e os dois leem por aqui.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { EquipmentDataError } from "./equipment-data";

const inData = (name: string) => fileURLToPath(new URL(`./data/${name}`, import.meta.url));
const LIST_PATH = inData("equipment.json");
const MANIFEST_PATH = inData("equipment-images.json");

// O conteúdo do arquivo, ou undefined quando ele não existe.
function readJson(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new EquipmentDataError([`${path} não é um JSON válido`]);
  }
}

// A lista e o manifesto já lidos, dos caminhos pedidos ou, sem eles, de prisma/data/. A lista tem
// de existir. Sem o arquivo do manifesto, não há manifesto aprovado, e o carregamento grava sem
// foto (RN-17). O arquivo que existe e traz null não é "sem manifesto": é um manifesto que não
// passa (RN-08).
export function readEquipmentFiles(
  listPath: string = LIST_PATH,
  manifestPath: string = MANIFEST_PATH,
): { list: unknown; manifest: unknown } {
  const list = readJson(listPath);
  if (list === undefined) {
    throw new EquipmentDataError([`a lista de equipamentos não existe em ${listPath}`]);
  }
  const manifest = readJson(manifestPath);
  if (manifest === null) {
    throw new EquipmentDataError([`manifesto: ${manifestPath} traz null, e não as fotos`]);
  }
  return { list, manifest: manifest ?? null };
}
