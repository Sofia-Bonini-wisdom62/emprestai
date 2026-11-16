// Passo dos equipamentos iniciais no workflow de produção (ADR-013 e ADR-014; spec 003, RN-12 e
// CA-09): cria na área default as categorias e os equipamentos que faltam e, no que já existe, só
// troca a imagem. Roda a cada deploy, depois das migrations e do passo do ADR-009, que cria a
// default; rodar de novo não duplica nada. Dado inválido recusa o conjunto inteiro, e o passo
// falha antes do deploy.
// Roda fora do Next e lê o ambiente direto, pela exceção de rules/secrets.md: só a URL do banco
// que o workflow passa. No log, só as contagens.
//
// Uso: node --import ./prisma/resolve-ts.mjs prisma/load-equipment.ts [lista] [manifesto]
// Sem argumentos, lê prisma/data/equipment.json e prisma/data/equipment-images.json. O manifesto
// aprovado pode não existir ainda: os equipamentos ficam com a imagem nula (RN-17).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT } from "./default-tenant";
import { EquipmentDataError, loadEquipmentData } from "./equipment-data";

const inData = (name: string) => fileURLToPath(new URL(`./data/${name}`, import.meta.url));
const [listPath = inData("equipment.json"), manifestPath = inData("equipment-images.json")] =
  process.argv.slice(2);

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

const databaseUrl = process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("Falta DIRECT_URL: o passo precisa da URL do banco que o workflow passa");
}

// O carregamento é uma transação só, com cerca de 30 consultas na primeira rodada, e o runner
// fala com o banco de outra região. Os 5 s que o Prisma dá por padrão ficam no limite, e a folga
// vale só para este passo: o teto continua sendo o timeout-minutes do job.
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
  transactionOptions: { maxWait: 10_000, timeout: 30_000 },
});

try {
  const list = readJson(listPath);
  if (list === undefined) {
    throw new EquipmentDataError([`a lista de equipamentos não existe em ${listPath}`]);
  }
  // Sem o arquivo, não há manifesto aprovado: o carregamento grava sem foto (RN-17). O arquivo
  // que existe e traz null não é "sem manifesto": é um manifesto que não passa (RN-08).
  const manifestFile = readJson(manifestPath);
  if (manifestFile === null) {
    throw new EquipmentDataError([`manifesto: ${manifestPath} traz null, e não as fotos`]);
  }
  const manifest = manifestFile ?? null;

  const result = await loadEquipmentData(db, list, manifest);

  console.log(
    `Equipamentos iniciais na área ${DEFAULT_TENANT.slug}: ${result.created} criados, ${result.imageUpdated} com a imagem trocada, ${result.withoutImage} sem foto.`,
  );
} catch (error) {
  // O dado recusado sai sem a pilha: a mensagem já diz o que corrigir nos arquivos.
  if (!(error instanceof EquipmentDataError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
