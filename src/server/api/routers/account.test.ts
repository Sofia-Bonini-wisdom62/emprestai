import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { authMessages } from "@/lib/auth-messages";
import { appRouter } from "@/server/api/root";
import { type Context, createCallerFactory } from "@/server/api/trpc";
import type { AuthPort } from "@/server/services/auth";
import {
  CURRENT_PASSWORD,
  createFirstEntryTenant,
  createTwoAreas,
  fakeAuth,
} from "../../../../tests/helpers/auth";
import { createTestDb } from "../../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const createCaller = createCallerFactory(appRouter);

let firstEntry: Awaited<ReturnType<typeof createFirstEntryTenant>>;

function caller(
  session: Context["session"],
  extra: Partial<Pick<Context, "tenantId" | "role">> & {
    auth?: AuthPort | null;
  } = {},
) {
  return createCaller({
    db,
    session,
    firstEntryTenantSlug: firstEntry.slug,
    ...extra,
  });
}

beforeAll(async () => {
  firstEntry = await createFirstEntryTenant(db);
});

afterAll(async () => {
  await firstEntry.cleanup();
  await db.$disconnect();
});

describe("sem sessão", () => {
  it("ca_09 account.me falha com UNAUTHORIZED", async () => {
    await expect(caller(null).account.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("ca_09 account.setup falha com UNAUTHORIZED", async () => {
    await expect(
      caller(null).account.setup({ name: "Enzo Paiva" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("banco fora do ar", () => {
  const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");

  afterAll(async () => {
    await unreachableDb.$disconnect();
  });

  it("az_04 com sessão e banco fora do ar, account.me falha sem repassar o erro do driver", async () => {
    const session = { userId: randomUUID(), email: "beatriz.fontes@example.com" };
    const me = createCaller({ db: unreachableDb, session }).account.me();

    await expect(me).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "INTERNAL_SERVER_ERROR",
    });
    await expect(me).rejects.not.toHaveProperty("cause.message");
  });
});

describe("account.setup na primeira entrada", () => {
  it("ca_05 a entrada pelo link do convite cria o vínculo member na default; a segunda não cria outro", async () => {
    const userId = randomUUID();
    const session = { userId, email: "enzo.paiva@example.com" };
    const { auth, calls } = fakeAuth();
    const { tenant } = firstEntry;

    try {
      await expect(
        caller(session, { auth }).account.setup({
          password: "senha-nova",
          name: "Enzo Paiva",
        }),
      ).resolves.toEqual({ redirectTo: "/catalog" });
      await expect(
        caller(session, { auth }).account.setup({ name: "Enzo Paiva" }),
      ).resolves.toEqual({ redirectTo: "/catalog" });

      await expect(
        db.membership.findMany({
          where: { userId },
          select: { tenantId: true, role: true },
        }),
      ).resolves.toEqual([{ tenantId: tenant.id, role: "member" }]);
      expect(calls.updateUser).toEqual(["senha-nova"]);
    } finally {
      await db.membership.deleteMany({ where: { userId } });
      await db.profile.deleteMany({ where: { id: userId } });
    }
  });
});

describe("nome no primeiro acesso", () => {
  const userId = randomUUID();
  const session = { userId, email: "enzo.paiva@example.com" };

  afterAll(async () => {
    await db.membership.deleteMany({ where: { userId } });
    await db.profile.deleteMany({ where: { id: userId } });
  });

  it.each([
    ["vazio", ""],
    ["só com espaços", "   "],
  ])("ca_06 nome %s não é salvo e mostra a mensagem do RN-27", async (_, name) => {
    const setup = caller(session).account.setup({ name });

    await expect(setup).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(setup).rejects.toThrow(authMessages.nameRequired);
    await expect(db.profile.count({ where: { id: userId } })).resolves.toBe(0);
  });

  it("ca_06 nome de 81 caracteres é recusado, e o de 80 é salvo sem os espaços das pontas", async () => {
    await expect(
      caller(session).account.setup({ name: "a".repeat(81) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(db.profile.count({ where: { id: userId } })).resolves.toBe(0);

    const name = "b".repeat(80);
    await expect(
      caller(session).account.setup({ name: `  ${name}  ` }),
    ).resolves.toEqual({ redirectTo: "/catalog" });
    await expect(
      db.profile.findUnique({ where: { id: userId }, select: { name: true } }),
    ).resolves.toEqual({ name });
  });

  it("ca_06 sem nome salvo, o destino continua sendo /account/setup", async () => {
    const withoutName = { userId: randomUUID(), email: "caio.moreira@example.com" };

    try {
      await expect(
        caller(withoutName, { auth: fakeAuth().auth }).account.setup({
          password: "senha-nova",
        }),
      ).resolves.toEqual({ redirectTo: "/account/setup" });
    } finally {
      await db.membership.deleteMany({ where: { userId: withoutName.userId } });
    }
  });
});

describe("senha", () => {
  it("ca_26 senha \"12345\" recusada pelo Auth mostra a mensagem do RN-39, sem definir a senha", async () => {
    const session = { userId: randomUUID(), email: "enzo.paiva@example.com" };

    await expect(
      caller(session, { auth: fakeAuth().auth }).account.setup({
        password: "12345",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: authMessages.weakPassword,
    });
    await expect(
      db.membership.count({ where: { userId: session.userId } }),
    ).resolves.toBe(0);
  });

  it("ca_33 senha igual à atual, recusada pelo Auth, mostra a mensagem do RN-55, sem salvar o nome", async () => {
    const session = { userId: randomUUID(), email: "enzo.paiva@example.com" };

    await expect(
      caller(session, { auth: fakeAuth().auth }).account.setup({
        password: CURRENT_PASSWORD,
        name: "Enzo Paiva",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: authMessages.samePassword,
    });
    await expect(db.profile.count({ where: { id: session.userId } })).resolves.toBe(0);
  });
});

describe("vínculo em mais de uma área", () => {
  it("ca_31 account.setup falha sem dizer o motivo e não grava vínculo novo", async () => {
    const areas = await createTwoAreas(db);

    try {
      await db.membership.create({
        data: { tenantId: areas.tenantB.id, userId: areas.inA.userId, role: "member" },
      });
      const session = { userId: areas.inA.userId, email: areas.inA.email };

      await expect(caller(session).account.setup({})).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: authMessages.setupFailed,
      });
      await expect(
        db.membership.count({ where: { userId: areas.inA.userId } }),
      ).resolves.toBe(2);
    } finally {
      await areas.cleanup();
    }
  });
});

describe("isolamento entre áreas", () => {
  let areas: Awaited<ReturnType<typeof createTwoAreas>>;
  let sessionA: { userId: string; email: string };

  beforeAll(async () => {
    areas = await createTwoAreas(db);
    sessionA = { userId: areas.inA.userId, email: areas.inA.email };
  });

  afterAll(async () => {
    await areas.cleanup();
  });

  it("ca_14 account.me devolve só o nome, o e-mail e o papel da própria sessão", async () => {
    await expect(
      caller(sessionA, { tenantId: areas.tenantA.id, role: "member" }).account.me(),
    ).resolves.toEqual({
      name: "Beatriz Fontes",
      email: "beatriz.fontes@example.com",
      role: "member",
    });
  });

  it("ca_14 account.setup de quem está na área A não altera vínculo, papel ou nome da área B", async () => {
    const before = await areas.snapshotB();

    await expect(
      caller(sessionA, { tenantId: areas.tenantA.id, role: "member" }).account.setup({
        name: "Beatriz F.",
      }),
    ).resolves.toEqual({ redirectTo: "/catalog" });

    await expect(areas.snapshotB()).resolves.toEqual(before);
    await expect(
      db.membership.findMany({
        where: { userId: areas.inA.userId },
        select: { tenantId: true, role: true },
      }),
    ).resolves.toEqual([{ tenantId: areas.tenantA.id, role: "member" }]);
  });

  it("ca_14 um tenantId no input de account.setup e de account.me é recusado na validação", async () => {
    const before = await areas.snapshotB();
    const setup = caller(sessionA).account.setup as (
      input: unknown,
    ) => Promise<unknown>;
    const me = caller(sessionA).account.me as (input: unknown) => Promise<unknown>;

    await expect(
      setup({ name: "Flávia Rocha", tenantId: areas.tenantB.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(me({ tenantId: areas.tenantB.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(areas.snapshotB()).resolves.toEqual(before);
  });
});
