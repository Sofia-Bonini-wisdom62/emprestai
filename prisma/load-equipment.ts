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
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT } from "./default-tenant";
import { EquipmentDataError, loadEquipmentData } from "./equipment-data";
import { readEquipmentFiles } from "./equipment-files";

// Sem argumento, cada caminho é o de prisma/data/.
const [listPath, manifestPath] = process.argv.slice(2);

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
  const { list, manifest } = readEquipmentFiles(listPath, manifestPath);

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
