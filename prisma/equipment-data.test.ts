// O carregamento dos equipamentos iniciais (spec 003, T-02). A lista é fictícia, no formato da lista
// da prática, para a lista real continuar com uma fonte só (spec 002, RN-10); um caso ca_01 lê a
// lista real, de prisma/data/equipment.json, sem copiá-la para cá (plano, passo 2). Cada caso usa
// uma área própria: o first-admin.test.ts cria e apaga a default no mesmo banco.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { afterAll, describe, expect, inject, it } from "vitest";

import type { PrismaClient } from "../src/generated/prisma/client";
import { complete, photo } from "../.claude/skills/imagens-equipamentos/scripts/lib/manifest.fixtures";
import { createTestDb } from "../tests/helpers/db";
import { CATEGORY_NAMES, EquipmentDataError, imageObjectFor, loadEquipmentData } from "./equipment-data";

const db = createTestDb(inject("databaseUrl"));
const created: string[] = [];

afterAll(async () => {
  await db.equipment.deleteMany({ where: { tenantId: { in: created } } });
  await db.equipmentCategory.deleteMany({ where: { tenantId: { in: created } } });
  await db.tenant.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

async function createArea() {
  const tenant = await db.tenant.create({ data: { slug: `dados-${randomUUID()}`, name: "Área de teste" } });
  created.push(tenant.id);
  return tenant;
}

// Quatro itens fictícios, um de cada categoria, um deles em manutenção.
const list = () => [
  { patrimonio: "TI-0001", nome: "Notebook de teste", categoria: "notebook", situacao: "disponivel", busca: "laptop" },
  { patrimonio: "TI-0002", nome: "Monitor de teste", categoria: "monitor", situacao: "manutencao", busca: "monitor" },
  { patrimonio: "TI-0003", nome: "Cabo de teste", categoria: "cabo", situacao: "disponivel", busca: "cable" },
  { patrimonio: "TI-0004", nome: "Câmera de teste", categoria: "camera", situacao: "disponivel", busca: "camera" },
];

const equipmentsOf = (tenantId: string) =>
  db.equipment.findMany({
    where: { tenantId },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, name: true, status: true, imageObject: true, category: { select: { name: true } } },
  });

describe("o mapeamento de objectName para imageObject", () => {
  it("ca_04 o imageObject é o objectName da foto aprovada do patrimônio", () => {
    expect(imageObjectFor(complete(), "TI-0001")).toBe("TI-0001-111.jpg");
  });

  it("ca_04 a foto reprovada não conta", () => {
    const manifest = { photos: [photo("TI-0001", 112, "rejected")] };

    expect(imageObjectFor(manifest, "TI-0001")).toBeNull();
  });

  it("ca_01 sem manifesto, ou sem foto do patrimônio, a imagem é nula", () => {
    expect(imageObjectFor(null, "TI-0001")).toBeNull();
    expect(imageObjectFor(complete(), "TI-0004")).toBeNull();
  });
});

describe("loadEquipmentData", () => {
  it("ca_01 sem manifesto, grava as cinco categorias e os itens da lista, com a imagem nula", async () => {
    const tenant = await createArea();

    const result = await loadEquipmentData(db, list(), null, tenant.slug);

    expect(result).toEqual({ created: 4, imageUpdated: 0, withoutImage: 4 });
    const categories = await db.equipmentCategory.findMany({ where: { tenantId: tenant.id } });
    expect(categories.map((category) => category.name).sort()).toEqual([...CATEGORY_NAMES].sort());
    const rows = await equipmentsOf(tenant.id);
    expect(
      rows.map((row) => ({
        assetTag: row.assetTag,
        name: row.name,
        status: row.status,
        imageObject: row.imageObject,
        category: row.category,
      })),
    ).toEqual([
      { assetTag: "TI-0001", name: "Notebook de teste", status: "available", imageObject: null, category: { name: "Notebooks" } },
      { assetTag: "TI-0002", name: "Monitor de teste", status: "maintenance", imageObject: null, category: { name: "Monitores" } },
      { assetTag: "TI-0003", name: "Cabo de teste", status: "available", imageObject: null, category: { name: "Cabos" } },
      { assetTag: "TI-0004", name: "Câmera de teste", status: "available", imageObject: null, category: { name: "Câmeras" } },
    ]);
  });

  it("ca_01 com o manifesto, cada item ganha o objeto da sua foto aprovada, e quem não tem foto fica nulo", async () => {
    const tenant = await createArea();

    const result = await loadEquipmentData(db, list(), complete(), tenant.slug);

    expect(result).toEqual({ created: 4, imageUpdated: 0, withoutImage: 1 });
    expect((await equipmentsOf(tenant.id)).map((row) => [row.assetTag, row.imageObject])).toEqual([
      ["TI-0001", "TI-0001-111.jpg"],
      ["TI-0002", "TI-0002-222.jpg"],
      ["TI-0003", "TI-0003-333.jpg"],
      ["TI-0004", null],
    ]);
  });

  // A lista da prática, a mesma que o seed e o passo de produção carregam. O esperado sai do
  // próprio arquivo, e as contagens, do CA-01.
  it("ca_01 com prisma/data/equipment.json, grava os 12 da prática, 9 disponíveis e 3 em manutenção, sem foto", async () => {
    const tenant = await createArea();
    const categoryOf = { notebook: "Notebooks", monitor: "Monitores", cabo: "Cabos", camera: "Câmeras" };
    const statusOf = { disponivel: "available", manutencao: "maintenance" };
    const practice = JSON.parse(readFileSync("prisma/data/equipment.json", "utf8")) as {
      patrimonio: string;
      nome: string;
      categoria: keyof typeof categoryOf;
      situacao: keyof typeof statusOf;
    }[];

    const result = await loadEquipmentData(db, practice, null, tenant.slug);

    expect(result).toEqual({ created: 12, imageUpdated: 0, withoutImage: 12 });
    const categories = await db.equipmentCategory.findMany({ where: { tenantId: tenant.id } });
    expect(categories.map((category) => category.name).sort()).toEqual([...CATEGORY_NAMES].sort());

    const rows = await equipmentsOf(tenant.id);
    expect(rows.map((row) => row.assetTag)).toEqual(
      Array.from({ length: 12 }, (_, n) => `TI-${String(n + 1).padStart(4, "0")}`),
    );
    expect(
      rows.map((row) => ({
        assetTag: row.assetTag,
        name: row.name,
        category: row.category.name,
        status: row.status,
        imageObject: row.imageObject,
      })),
    ).toEqual(
      practice.map((item) => ({
        assetTag: item.patrimonio,
        name: item.nome,
        category: categoryOf[item.categoria],
        status: statusOf[item.situacao],
        imageObject: null,
      })),
    );
    expect(rows.filter((row) => row.status === "maintenance").map((row) => row.assetTag)).toEqual([
      "TI-0004",
      "TI-0007",
      "TI-0010",
    ]);
    expect(rows.filter((row) => row.status === "available")).toHaveLength(9);
  });

  it("ca_05 a foto do manifesto para um patrimônio fora da lista é ignorada, sem recusa", async () => {
    const tenant = await createArea();
    const manifest = { photos: [photo("TI-0001", 111), photo("TI-0099", 999)] };

    const result = await loadEquipmentData(db, list(), manifest, tenant.slug);

    expect(result).toEqual({ created: 4, imageUpdated: 0, withoutImage: 3 });
    const rows = await equipmentsOf(tenant.id);
    expect(rows.map((row) => row.assetTag)).toEqual(["TI-0001", "TI-0002", "TI-0003", "TI-0004"]);
    expect(rows.find((row) => row.assetTag === "TI-0001")?.imageObject).toBe("TI-0001-111.jpg");
    expect(rows.some((row) => row.imageObject === "TI-0099-999.jpg")).toBe(false);
  });

  it("ca_02 rodar duas vezes deixa as mesmas categorias e os mesmos equipamentos, com os mesmos ids", async () => {
    const tenant = await createArea();
    await loadEquipmentData(db, list(), complete(), tenant.slug);
    const categoriesBefore = await db.equipmentCategory.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } });
    const before = await equipmentsOf(tenant.id);

    const second = await loadEquipmentData(db, list(), complete(), tenant.slug);

    expect(second).toEqual({ created: 0, imageUpdated: 0, withoutImage: 1 });
    expect(await db.equipmentCategory.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })).toEqual(
      categoriesBefore,
    );
    expect(await equipmentsOf(tenant.id)).toEqual(before);
  });

  it("ca_03 a rodada nova não muda a situação nem o nome de um equipamento que já existe", async () => {
    const tenant = await createArea();
    await loadEquipmentData(db, list(), null, tenant.slug);
    await db.equipment.update({
      where: { tenantId_assetTag: { tenantId: tenant.id, assetTag: "TI-0001" } },
      data: { status: "loaned", name: "Notebook renomeado" },
    });

    await loadEquipmentData(db, list(), complete(), tenant.slug);

    const row = await db.equipment.findUnique({
      where: { tenantId_assetTag: { tenantId: tenant.id, assetTag: "TI-0001" } },
    });
    expect(row).toMatchObject({ status: "loaned", name: "Notebook renomeado", imageObject: "TI-0001-111.jpg" });
  });

  it("ca_04 a rodada nova troca a foto, preenche a nula e nunca volta a nula", async () => {
    const tenant = await createArea();
    await loadEquipmentData(db, list(), { photos: [photo("TI-0001", 111)] }, tenant.slug);

    const swapped = await loadEquipmentData(
      db,
      list(),
      { photos: [photo("TI-0001", 222), photo("TI-0002", 333)] },
      tenant.slug,
    );
    await loadEquipmentData(db, list(), null, tenant.slug);

    expect(swapped).toEqual({ created: 0, imageUpdated: 2, withoutImage: 2 });
    expect((await equipmentsOf(tenant.id)).map((row) => [row.assetTag, row.imageObject])).toEqual([
      ["TI-0001", "TI-0001-222.jpg"],
      ["TI-0002", "TI-0002-333.jpg"],
      ["TI-0003", null],
      ["TI-0004", null],
    ]);
  });

  const invalid: Array<[string, unknown[], unknown, RegExp]> = [
    ["um patrimônio repetido", [...list(), list()[0]], null, /o patrimônio TI-0001 se repete/],
    [
      "um manifesto que não passa na conferência da spec 002",
      list(),
      { photos: [photo("TI-0001", 111, "approved", { photographer: "" })] },
      /manifesto: .*falta o autor/,
    ],
    ["uma categoria fora das chaves", [{ ...list()[0], categoria: "projetor" }], null, /categoria/],
    ["uma situação fora das chaves", [{ ...list()[0], situacao: "emprestado" }], null, /situação/],
  ];

  it.each(invalid)("ca_05 recusa sem gravar nada: %s", async (_label, items, manifest, message) => {
    const tenant = await createArea();

    const run = loadEquipmentData(db, items, manifest, tenant.slug);

    await expect(run).rejects.toBeInstanceOf(EquipmentDataError);
    await expect(run).rejects.toThrow(message);
    expect(await db.equipmentCategory.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await db.equipment.count({ where: { tenantId: tenant.id } })).toBe(0);
  });

  it("ca_06 só grava em equipment_categories e equipments", async () => {
    const tenant = await createArea();
    const written = new Set<string>();
    const watched = db.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!/^(find|count|aggregate|groupBy)/.test(operation)) written.add(model);
            return query(args);
          },
        },
      },
    });

    // O client estendido tem outro tipo, mas o mesmo comportamento do PrismaClient para o módulo.
    await loadEquipmentData(watched as unknown as PrismaClient, list(), complete(), tenant.slug);

    expect([...written].sort()).toEqual(["Equipment", "EquipmentCategory"]);
  });

  it("ca_10 grava só na área pedida, e o mesmo patrimônio de outra área não muda", async () => {
    const areaA = await createArea();
    const areaB = await createArea();
    const categoryB = await db.equipmentCategory.create({ data: { tenantId: areaB.id, name: "Notebooks" } });
    const equipmentB = await db.equipment.create({
      data: {
        tenantId: areaB.id,
        assetTag: "TI-0001",
        name: "Notebook da área B",
        categoryId: categoryB.id,
        status: "loaned",
        imageObject: "TI-0001-999.jpg",
      },
    });

    await loadEquipmentData(db, list(), complete(), areaA.slug);

    expect(await db.equipment.findUnique({ where: { id: equipmentB.id } })).toEqual(equipmentB);
    expect(await db.equipmentCategory.count({ where: { tenantId: areaB.id } })).toBe(1);
    expect(await db.equipment.count({ where: { tenantId: areaA.id } })).toBe(4);
  });

  it("ca_10 recusa uma área que não existe, sem gravar nada", async () => {
    const slug = `inexistente-${randomUUID()}`;

    await expect(loadEquipmentData(db, list(), null, slug)).rejects.toThrow(`a área ${slug} não existe`);
  });

  it("ca_11 sem manifesto e depois com ele, os mesmos equipamentos ganham as fotos", async () => {
    const tenant = await createArea();
    await loadEquipmentData(db, list(), null, tenant.slug);
    const before = await equipmentsOf(tenant.id);

    const second = await loadEquipmentData(db, list(), complete(), tenant.slug);

    expect(second).toEqual({ created: 0, imageUpdated: 3, withoutImage: 1 });
    const after = await equipmentsOf(tenant.id);
    expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
    expect(after.map((row) => row.imageObject)).toEqual(["TI-0001-111.jpg", "TI-0002-222.jpg", "TI-0003-333.jpg", null]);
  });
});
