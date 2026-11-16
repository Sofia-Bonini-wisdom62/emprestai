// loan.create (spec 004, T-03) e loan.listMine (T-04): a parte da API do CA-01, do CA-10 e do
// CA-11, os CA-02 a CA-06, a defesa do índice (CA-07), a auditoria (CA-12), o UNAUTHORIZED do
// CA-13, o input estrito (CA-14) e o isolamento (CA-15). As telas são da T-05 à T-07.
//
// audit_events é append-only (RN-22), e a FK dela segura a área: nenhum caso apaga o que criou.
// Cada caso usa uma área nova, com nomes únicos, no banco efêmero do Testcontainers.
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, inject, it } from "vitest";

import type { EquipmentStatus, MembershipRole, PrismaClient } from "@/generated/prisma/client";
import { appRouter } from "@/server/api/root";
import {
  type Context,
  createCallerFactory,
  DomainRefusal,
  formatError,
} from "@/server/api/trpc";
import { calendarDateInSaoPaulo, dueOnFor } from "@/server/services/loan";
import { createTestDb } from "../../../../tests/helpers/db";

const databaseUrl = inject("databaseUrl");
const db = createTestDb(databaseUrl);
const createCaller = createCallerFactory(appRouter);
const extraClients: PrismaClient[] = [];

afterAll(async () => {
  await Promise.all([db, ...extraClients].map((client) => client.$disconnect()));
});

// Outra conexão ao mesmo banco: o createTestDb abre uma só por cliente.
function anotherConnection() {
  const client = createTestDb(databaseUrl);
  extraClients.push(client);
  return client;
}

// 12/11/2026 às 22h30 em São Paulo, que já é 13/11 em UTC.
const NOV_12_2230_SP = new Date("2026-11-13T01:30:00Z");

const people = {
  beatriz: { name: "Beatriz Fontes", role: "member" },
  caio: { name: "Caio Moreira", role: "member" },
  enzo: { name: "Enzo Paiva", role: "member" },
  flavia: { name: "Flávia Rocha", role: "operations" },
} satisfies Record<string, { name: string; role: MembershipRole }>;
type Person = keyof typeof people;

const tags = ["TI-0001", "TI-0002", "TI-0003", "TI-0004", "TI-0005", "TI-0006", "TI-0007"] as const;
type Tag = (typeof tags)[number];
const initialStatus: Partial<Record<Tag, EquipmentStatus>> = {
  "TI-0004": "maintenance",
  "TI-0007": "out_of_service",
};

type Area = Awaited<ReturnType<typeof createArea>>;

async function createArea() {
  const tenant = await db.tenant.create({
    data: { slug: `loan-${randomUUID()}`, name: "Área de teste" },
  });
  const category = await db.equipmentCategory.create({
    data: { tenantId: tenant.id, name: "Notebooks" },
  });

  const userIds = {} as Record<Person, string>;
  for (const [key, person] of Object.entries(people) as [Person, (typeof people)[Person]][]) {
    userIds[key] = randomUUID();
    await db.membership.create({
      data: { tenantId: tenant.id, userId: userIds[key], role: person.role },
    });
    await db.profile.create({ data: { id: userIds[key], name: person.name } });
  }

  const equipment = {} as Record<Tag, string>;
  for (const tag of tags) {
    const row = await db.equipment.create({
      data: {
        tenantId: tenant.id,
        assetTag: tag,
        name: `Equipamento ${tag}`,
        categoryId: category.id,
        status: initialStatus[tag] ?? "available",
        imageObject: `${tag}-111.jpg`,
      },
    });
    equipment[tag] = row.id;
  }

  return { tenantId: tenant.id, userIds, equipment };
}

// Um empréstimo em aberto já existente, como o pedido o teria deixado.
async function giveLoan(area: Area, person: Person, tag: Tag, dueOn = "2026-11-26") {
  await db.equipment.update({ where: { id: area.equipment[tag] }, data: { status: "loaned" } });
  await db.loan.create({
    data: {
      tenantId: area.tenantId,
      equipmentId: area.equipment[tag],
      userId: area.userIds[person],
      dueOn: new Date(`${dueOn}T00:00:00Z`),
    },
  });
}

function caller(
  area: Area,
  person: Person,
  extra: Partial<Pick<Context, "db" | "now">> = {},
) {
  return createCaller({
    db,
    session: { userId: area.userIds[person], email: `${person}@example.com` },
    tenantId: area.tenantId,
    role: people[person].role,
    now: () => NOV_12_2230_SP,
    ...extra,
  });
}

async function equipmentStatus(area: Area, tag: Tag) {
  const row = await db.equipment.findUniqueOrThrow({ where: { id: area.equipment[tag] } });
  return row.status;
}

const openLoans = (area: Area, person?: Person) =>
  db.loan.count({
    where: {
      tenantId: area.tenantId,
      returnedAt: null,
      ...(person ? { userId: area.userIds[person] } : {}),
    },
  });

const auditEvents = (area: Area) => db.auditEvent.count({ where: { tenantId: area.tenantId } });

// O createCaller não passa pelo errorFormatter: a recusa chega no cause, e o formatter que a
// leva a data.reason tem caso próprio, abaixo.
function refusal(code: string, reason: string, message: string) {
  return { code, message, cause: { reason } };
}
const unavailable = refusal(
  "CONFLICT",
  "EQUIPMENT_UNAVAILABLE",
  "Este equipamento não está disponível.",
);
const limitReached = refusal(
  "FORBIDDEN",
  "LOAN_LIMIT_REACHED",
  "Você já está com 3 itens. Devolva um para pedir outro.",
);
const overdue = refusal(
  "FORBIDDEN",
  "LOAN_OVERDUE",
  "Você tem um item em atraso. Devolva-o para pedir outro.",
);

describe("o errorFormatter", () => {
  const shape = { message: "m", code: -32603, data: { code: "FORBIDDEN", httpStatus: 403 } };

  it("ca_03 leva o código da recusa a data.reason, que a tela lê", () => {
    const error = { cause: new DomainRefusal("LOAN_LIMIT_REACHED", "texto") };

    expect(formatError({ shape, error }).data).toEqual({
      code: "FORBIDDEN",
      httpStatus: 403,
      reason: "LOAN_LIMIT_REACHED",
    });
  });

  it("ca_15 todo outro erro sai com data.reason null", () => {
    expect(formatError({ shape, error: { cause: new Error("driver") } }).data.reason).toBeNull();
    expect(formatError({ shape, error: {} }).data.reason).toBeNull();
  });
});

describe("o relógio de São Paulo", () => {
  it("ca_01 às 22h30 de 12/11 em São Paulo, a data é 12/11 e a prevista é 26/11", () => {
    expect(calendarDateInSaoPaulo(NOV_12_2230_SP)).toBe("2026-11-12");
    expect(dueOnFor(NOV_12_2230_SP)).toBe("2026-11-26");
  });

  it("ca_01 14 dias corridos atravessam o fim do mês e o do ano, sem ajuste", () => {
    expect(dueOnFor(new Date("2026-11-20T15:00:00Z"))).toBe("2026-12-04");
    expect(dueOnFor(new Date("2026-12-25T15:00:00Z"))).toBe("2027-01-08");
  });
});

describe("loan.create", () => {
  it("ca_01 cria o empréstimo com a data prevista, tira o item do disponível e audita", async () => {
    const area = await createArea();

    const loan = await caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0001"] });

    expect(loan).toEqual({
      id: expect.any(String),
      equipmentId: area.equipment["TI-0001"],
      dueOn: "2026-11-26",
    });
    const row = await db.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(row).toMatchObject({
      tenantId: area.tenantId,
      userId: area.userIds.beatriz,
      returnedAt: null,
    });
    expect(row.dueOn.toISOString().slice(0, 10)).toBe("2026-11-26");
    await expect(equipmentStatus(area, "TI-0001")).resolves.toBe("loaned");
  });

  it.each([
    ["maintenance", "TI-0004"],
    ["out_of_service", "TI-0007"],
  ] as const)("ca_02 recusa o item em %s, sem gravar nada", async (_status, tag) => {
    const area = await createArea();

    await expect(
      caller(area, "beatriz").loan.create({ equipmentId: area.equipment[tag] }),
    ).rejects.toMatchObject(unavailable);
    await expect(openLoans(area)).resolves.toBe(0);
    await expect(auditEvents(area)).resolves.toBe(0);
    await expect(equipmentStatus(area, tag)).resolves.toBe(initialStatus[tag]);
  });

  it("ca_02 recusa o item já emprestado a outra pessoa", async () => {
    const area = await createArea();
    await giveLoan(area, "enzo", "TI-0001");

    await expect(
      caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0001"] }),
    ).rejects.toMatchObject(unavailable);
    await expect(openLoans(area, "beatriz")).resolves.toBe(0);
    await expect(auditEvents(area)).resolves.toBe(0);
  });

  it("ca_03 com 3 em aberto, recusa o quarto e o item continua disponível", async () => {
    const area = await createArea();
    await giveLoan(area, "beatriz", "TI-0001");
    await giveLoan(area, "beatriz", "TI-0002");
    await giveLoan(area, "beatriz", "TI-0003");

    await expect(
      caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0005"] }),
    ).rejects.toMatchObject(limitReached);
    await expect(equipmentStatus(area, "TI-0005")).resolves.toBe("available");
    await expect(openLoans(area, "beatriz")).resolves.toBe(3);
    await expect(auditEvents(area)).resolves.toBe(0);
  });

  it("ca_03 com 2 em aberto, o terceiro passa", async () => {
    const area = await createArea();
    await giveLoan(area, "beatriz", "TI-0001");
    await giveLoan(area, "beatriz", "TI-0002");

    await caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0005"] });

    await expect(openLoans(area, "beatriz")).resolves.toBe(3);
  });

  it("ca_04 no dia da data prevista ainda está no prazo; no dia seguinte, está em atraso", async () => {
    const area = await createArea();
    await giveLoan(area, "caio", "TI-0001", "2026-11-26");

    // 26/11 às 23h30 em São Paulo, já 27/11 em UTC: ainda no prazo.
    await caller(area, "caio", { now: () => new Date("2026-11-27T02:30:00Z") }).loan.create({
      equipmentId: area.equipment["TI-0002"],
    });

    // 27/11 às 0h30 em São Paulo: em atraso.
    await expect(
      caller(area, "caio", { now: () => new Date("2026-11-27T03:30:00Z") }).loan.create({
        equipmentId: area.equipment["TI-0005"],
      }),
    ).rejects.toMatchObject(overdue);
    await expect(equipmentStatus(area, "TI-0005")).resolves.toBe("available");
    await expect(openLoans(area, "caio")).resolves.toBe(2);
    // ca_12: só o pedido que passou, no dia 26, gravou auditoria; a recusa não grava.
    await expect(auditEvents(area)).resolves.toBe(1);
  });

  it("ca_07 se já houver um empréstimo em aberto do item, o índice recusa e nada muda", async () => {
    const area = await createArea();
    // Estado que só outro caminho de escrita deixaria: o item disponível com empréstimo em aberto.
    await giveLoan(area, "enzo", "TI-0001");
    await db.equipment.update({
      where: { id: area.equipment["TI-0001"] },
      data: { status: "available" },
    });

    await expect(
      caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0001"] }),
    ).rejects.toMatchObject(unavailable);
    await expect(equipmentStatus(area, "TI-0001")).resolves.toBe("available");
    await expect(openLoans(area, "beatriz")).resolves.toBe(0);
    await expect(auditEvents(area)).resolves.toBe(0);
  });

  it("ca_11 quem é de Operações solicita sob o mesmo limite", async () => {
    const area = await createArea();

    await caller(area, "flavia").loan.create({ equipmentId: area.equipment["TI-0002"] });
    await caller(area, "flavia").loan.create({ equipmentId: area.equipment["TI-0003"] });
    await caller(area, "flavia").loan.create({ equipmentId: area.equipment["TI-0005"] });

    await expect(
      caller(area, "flavia").loan.create({ equipmentId: area.equipment["TI-0006"] }),
    ).rejects.toMatchObject(limitReached);
    await expect(openLoans(area, "flavia")).resolves.toBe(3);
  });

  it("ca_12 o empréstimo criado grava uma linha de auditoria com ator, área, ação e recurso", async () => {
    const area = await createArea();

    const loan = await caller(area, "beatriz").loan.create({ equipmentId: area.equipment["TI-0001"] });

    await expect(
      db.auditEvent.findMany({
        where: { tenantId: area.tenantId },
        select: { tenantId: true, actorUserId: true, action: true, resourceType: true, resourceId: true },
      }),
    ).resolves.toEqual([
      {
        tenantId: area.tenantId,
        actorUserId: area.userIds.beatriz,
        action: "loan.create",
        resourceType: "loan",
        resourceId: loan.id,
      },
    ]);
  });

  it("ca_13 sem sessão, responde UNAUTHORIZED", async () => {
    await expect(
      createCaller({ db, session: null }).loan.create({ equipmentId: randomUUID() }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([
    ["tenantId", { tenantId: randomUUID() }],
    ["userId", { userId: randomUUID() }],
    ["dueOn", { dueOn: "2027-01-01" }],
  ])("ca_14 recusa o input com %s, na validação", async (_field, extra) => {
    const area = await createArea();
    const create = caller(area, "beatriz").loan.create as (input: unknown) => Promise<unknown>;

    await expect(
      create({ equipmentId: area.equipment["TI-0001"], ...extra }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(openLoans(area)).resolves.toBe(0);
  });

  it("ca_14 recusa um equipmentId que não é UUID", async () => {
    const area = await createArea();
    const create = caller(area, "beatriz").loan.create as (input: unknown) => Promise<unknown>;

    await expect(create({ equipmentId: "TI-0001" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// Uma transação de outra conexão segura a linha até o teste soltar. Os pedidos param nessa
// trava; o teste só solta quando os dois estão parados nela, então os dois estão abertos ao
// mesmo tempo, e nenhum confirmou antes de o outro começar.
function holdRowLock(client: PrismaClient, lockSql: string) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let locked!: () => void;
  const isLocked = new Promise<void>((resolve) => (locked = resolve));
  const done = client.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(lockSql);
      locked();
      await released;
    },
    { timeout: 20_000 },
  );
  return { isLocked, release, done };
}

async function waitForLockWaiters(observer: PrismaClient, queryPattern: string, count: number) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const [row] = await observer.$queryRaw<{ waiting: bigint }[]>`
      SELECT count(*) AS waiting FROM pg_stat_activity
      WHERE datname = current_database()
        AND wait_event_type = 'Lock'
        AND query ILIKE ${queryPattern}`;
    if (Number(row?.waiting ?? 0) >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`os ${count} pedidos não chegaram à trava`);
}

describe("pedidos simultâneos", () => {
  it("ca_05 dois pedidos ao mesmo equipamento ao mesmo tempo criam um empréstimo só", async () => {
    const area = await createArea();
    const target = area.equipment["TI-0005"];
    const blocker = holdRowLock(
      anotherConnection(),
      `SELECT id FROM equipments WHERE id = '${target}' FOR UPDATE`,
    );
    await blocker.isLocked;

    const requests = [
      caller(area, "beatriz", { db: anotherConnection() }).loan.create({ equipmentId: target }),
      caller(area, "enzo", { db: anotherConnection() }).loan.create({ equipmentId: target }),
    ].map((request) => request.then((loan) => ({ loan }), (error: unknown) => ({ error })));

    await waitForLockWaiters(db, "%equipments%", 2);
    blocker.release();
    await blocker.done;
    const results = await Promise.all(requests);

    expect(results.filter((result) => "loan" in result)).toHaveLength(1);
    const refused = results.filter((result) => "error" in result);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ error: unavailable });
    await expect(db.loan.count({ where: { equipmentId: target, returnedAt: null } })).resolves.toBe(1);
    await expect(auditEvents(area)).resolves.toBe(1);
  });

  it("ca_06 dois pedidos da mesma pessoa ao mesmo tempo não passam do limite", async () => {
    const area = await createArea();
    await giveLoan(area, "beatriz", "TI-0001");
    await giveLoan(area, "beatriz", "TI-0002");
    const blocker = holdRowLock(
      anotherConnection(),
      `SELECT id FROM memberships WHERE tenant_id = '${area.tenantId}'
         AND user_id = '${area.userIds.beatriz}' FOR UPDATE`,
    );
    await blocker.isLocked;

    const requests = (["TI-0005", "TI-0006"] as const)
      .map((tag) =>
        caller(area, "beatriz", { db: anotherConnection() }).loan.create({
          equipmentId: area.equipment[tag],
        }),
      )
      .map((request) => request.then((loan) => ({ loan }), (error: unknown) => ({ error })));

    await waitForLockWaiters(db, "%FROM memberships%FOR UPDATE%", 2);
    blocker.release();
    await blocker.done;
    const results = await Promise.all(requests);

    expect(results.filter((result) => "loan" in result)).toHaveLength(1);
    const refused = results.filter((result) => "error" in result);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ error: limitReached });
    await expect(openLoans(area, "beatriz")).resolves.toBe(3);
    // ca_12: só o pedido que passou grava auditoria; a recusa pelo limite não grava.
    await expect(auditEvents(area)).resolves.toBe(1);
  });
});

describe("isolamento entre áreas", () => {
  it("ca_15 o equipamento de outra área é NOT_FOUND, sem gravar nada nas duas", async () => {
    const areaA = await createArea();
    const areaB = await createArea();

    await expect(
      caller(areaA, "beatriz").loan.create({ equipmentId: areaB.equipment["TI-0001"] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(equipmentStatus(areaB, "TI-0001")).resolves.toBe("available");
    await expect(openLoans(areaA)).resolves.toBe(0);
    await expect(openLoans(areaB)).resolves.toBe(0);
    await expect(auditEvents(areaA)).resolves.toBe(0);
    await expect(auditEvents(areaB)).resolves.toBe(0);
  });

  it("ca_15 o limite e o atraso não contam os empréstimos da mesma pessoa em outra área", async () => {
    const areaA = await createArea();
    const areaB = await createArea();
    // Beatriz também tem vínculo em B, com 3 empréstimos ali, um deles já em atraso.
    await db.membership.create({
      data: { tenantId: areaB.tenantId, userId: areaA.userIds.beatriz, role: "member" },
    });
    const inB = { ...areaB, userIds: { ...areaB.userIds, beatriz: areaA.userIds.beatriz } };
    await giveLoan(inB, "beatriz", "TI-0001", "2026-11-01");
    await giveLoan(inB, "beatriz", "TI-0002");
    await giveLoan(inB, "beatriz", "TI-0003");

    const loan = await caller(areaA, "beatriz").loan.create({
      equipmentId: areaA.equipment["TI-0001"],
    });

    expect(loan.dueOn).toBe("2026-11-26");
    await expect(openLoans(areaA, "beatriz")).resolves.toBe(1);
  });

  it("ca_15 a área sai da sessão: com o vínculo só em A, o pedido nunca grava em B", async () => {
    const areaA = await createArea();
    const areaB = await createArea();

    await expect(
      createCaller({
        db,
        session: { userId: areaA.userIds.beatriz, email: "beatriz@example.com" },
        tenantId: areaB.tenantId,
        role: "member",
        now: () => NOV_12_2230_SP,
      }).loan.create({ equipmentId: areaB.equipment["TI-0001"] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(openLoans(areaB)).resolves.toBe(0);
  });
});

describe("banco fora do ar", () => {
  it("az_04 loan.create falha sem repassar o erro do driver", async () => {
    const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");
    extraClients.push(unreachableDb);

    const create = createCaller({
      db: unreachableDb,
      session: { userId: randomUUID(), email: "beatriz@example.com" },
      tenantId: randomUUID(),
      role: "member",
    }).loan.create({ equipmentId: randomUUID() });

    await expect(create).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "INTERNAL_SERVER_ERROR",
    });
    await expect(create).rejects.not.toHaveProperty("cause.message");
  });
});

describe("loan.listMine", () => {
  it("ca_10 traz só os empréstimos em aberto da pessoa, com nome, patrimônio, data e a contagem", async () => {
    const area = await createArea();
    await giveLoan(area, "beatriz", "TI-0002", "2026-11-28");
    await giveLoan(area, "beatriz", "TI-0001", "2026-11-26");
    await giveLoan(area, "enzo", "TI-0003");

    const mine = await caller(area, "beatriz").loan.listMine();

    expect(mine).toEqual({
      items: [
        {
          id: expect.any(String),
          equipmentId: area.equipment["TI-0001"],
          assetTag: "TI-0001",
          name: "Equipamento TI-0001",
          dueOn: "2026-11-26",
          overdue: false,
        },
        {
          id: expect.any(String),
          equipmentId: area.equipment["TI-0002"],
          assetTag: "TI-0002",
          name: "Equipamento TI-0002",
          dueOn: "2026-11-28",
          overdue: false,
        },
      ],
      count: 2,
      limit: 3,
      hasOverdue: false,
    });
  });

  it("ca_10 sem empréstimo, a lista vem vazia, com o limite", async () => {
    const area = await createArea();

    await expect(caller(area, "enzo").loan.listMine()).resolves.toEqual({
      items: [],
      count: 0,
      limit: 3,
      hasOverdue: false,
    });
  });

  it("ca_04 o empréstimo vencido aparece em atraso a partir do dia seguinte", async () => {
    const area = await createArea();
    await giveLoan(area, "caio", "TI-0001", "2026-11-26");

    const onDueDay = await caller(area, "caio", {
      now: () => new Date("2026-11-27T02:30:00Z"),
    }).loan.listMine();
    const dayAfter = await caller(area, "caio", {
      now: () => new Date("2026-11-27T03:30:00Z"),
    }).loan.listMine();

    expect(onDueDay.hasOverdue).toBe(false);
    expect(dayAfter).toMatchObject({ hasOverdue: true, items: [{ overdue: true }] });
  });

  it("ca_13 sem sessão, responde UNAUTHORIZED", async () => {
    await expect(createCaller({ db, session: null }).loan.listMine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("ca_15 não traz os empréstimos da mesma pessoa em outra área", async () => {
    const areaA = await createArea();
    const areaB = await createArea();
    await db.membership.create({
      data: { tenantId: areaB.tenantId, userId: areaA.userIds.beatriz, role: "member" },
    });
    const inB = { ...areaB, userIds: { ...areaB.userIds, beatriz: areaA.userIds.beatriz } };
    await giveLoan(inB, "beatriz", "TI-0001", "2026-11-01");
    await giveLoan(areaA, "beatriz", "TI-0002");

    const mine = await caller(areaA, "beatriz").loan.listMine();

    expect(mine).toMatchObject({ count: 1, hasOverdue: false });
    expect(mine.items.map((item) => item.equipmentId)).toEqual([areaA.equipment["TI-0002"]]);
  });
});
