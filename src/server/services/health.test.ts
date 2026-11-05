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

afterAll(async () => {
  await db.$disconnect();
});
