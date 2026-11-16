import { existsSync, readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { readSeedRows, runSeed, seedTargetFromEnv } from "../tests/e2e/seed";

// A lista da prática e, quando a T-07 da spec 002 o puser no repositório, o manifesto aprovado:
// os mesmos arquivos que o seed lê (spec 003, RN-11). As chaves da lista e o que elas viram no
// banco são os do RN-03 e do RN-05.
const CATEGORY = { notebook: "Notebooks", monitor: "Monitores", cabo: "Cabos", camera: "Câmeras" };
const STATUS = { disponivel: "available", manutencao: "maintenance" };
const MANIFEST_PATH = "prisma/data/equipment-images.json";

const list = JSON.parse(readFileSync("prisma/data/equipment.json", "utf8")) as {
  patrimonio: string;
  nome: string;
  categoria: keyof typeof CATEGORY;
  situacao: keyof typeof STATUS;
}[];
const manifest = existsSync(MANIFEST_PATH)
  ? (JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      photos: { assetTag: string; objectName: string; review: { verdict: string } }[];
    })
  : null;
const imageOf = (assetTag: string) =>
  manifest?.photos.find((photo) => photo.assetTag === assetTag && photo.review.verdict === "approved")
    ?.objectName ?? null;

// O globalSetup já rodou o seed uma vez; o caso roda a segunda e conta as linhas pelo Prisma.
test("ca_13 o seed rodado duas vezes deixa uma área default e Flávia Rocha em Operações", () => {
  const target = seedTargetFromEnv();
  runSeed(target);

  const { tenants, users, profiles, memberships } = readSeedRows(target);

  expect(tenants).toEqual([{ slug: "default" }]);
  expect(users.map((user) => user.email)).toEqual(["flavia.rocha@example.com"]);
  expect(profiles).toEqual([{ id: users[0].id, name: "Flávia Rocha" }]);
  expect(memberships).toEqual([
    { userId: users[0].id, role: "operations", tenant: { slug: "default" } },
  ]);
});

// As linhas de antes são as que o seed do globalSetup deixou; o caso roda o seed de novo e compara.
test("ca_07 o seed rodado duas vezes deixa as 5 categorias e os 12 equipamentos da lista na default, sem duplicar", () => {
  const target = seedTargetFromEnv();
  const before = readSeedRows(target);

  runSeed(target);

  const after = readSeedRows(target);
  expect(after.categories.map((category) => category.name).sort()).toEqual(
    ["Cabos", "Câmeras", "Monitores", "Notebooks", "Projetores"].sort(),
  );
  expect(
    after.equipments.map((equipment) => ({
      assetTag: equipment.assetTag,
      name: equipment.name,
      category: equipment.category.name,
      status: equipment.status,
      imageObject: equipment.imageObject,
    })),
  ).toEqual(
    list.map((item) => ({
      assetTag: item.patrimonio,
      name: item.nome,
      category: CATEGORY[item.categoria],
      status: STATUS[item.situacao],
      imageObject: imageOf(item.patrimonio),
    })),
  );
  expect(after.equipments.map((equipment) => equipment.assetTag)).toEqual(
    Array.from({ length: 12 }, (_, n) => `TI-${String(n + 1).padStart(4, "0")}`),
  );
  expect(
    after.equipments.filter((equipment) => equipment.status === "maintenance").map((equipment) => equipment.assetTag),
  ).toEqual(["TI-0004", "TI-0007", "TI-0010"]);

  // Os mesmos ids e os mesmos valores: a segunda rodada não criou nem mudou nada.
  expect(after.categories).toEqual(before.categories);
  expect(after.equipments).toEqual(before.equipments);
});
