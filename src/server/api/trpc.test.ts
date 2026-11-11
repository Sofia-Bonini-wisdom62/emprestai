import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
  vi,
} from "vitest";
import { z } from "zod";

import { appRouter } from "@/server/api/root";
import {
  adminProcedure,
  type Context,
  createCallerFactory,
  createContextForUser,
  createTRPCRouter,
  protectedProcedure,
  tenantProcedure,
} from "@/server/api/trpc";
import { createTestDb } from "../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");

// O service de mentira só registra a chamada; o Prisma continua real.
const service = vi.fn(async (tenantId: string) => ({ tenantId }));

// Procedimentos só deste teste: na spec 001, nenhum procedimento de verdade usa
// o adminProcedure (CA-10).
const testRouter = createTRPCRouter({
  signedIn: protectedProcedure
    .input(z.void())
    .query(({ ctx }) => ctx.session.userId),
  tenantOnly: tenantProcedure
    .input(z.void())
    .query(({ ctx }) => service(ctx.tenantId)),
  adminOnly: adminProcedure
    .input(z.void())
    .query(({ ctx }) => service(ctx.tenantId)),
});
const createCaller = createCallerFactory(testRouter);

const session = { userId: randomUUID(), email: "beatriz.fontes@example.com" };
const anyTenantId = randomUUID();

beforeEach(() => {
  service.mockClear();
});

afterAll(async () => {
  await Promise.all([db.$disconnect(), unreachableDb.$disconnect()]);
});

describe("adminProcedure", () => {
  it("ca_10 com sessão member, falha com FORBIDDEN antes de chamar o service", async () => {
    const ctx: Context = { db, session, tenantId: anyTenantId, role: "member" };

    await expect(createCaller(ctx).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(service).not.toHaveBeenCalled();
  });

  // Controle: prova que o FORBIDDEN acima vem do papel, e não de outra coisa.
  it("ca_10 com sessão operations, chama o service com a área da sessão", async () => {
    const ctx: Context = {
      db,
      session,
      tenantId: anyTenantId,
      role: "operations",
    };

    await expect(createCaller(ctx).adminOnly()).resolves.toEqual({
      tenantId: anyTenantId,
    });
    expect(service).toHaveBeenCalledTimes(1);
  });

  it("ca_10 sem sessão, falha com UNAUTHORIZED antes de chamar o service", async () => {
    await expect(createCaller({ db }).adminOnly()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("ca_10 com sessão e sem vínculo, falha com FORBIDDEN antes de chamar o service", async () => {
    const ctx: Context = { db, session, tenantId: null, role: null };

    await expect(createCaller(ctx).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(createCaller(ctx).tenantOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(createCaller(ctx).signedIn()).resolves.toBe(session.userId);
    expect(service).not.toHaveBeenCalled();
  });
});

describe("createContextForUser", () => {
  const tenantIds: string[] = [];
  const memberInA = { id: randomUUID(), email: "beatriz.fontes@example.com" };
  const operationsInB = { id: randomUUID(), email: "flavia.rocha@example.com" };
  let tenantA: { id: string };
  let tenantB: { id: string };

  async function createTenant(label: string) {
    const tenant = await db.tenant.create({
      data: { slug: `ctx-${label}-${randomUUID()}`, name: `Área ${label}` },
    });
    tenantIds.push(tenant.id);
    return tenant;
  }

  beforeAll(async () => {
    tenantA = await createTenant("a");
    tenantB = await createTenant("b");
    await db.membership.createMany({
      data: [
        { tenantId: tenantA.id, userId: memberInA.id, role: "member" },
        { tenantId: tenantB.id, userId: operationsInB.id, role: "operations" },
      ],
    });
  });

  afterAll(async () => {
    await db.membership.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  });

  it("ca_14 o tenantProcedure entrega ao service a área do vínculo da sessão", async () => {
    const ctx = await createContextForUser(db, memberInA);

    expect(ctx).toMatchObject({ tenantId: tenantA.id, role: "member" });
    await expect(createCaller(ctx).tenantOnly()).resolves.toEqual({
      tenantId: tenantA.id,
    });
    expect(service).toHaveBeenCalledWith(tenantA.id);
  });

  it("ca_14 Operações da área B é administrador só na área B", async () => {
    const operations = await createContextForUser(db, operationsInB);
    const member = await createContextForUser(db, memberInA);

    await expect(createCaller(operations).adminOnly()).resolves.toEqual({
      tenantId: tenantB.id,
    });
    await expect(createCaller(member).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).not.toHaveBeenCalledWith(tenantA.id);
  });

  it("ca_10 sem usuário do Auth, o contexto não tem sessão e o adminProcedure falha com UNAUTHORIZED", async () => {
    const ctx = await createContextForUser(db, null);

    expect(ctx).toEqual({ db, session: null, tenantId: null, role: null });
    await expect(createCaller(ctx).adminOnly()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("az_04 com sessão e banco fora do ar, o health.check responde falha explícita e a sessão fica sem área", async () => {
    const ctx = await createContextForUser(unreachableDb, memberInA);

    expect(ctx).toMatchObject({ tenantId: null, role: null });
    await expect(
      createCallerFactory(appRouter)(ctx).health.check(),
    ).resolves.toEqual({
      status: "unavailable",
      message: "Banco de dados indisponível",
    });
    await expect(createCaller(ctx).tenantOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
