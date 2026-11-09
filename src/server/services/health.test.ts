import { afterAll, describe, expect, inject, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
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

describe.each(["authenticated", "anon"])("health_checks como %s", (role) => {
  const setRole = `SET LOCAL ROLE ${role}`;

  it(`az_03 ${role} não lê a linha que o dono lê`, async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.healthCheck.create({ data: {} });
      expect(await tx.healthCheck.count()).toBeGreaterThan(0);

      await tx.$executeRawUnsafe(setRole);

      await expect(tx.healthCheck.count()).resolves.toBe(0);
    });
  });

  // Controle: prova que o zero acima vem da RLS, e não de outra coisa.
  it(`az_03 ${role} lê a linha quando a RLS está desligada`, async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.healthCheck.create({ data: {} });
      await tx.$executeRaw`ALTER TABLE "health_checks" DISABLE ROW LEVEL SECURITY`;

      await tx.$executeRawUnsafe(setRole);

      await expect(tx.healthCheck.count()).resolves.toBeGreaterThan(0);
    });
  });
});

// Com a RLS ligada, tirar a policy dá os mesmos zero acima: só o catálogo mostra.
it("az_03 a policy explícita nega tudo a anon e authenticated", async () => {
  await expect(
    db.$queryRaw`
      SELECT policyname, roles::text[], cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'health_checks'`,
  ).resolves.toEqual([
    {
      policyname: "health_checks_deny_all",
      roles: ["anon", "authenticated"],
      cmd: "ALL",
      qual: "false",
      with_check: "false",
    },
  ]);
});

// O Prisma cria esta tabela sozinho, fora do schema: não há modelo nem service.
describe.each(["authenticated", "anon"])(
  "_prisma_migrations como %s",
  (role) => {
    const setRole = `SET LOCAL ROLE ${role}`;

    async function countMigrations(tx: Prisma.TransactionClient) {
      const [{ total }] = await tx.$queryRaw<[{ total: bigint }]>`
        SELECT count(*) AS total FROM "_prisma_migrations"`;
      return Number(total);
    }

    it(`adr_001 ${role} não lê, não apaga nem atualiza o histórico de migrations`, async () => {
      await inRolledBackTransaction(async (tx) => {
        expect(await countMigrations(tx)).toBeGreaterThan(0);

        await tx.$executeRawUnsafe(setRole);

        await expect(countMigrations(tx)).resolves.toBe(0);
        await expect(
          tx.$executeRaw`DELETE FROM "_prisma_migrations"`,
        ).resolves.toBe(0);
        await expect(
          tx.$executeRaw`UPDATE "_prisma_migrations" SET "logs" = 'x'`,
        ).resolves.toBe(0);
      });
    });

    it(`adr_001 ${role} não registra migration falsa`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await tx.$executeRawUnsafe(setRole);

        await expect(
          tx.$executeRaw`INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name") VALUES ('x', 'x', 'x')`,
        ).rejects.toThrow(/row-level security/);
      });
    });

    // Controle: prova que o bloqueio acima vem da RLS, e não de outra coisa.
    it(`adr_001 ${role} lê o histórico quando a RLS está desligada`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await tx.$executeRaw`ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY`;

        await tx.$executeRawUnsafe(setRole);

        await expect(countMigrations(tx)).resolves.toBeGreaterThan(0);
      });
    });
  },
);

// A RLS sozinha já nega tudo: só o catálogo mostra se a policy explícita existe.
describe("_prisma_migrations no catálogo", () => {
  it("adr_001 a policy explícita nega tudo a anon e authenticated", async () => {
    const policies = await db.$queryRaw`
      SELECT policyname, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies WHERE tablename = '_prisma_migrations'`;

    expect(policies).toEqual([
      {
        policyname: "prisma_migrations_deny_all",
        roles: ["anon", "authenticated"],
        cmd: "ALL",
        qual: "false",
        with_check: "false",
      },
    ]);
  });
});

afterAll(async () => {
  await db.$disconnect();
});
