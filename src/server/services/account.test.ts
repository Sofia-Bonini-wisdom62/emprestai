import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import {
  destinationOf,
  setupFields,
  enterAccount,
  FIRST_ENTRY_TENANT_SLUG,
} from "@/server/services/account";
import { createFirstEntryTenant } from "../../../tests/helpers/accounts";
import { createTestDb } from "../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const rollback = new Error("desfaz a transação do teste");

// Nada deste arquivo fica no banco: toda transação termina em rollback.
async function inRolledBackTransaction(
  run: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  await db
    .$transaction(async (tx) => {
      await run(tx);
      throw rollback;
    })
    .catch((error: unknown) => {
      if (error !== rollback) throw error;
    });
}

async function createTenant(tx: Prisma.TransactionClient) {
  return tx.tenant.create({ data: { slug: "ca-14", name: "Área de teste" } });
}

// As tabelas da conta (spec 001). Cada uma grava uma linha como dono e conta as linhas.
const tables = [
  {
    name: "tenants",
    insert: async (tx: Prisma.TransactionClient) => {
      await createTenant(tx);
    },
    count: (tx: Prisma.TransactionClient) => tx.tenant.count(),
  },
  {
    name: "memberships",
    insert: async (tx: Prisma.TransactionClient) => {
      const tenant = await createTenant(tx);
      await tx.membership.create({
        data: { tenantId: tenant.id, userId: randomUUID(), role: "member" },
      });
    },
    count: (tx: Prisma.TransactionClient) => tx.membership.count(),
  },
  {
    name: "profiles",
    insert: async (tx: Prisma.TransactionClient) => {
      await tx.profile.create({
        data: { id: randomUUID(), name: "Beatriz Fontes" },
      });
    },
    count: (tx: Prisma.TransactionClient) => tx.profile.count(),
  },
];

describe.each(tables)("$name", (table) => {
  describe.each(["authenticated", "anon"])("como %s", (role) => {
    const setRole = `SET LOCAL ROLE ${role}`;

    it(`ca_14 ${role} não lê a linha de ${table.name} que o dono lê`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await table.insert(tx);
        expect(await table.count(tx)).toBeGreaterThan(0);

        await tx.$executeRawUnsafe(setRole);

        await expect(table.count(tx)).resolves.toBe(0);
      });
    });

    // Controle: prova que o zero acima vem da RLS, e não de outra coisa.
    it(`ca_14 ${role} lê a linha de ${table.name} quando a RLS está desligada`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await table.insert(tx);
        await tx.$executeRawUnsafe(
          `ALTER TABLE "${table.name}" DISABLE ROW LEVEL SECURITY`,
        );

        await tx.$executeRawUnsafe(setRole);

        await expect(table.count(tx)).resolves.toBeGreaterThan(0);
      });
    });
  });
});

// A RLS sozinha já nega tudo: só o catálogo mostra se as policies explícitas existem.
it("ca_14 as policies explícitas negam tudo a anon e authenticated", async () => {
  await expect(
    db.$queryRaw`
      SELECT tablename, policyname, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('tenants', 'memberships', 'profiles')
      ORDER BY tablename`,
  ).resolves.toEqual(
    ["memberships", "profiles", "tenants"].map((name) => ({
      tablename: name,
      policyname: `${name}_deny_all`,
      roles: ["anon", "authenticated"],
      cmd: "ALL",
      qual: "false",
      with_check: "false",
    })),
  );
});

describe("enterAccount", () => {
  let firstEntry: Awaited<ReturnType<typeof createFirstEntryTenant>>;

  beforeAll(async () => {
    firstEntry = await createFirstEntryTenant(db);
  });

  afterAll(async () => {
    await firstEntry.cleanup();
  });

  it("ca_05 a área da primeira entrada é a default", () => {
    expect(FIRST_ENTRY_TENANT_SLUG).toBe("default");
  });

  // A regra é explícita, e não um destino implícito: quem já tem vínculo em
  // outra área não ganha o da primeira entrada (RN-13; ADR-005, seção 4).
  it("ca_05 quem já tem vínculo em outra área não ganha o da default", async () => {
    const userId = randomUUID();
    const other = await db.tenant.create({
      data: { slug: `outra-${randomUUID()}`, name: "Outra área" },
    });

    try {
      await db.membership.create({
        data: { tenantId: other.id, userId, role: "operations" },
      });
      await enterAccount(db, userId, firstEntry.slug);

      await expect(
        db.membership.findMany({
          where: { userId },
          select: { tenantId: true, role: true },
        }),
      ).resolves.toEqual([{ tenantId: other.id, role: "operations" }]);
    } finally {
      await db.membership.deleteMany({ where: { userId } });
      await db.tenant.delete({ where: { id: other.id } });
    }
  });

  it("ca_05 duas primeiras entradas ao mesmo tempo gravam um vínculo só", async () => {
    const userId = randomUUID();
    const { tenant } = firstEntry;

    await Promise.all([
      enterAccount(db, userId, firstEntry.slug),
      enterAccount(db, userId, firstEntry.slug),
    ]);

    await expect(
      db.membership.findMany({
        where: { userId },
        select: { tenantId: true, role: true },
      }),
    ).resolves.toEqual([{ tenantId: tenant.id, role: "member" }]);
  });
});

afterAll(async () => {
  await db.$disconnect();
});

// A regra do destino, a mesma do auth.signIn e do /login com sessão (RN-22, RN-23).
describe("destinationOf", () => {
  it("ca_19 member com nome vai para /catalog", () => {
    expect(destinationOf({ name: "Beatriz Fontes", role: "member" })).toBe("/catalog");
  });

  it("ca_02 operations com nome vai para /operations/loans", () => {
    expect(destinationOf({ name: "Flávia Rocha", role: "operations" })).toBe(
      "/operations/loans",
    );
  });

  it("ca_06 sem nome vai antes para /account/setup", () => {
    expect(destinationOf({ name: null, role: "member" })).toBe("/account/setup");
  });

  it("ca_31 sem papel, como no vínculo em mais de uma área (RN-46, RN-52), não há destino", () => {
    expect(destinationOf({ name: "Beatriz Fontes", role: null })).toBeNull();
  });

  it("ca_07 a sessão do convite que ainda não passou por /account/setup, sem nome e sem vínculo, vai para lá", () => {
    expect(destinationOf({ name: null, role: null })).toBe("/account/setup");
  });
});

// O que /account/setup pede em cada entrada (RN-21; docs/layout.md, tela 7).
describe("setupFields", () => {
  it("ca_07 pelo link do convite, sem nome, pede a senha e o nome", () => {
    expect(setupFields({ name: null }, true)).toEqual({ password: true, name: true });
  });

  it("ca_20 pelo link da redefinição, com nome, pede só a senha", () => {
    expect(setupFields({ name: "Beatriz Fontes" }, true)).toEqual({
      password: true,
      name: false,
    });
  });

  it("ca_06 entrando com senha e sem nome, pede só o nome", () => {
    expect(setupFields({ name: null }, false)).toEqual({ password: false, name: true });
  });

  it("ca_06 entrando com senha e com nome, não pede nada", () => {
    expect(setupFields({ name: "Beatriz Fontes" }, false)).toEqual({
      password: false,
      name: false,
    });
  });
});
