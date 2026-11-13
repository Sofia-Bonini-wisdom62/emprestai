// equipment.list e equipment.byId (spec 004, T-02): a parte da API do CA-08 e do CA-09, o
// UNAUTHORIZED do CA-13 e o isolamento do CA-15. A tela é da T-05 e da T-06.
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { appRouter } from "@/server/api/root";
import { type Context, createCallerFactory } from "@/server/api/trpc";
import { createTwoAreas } from "../../../../tests/helpers/accounts";
import { createTestDb } from "../../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const createCaller = createCallerFactory(appRouter);
const BASE = "https://imagens.example.com/storage/v1/object/public/equipment-images";

let areas: Awaited<ReturnType<typeof createTwoAreas>>;
let enzoId: string;
// Os equipamentos da área A, por patrimônio, e o de B.
const inA: Record<string, string> = {};
let equipmentOfB: string;

function asBeatriz(extra: Partial<Context> = {}) {
  return createCaller({
    db,
    session: areas.inA,
    tenantId: areas.tenantA.id,
    role: "member",
    equipmentImagesBaseUrl: BASE,
    ...extra,
  });
}

beforeAll(async () => {
  areas = await createTwoAreas(db);
  enzoId = randomUUID();
  await db.membership.create({
    data: { tenantId: areas.tenantA.id, userId: enzoId, role: "member" },
  });
  await db.profile.create({ data: { id: enzoId, name: "Enzo Paiva" } });

  const categoryA = await db.equipmentCategory.create({
    data: { tenantId: areas.tenantA.id, name: "Monitores" },
  });
  const categoryB = await db.equipmentCategory.create({
    data: { tenantId: areas.tenantB.id, name: "Monitores" },
  });

  // 26 itens em A, para passar de uma página de 24, numa ordem de criação que não é a do patrimônio.
  for (const n of [3, 1, 2, ...Array.from({ length: 23 }, (_, i) => i + 4)]) {
    const assetTag = `TI-${String(n).padStart(4, "0")}`;
    const equipment = await db.equipment.create({
      data: {
        tenantId: areas.tenantA.id,
        assetTag,
        name: n === 1 ? "Notebook 14 polegadas" : `Monitor ${n}`,
        categoryId: categoryA.id,
        status: n === 4 ? "maintenance" : "available",
        imageObject: `${assetTag}-111.jpg`,
      },
    });
    inA[assetTag] = equipment.id;
  }
  const b = await db.equipment.create({
    data: {
      tenantId: areas.tenantB.id,
      assetTag: "TI-0001",
      name: "Notebook da área B",
      categoryId: categoryB.id,
      status: "loaned",
      imageObject: "TI-0001-999.jpg",
    },
  });
  equipmentOfB = b.id;

  // TI-0001 emprestado a Beatriz, até 26/11/2026; o de B, a Flávia, que é de B.
  await db.equipment.update({ where: { id: inA["TI-0001"] }, data: { status: "loaned" } });
  await db.loan.createMany({
    data: [
      {
        tenantId: areas.tenantA.id,
        equipmentId: inA["TI-0001"]!,
        userId: areas.inA.userId,
        dueOn: new Date("2026-11-26"),
      },
      {
        tenantId: areas.tenantB.id,
        equipmentId: equipmentOfB,
        userId: areas.inB.userId,
        dueOn: new Date("2026-11-27"),
      },
    ],
  });
});

afterAll(async () => {
  const tenantIds = [areas.tenantA.id, areas.tenantB.id];
  await db.loan.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await db.equipment.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await db.equipmentCategory.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await db.membership.deleteMany({ where: { userId: enzoId } });
  await db.profile.deleteMany({ where: { id: enzoId } });
  await areas.cleanup();
  await db.$disconnect();
});

describe("equipment.list", () => {
  it("ca_08 devolve a primeira página de 24, em ordem de patrimônio, com a foto montada na base", async () => {
    const page = await asBeatriz().equipment.list({});

    expect(page.items).toHaveLength(24);
    expect(page.items.map((item) => item.assetTag)).toEqual(
      Array.from({ length: 24 }, (_, i) => `TI-${String(i + 1).padStart(4, "0")}`),
    );
    expect(page.items[1]).toEqual({
      id: inA["TI-0002"],
      assetTag: "TI-0002",
      name: "Monitor 2",
      category: "Monitores",
      status: "available",
      imageUrl: `${BASE}/TI-0002-111.jpg`,
      borrower: null,
    });
    expect(page.items[3]).toMatchObject({ assetTag: "TI-0004", status: "maintenance" });
    expect(page.nextCursor).toBe(inA["TI-0024"]);
  });

  it("ca_08 a segunda página, pelo cursor, traz o resto e termina sem cursor", async () => {
    const first = await asBeatriz().equipment.list({});
    const second = await asBeatriz().equipment.list({ cursor: first.nextCursor! });

    expect(second.items.map((item) => item.assetTag)).toEqual(["TI-0025", "TI-0026"]);
    expect(second.nextCursor).toBeNull();
  });

  it("ca_08 sem a base das fotos, imageUrl é null", async () => {
    const page = await asBeatriz({ equipmentImagesBaseUrl: null }).equipment.list({ limit: 2 });

    expect(page.items.map((item) => item.imageUrl)).toEqual([null, null]);
  });

  it("ca_08 a base com barra no fim não dobra a barra", async () => {
    const page = await asBeatriz({ equipmentImagesBaseUrl: `${BASE}/` }).equipment.list({
      limit: 1,
    });

    expect(page.items[0]?.imageUrl).toBe(`${BASE}/TI-0001-111.jpg`);
  });

  it("ca_09 o item emprestado traz quem está com ele e a data prevista", async () => {
    const page = await createCaller({
      db,
      session: { userId: enzoId, email: "enzo.paiva@example.com" },
      tenantId: areas.tenantA.id,
      role: "member",
      equipmentImagesBaseUrl: BASE,
    }).equipment.list({ limit: 1 });

    expect(page.items[0]).toMatchObject({
      assetTag: "TI-0001",
      status: "loaned",
      borrower: { name: "Beatriz Fontes", dueOn: "2026-11-26" },
    });
  });

  it("ca_15 recusa um tenantId no input, na validação", async () => {
    const list = asBeatriz().equipment.list as (input: unknown) => Promise<unknown>;

    await expect(list({ tenantId: areas.tenantB.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("ca_08 recusa limite fora de 1 a 24 e cursor que não é UUID", async () => {
    const list = asBeatriz().equipment.list as (input: unknown) => Promise<unknown>;

    await expect(list({ limit: 25 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(list({ cursor: "TI-0001" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("equipment.byId", () => {
  it("ca_09 o detalhe do item emprestado traz quem está com ele e a data", async () => {
    await expect(
      asBeatriz().equipment.byId({ equipmentId: inA["TI-0001"]! }),
    ).resolves.toEqual({
      id: inA["TI-0001"],
      assetTag: "TI-0001",
      name: "Notebook 14 polegadas",
      category: "Monitores",
      status: "loaned",
      imageUrl: `${BASE}/TI-0001-111.jpg`,
      borrower: { name: "Beatriz Fontes", dueOn: "2026-11-26" },
    });
  });

  it("ca_15 um id que não existe responde NOT_FOUND", async () => {
    await expect(
      asBeatriz().equipment.byId({ equipmentId: randomUUID() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("sem sessão", () => {
  const anonymous = () => createCaller({ db, session: null });

  it("ca_13 equipment.list responde UNAUTHORIZED", async () => {
    await expect(anonymous().equipment.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("ca_13 equipment.byId responde UNAUTHORIZED", async () => {
    await expect(
      anonymous().equipment.byId({ equipmentId: inA["TI-0001"]! }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("isolamento entre áreas", () => {
  it("ca_15 equipment.list de A não traz o equipamento de B, nem o nome de quem o pegou", async () => {
    const first = await asBeatriz().equipment.list({});
    const second = await asBeatriz().equipment.list({ cursor: first.nextCursor! });
    const all = [...first.items, ...second.items];

    expect(all).toHaveLength(26);
    expect(all.map((item) => item.id)).not.toContain(equipmentOfB);
    expect(JSON.stringify(all)).not.toContain("Flávia Rocha");
    expect(JSON.stringify(all)).not.toContain("Notebook da área B");
  });

  it("ca_15 equipment.byId com o id do equipamento de B responde NOT_FOUND", async () => {
    await expect(asBeatriz().equipment.byId({ equipmentId: equipmentOfB })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
  });

  it("ca_15 o cursor de um equipamento de B devolve a página vazia", async () => {
    await expect(asBeatriz().equipment.list({ cursor: equipmentOfB })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("ca_15 a área sai da sessão: quem está em B vê só o de B", async () => {
    const page = await createCaller({
      db,
      session: areas.inB,
      tenantId: areas.tenantB.id,
      role: "operations",
      equipmentImagesBaseUrl: BASE,
    }).equipment.list({});

    expect(page.items.map((item) => item.id)).toEqual([equipmentOfB]);
    expect(page.items[0]?.borrower).toEqual({ name: "Flávia Rocha", dueOn: "2026-11-27" });
  });
});

describe("banco fora do ar", () => {
  const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");

  afterAll(async () => {
    await unreachableDb.$disconnect();
  });

  it("az_04 equipment.list falha sem repassar o erro do driver", async () => {
    const list = createCaller({
      db: unreachableDb,
      session: areas.inA,
      tenantId: areas.tenantA.id,
      role: "member",
    }).equipment.list({});

    await expect(list).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "INTERNAL_SERVER_ERROR",
    });
    await expect(list).rejects.not.toHaveProperty("cause.message");
  });
});
