import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
} from "vitest";

import { authMessages } from "@/lib/auth-messages";
import { appRouter } from "@/server/api/root";
import {
  type Context,
  createCallerFactory,
  envRateLimitRules,
} from "@/server/api/trpc";
import type { AuthPort, PasswordResetPort } from "@/server/services/auth";
import {
  rateLimitRulesFrom,
  type RateLimitRules,
} from "@/server/services/rate-limit";
import {
  createFirstEntryTenant,
  createTwoAreas,
  fakeAuth,
  generousRules,
} from "../../../../tests/helpers/accounts";
import { createTestDb } from "../../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const createCaller = createCallerFactory(appRouter);

// Os contadores deste arquivo usam e-mails e IPs que o teste do service
// (rate-limit.test.ts) não usa: os dois arquivos rodam ao mesmo tempo no mesmo
// banco, e lá a conta de Beatriz é contada dentro de uma transação.
const denise = "denise.araujo@example.com";

let firstEntry: Awaited<ReturnType<typeof createFirstEntryTenant>>;

function caller(
  auth: (AuthPort & PasswordResetPort) | null,
  ip: string,
  rateLimitRules: RateLimitRules = generousRules,
  session: Context["session"] = null,
  database: Context["db"] = db,
) {
  return createCaller({
    db: database,
    auth,
    passwordReset: auth,
    ip,
    rateLimitRules,
    session,
    firstEntryTenantSlug: firstEntry.slug,
  });
}

const tooManyAttempts = {
  code: "TOO_MANY_REQUESTS",
  message: authMessages.tooManyAttempts,
};
const invalidCredentials = {
  code: "UNAUTHORIZED",
  message: authMessages.invalidCredentials,
};

beforeAll(async () => {
  firstEntry = await createFirstEntryTenant(db);
});

beforeEach(async () => {
  // Só este arquivo grava contador fora de transação.
  await db.rateLimit.deleteMany();
});

afterAll(async () => {
  await db.rateLimit.deleteMany();
  await firstEntry.cleanup();
  await db.$disconnect();
});

describe("limite de tentativas", () => {
  // Os valores do CA-22: três tentativas numa janela de 60 s.
  const byEmail = rateLimitRulesFrom({
    RATE_LIMIT_USER_MAX: 3,
    RATE_LIMIT_USER_WINDOW_SECONDS: 60,
    RATE_LIMIT_IP_MAX: 1000,
    RATE_LIMIT_IP_WINDOW_SECONDS: 60,
  });
  const byIp = rateLimitRulesFrom({
    RATE_LIMIT_USER_MAX: 1000,
    RATE_LIMIT_USER_WINDOW_SECONDS: 60,
    RATE_LIMIT_IP_MAX: 3,
    RATE_LIMIT_IP_WINDOW_SECONDS: 60,
  });

  it("ca_22 a quarta tentativa de entrar com o mesmo e-mail falha com a mensagem do RN-26, sem consultar o Auth", async () => {
    const { auth, calls } = fakeAuth();

    for (const n of [1, 2, 3]) {
      await expect(
        caller(auth, `192.0.2.${n}`, byEmail).auth.signIn({
          email: denise,
          password: "errada",
        }),
      ).rejects.toMatchObject(invalidCredentials);
    }
    await expect(
      caller(auth, "192.0.2.4", byEmail).auth.signIn({
        email: denise,
        password: "errada",
      }),
    ).rejects.toMatchObject(tooManyAttempts);

    expect(calls.signIn).toHaveLength(3);
  });

  it("ca_22 a quarta tentativa do mesmo IP com e-mails diferentes falha com a mesma mensagem", async () => {
    const { auth, calls } = fakeAuth();
    const emails = [1, 2, 3, 4].map((n) => `pessoa${n}@example.com`);

    for (const email of emails.slice(0, 3)) {
      await expect(
        caller(auth, "192.0.2.10", byIp).auth.signIn({
          email,
          password: "errada",
        }),
      ).rejects.toMatchObject(invalidCredentials);
    }
    await expect(
      caller(auth, "192.0.2.10", byIp).auth.signIn({
        email: emails[3],
        password: "errada",
      }),
    ).rejects.toMatchObject(tooManyAttempts);

    expect(calls.signIn).toHaveLength(3);
  });

  it("ca_22 duas tentativas de entrar e um pedido de redefinição com o mesmo e-mail esgotam o limite", async () => {
    const { auth, calls } = fakeAuth();

    for (const n of [1, 2]) {
      await expect(
        caller(auth, `192.0.2.${20 + n}`, byEmail).auth.signIn({
          email: denise,
          password: "errada",
        }),
      ).rejects.toMatchObject(invalidCredentials);
    }
    await expect(
      caller(auth, "192.0.2.23", byEmail).auth.requestPasswordReset({
        email: denise,
      }),
    ).resolves.toEqual({ message: authMessages.resetRequested });

    await expect(
      caller(auth, "192.0.2.24", byEmail).auth.signIn({
        email: denise,
        password: "errada",
      }),
    ).rejects.toMatchObject(tooManyAttempts);
    await expect(
      caller(auth, "192.0.2.25", byEmail).auth.requestPasswordReset({
        email: denise,
      }),
    ).rejects.toMatchObject(tooManyAttempts);

    expect(calls.signIn).toHaveLength(2);
    expect(calls.reset).toHaveLength(1);
  });

  it("ca_22 maiúsculas e espaços no e-mail contam no mesmo contador, e o Auth recebe o e-mail que o contador contou", async () => {
    const { auth, calls } = fakeAuth();
    const variants = [denise, " Denise.Araujo@Example.com", "DENISE.ARAUJO@EXAMPLE.COM "];

    for (const [n, email] of variants.entries()) {
      await expect(
        caller(auth, `192.0.2.${30 + n}`, byEmail).auth.signIn({
          email,
          password: "errada",
        }),
      ).rejects.toMatchObject(invalidCredentials);
    }
    expect(calls.signIn).toEqual([denise, denise, denise]);
    await expect(
      caller(auth, "192.0.2.39", byEmail).auth.signIn({
        email: denise,
        password: "errada",
      }),
    ).rejects.toMatchObject(tooManyAttempts);
  });

  it("ca_22 sem as variáveis, valem 5 tentativas por e-mail em 15 min e 30 por IP em 60 s", () => {
    expect(envRateLimitRules).toEqual({
      ip: { max: 30, windowSeconds: 60 },
      email: { max: 5, windowSeconds: 900 },
    });
  });
});

describe("auth.signIn", () => {
  it("ca_05 a primeira entrada de uma conta sem vínculo cria o vínculo member na default; a segunda não cria outro", async () => {
    const userId = randomUUID();
    const enzo = "enzo.paiva@example.com";
    const { auth } = fakeAuth({ [enzo]: userId });
    const { tenant } = firstEntry;

    try {
      // Sem nome, o destino é /account/setup (CA-06).
      for (const ip of ["192.0.2.40", "192.0.2.41"]) {
        await expect(
          caller(auth, ip).auth.signIn({ email: enzo, password: "certa" }),
        ).resolves.toEqual({ redirectTo: "/account/setup" });
      }

      await expect(
        db.membership.findMany({
          where: { userId },
          select: { tenantId: true, role: true },
        }),
      ).resolves.toEqual([{ tenantId: tenant.id, role: "member" }]);
    } finally {
      await db.membership.deleteMany({ where: { userId } });
    }
  });

  it("ca_06 com nome salvo, Colaborador entra em /catalog e Operações em /operations/loans", async () => {
    const areas = await createTwoAreas(db);
    const { auth } = fakeAuth({
      [areas.inA.email]: areas.inA.userId,
      [areas.inB.email]: areas.inB.userId,
    });

    try {
      await expect(
        caller(auth, "192.0.2.42").auth.signIn({
          email: areas.inA.email,
          password: "certa",
        }),
      ).resolves.toEqual({ redirectTo: "/catalog" });
      await expect(
        caller(auth, "192.0.2.43").auth.signIn({
          email: areas.inB.email,
          password: "certa",
        }),
      ).resolves.toEqual({ redirectTo: "/operations/loans" });
    } finally {
      await areas.cleanup();
    }
  });

  it("ca_23 sem Auth, como no Preview, entrar falha com a mensagem genérica do RN-25", async () => {
    await expect(
      caller(null, "192.0.2.44").auth.signIn({ email: denise, password: "x" }),
    ).rejects.toMatchObject(invalidCredentials);
  });

  it("ca_31 com vínculo em duas áreas, entrar falha com a mensagem genérica, e a sessão aberta pelo Auth sai", async () => {
    const areas = await createTwoAreas(db);
    const { auth, calls } = fakeAuth({ [areas.inA.email]: areas.inA.userId });

    try {
      await db.membership.create({
        data: { tenantId: areas.tenantB.id, userId: areas.inA.userId, role: "member" },
      });

      await expect(
        caller(auth, "192.0.2.45").auth.signIn({
          email: areas.inA.email,
          password: "certa",
        }),
      ).rejects.toMatchObject(invalidCredentials);
      expect(calls.signIn).toEqual([areas.inA.email]);
      expect(calls.signOut).toEqual(["local"]);
    } finally {
      await areas.cleanup();
    }
  });

  it("ca_31 com o contador fora do ar, entrar falha com a mensagem genérica, sem consultar o Auth", async () => {
    const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");
    const { auth, calls } = fakeAuth({ [denise]: randomUUID() });

    try {
      await expect(
        caller(auth, "192.0.2.46", generousRules, null, unreachableDb).auth.signIn({
          email: denise,
          password: "certa",
        }),
      ).rejects.toMatchObject(invalidCredentials);
      expect(calls.signIn).toEqual([]);
    } finally {
      await unreachableDb.$disconnect();
    }
  });
});

describe("isolamento entre áreas", () => {
  let areas: Awaited<ReturnType<typeof createTwoAreas>>;

  beforeAll(async () => {
    areas = await createTwoAreas(db);
  });

  afterAll(async () => {
    await areas.cleanup();
  });

  it("ca_14 auth.signIn de quem está na área A não lê nem altera vínculo, papel ou nome da área B", async () => {
    const { auth } = fakeAuth({ [areas.inA.email]: areas.inA.userId });
    const before = await areas.snapshotB();

    await expect(
      caller(auth, "192.0.2.50").auth.signIn({
        email: areas.inA.email,
        password: "certa",
      }),
    ).resolves.toEqual({ redirectTo: "/catalog" });

    await expect(areas.snapshotB()).resolves.toEqual(before);
    await expect(
      db.membership.count({ where: { userId: areas.inA.userId } }),
    ).resolves.toBe(1);
  });

  it("ca_14 auth.signOut de quem está na área A não altera nada da área B", async () => {
    const { auth, calls } = fakeAuth();
    const before = await areas.snapshotB();
    const session = { userId: areas.inA.userId, email: areas.inA.email };

    await expect(
      caller(auth, "192.0.2.51", generousRules, session).auth.signOut(),
    ).resolves.toEqual({ redirectTo: "/login" });

    expect(calls.signOut).toEqual(["local"]);
    await expect(areas.snapshotB()).resolves.toEqual(before);
  });

  it("ca_14 auth.requestPasswordReset de quem está na área A não altera nada da área B", async () => {
    const { auth } = fakeAuth({ [areas.inA.email]: areas.inA.userId });
    const before = await areas.snapshotB();

    await expect(
      caller(auth, "192.0.2.52").auth.requestPasswordReset({
        email: areas.inA.email,
      }),
    ).resolves.toEqual({ message: authMessages.resetRequested });

    await expect(areas.snapshotB()).resolves.toEqual(before);
  });

  it("ca_14 um tenantId no input é recusado na validação, sem chegar ao Auth", async () => {
    const { auth, calls } = fakeAuth({ [areas.inA.email]: areas.inA.userId });
    const session = { userId: areas.inA.userId, email: areas.inA.email };
    const tenantId = areas.tenantB.id;
    const signIn = caller(auth, "192.0.2.53").auth.signIn as (
      input: unknown,
    ) => Promise<unknown>;
    const reset = caller(auth, "192.0.2.53").auth.requestPasswordReset as (
      input: unknown,
    ) => Promise<unknown>;
    const signOut = caller(auth, "192.0.2.53", generousRules, session).auth
      .signOut as (input: unknown) => Promise<unknown>;

    for (const call of [
      signIn({ email: areas.inA.email, password: "certa", tenantId }),
      reset({ email: areas.inA.email, tenantId }),
      signOut({ tenantId }),
    ]) {
      await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(calls).toEqual({ signIn: [], signOut: [], reset: [], updateUser: [] });
  });
});

describe("auth.signOut", () => {
  // Com o Auth fora do ar, o getUser() do contexto falha e a chamada chega sem
  // sessão. O Sair apaga o cookie deste navegador mesmo assim (RN-53, RN-54).
  it("ca_32 sem sessão conferida, sair apaga a sessão só deste navegador e leva a /login", async () => {
    const { auth, calls } = fakeAuth();

    await expect(caller(auth, "192.0.2.60").auth.signOut()).resolves.toEqual({
      redirectTo: "/login",
    });
    expect(calls.signOut).toEqual(["local"]);
  });
});

describe("auth.requestPasswordReset", () => {
  it("ca_28 e-mail com e sem conta recebem a mesma resposta", async () => {
    const { auth, calls } = fakeAuth({ [denise]: randomUUID() });

    const withAccount = await caller(auth, "192.0.2.70").auth.requestPasswordReset({
      email: denise,
    });
    const withoutAccount = await caller(
      auth,
      "192.0.2.71",
    ).auth.requestPasswordReset({ email: "ninguem@example.com" });

    expect(withAccount).toEqual({ message: authMessages.resetRequested });
    expect(withoutAccount).toEqual(withAccount);
    // O pedido chega ao Auth nos dois casos, com o link de volta a /auth/confirm.
    expect(calls.reset).toEqual([
      { email: denise, redirectTo: "http://localhost:3000/auth/confirm" },
      {
        email: "ninguem@example.com",
        redirectTo: "http://localhost:3000/auth/confirm",
      },
    ]);
  });

  it("ca_28 sem Auth, como no Preview, a resposta é a mesma", async () => {
    await expect(
      caller(null, "192.0.2.72").auth.requestPasswordReset({
        email: "ninguem@example.com",
      }),
    ).resolves.toEqual({ message: authMessages.resetRequested });
  });
});
