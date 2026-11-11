import { afterAll, describe, expect, inject, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { createTestDb } from "../../../tests/helpers/db";
import { consumeAttempt, type RateLimitRules } from "./rate-limit";

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

const email = "beatriz.fontes@example.com";
const generous = { max: 1000, windowSeconds: 60 };
// Os valores do CA-22: três tentativas numa janela de 60 s.
const tight = { max: 3, windowSeconds: 60 };
const byEmail: RateLimitRules = { ip: generous, email: tight };
const byIp: RateLimitRules = { ip: tight, email: generous };

async function attempts(
  tx: Prisma.TransactionClient,
  list: { ip: string; email: string }[],
  rules: RateLimitRules,
) {
  const results: boolean[] = [];
  for (const attempt of list) {
    results.push((await consumeAttempt(tx, attempt, rules)).allowed);
  }
  return results;
}

describe("consumeAttempt", () => {
  it("ca_22 a quarta tentativa com o mesmo e-mail na janela é recusada", async () => {
    await inRolledBackTransaction(async (tx) => {
      // Um IP diferente a cada vez: quem recusa é o contador do e-mail.
      const list = [1, 2, 3, 4].map((n) => ({ ip: `203.0.113.${n}`, email }));

      await expect(attempts(tx, list, byEmail)).resolves.toEqual([
        true,
        true,
        true,
        false,
      ]);

      // A tabela guarda o hash, nunca o e-mail ou o IP.
      const rows = await tx.rateLimit.findMany();
      expect(rows).toHaveLength(5);
      for (const row of rows) {
        expect(row.key).toMatch(/^[0-9a-f]{64}$/);
      }
    });
  });

  it("ca_22 maiúsculas e espaços no e-mail contam no mesmo contador", async () => {
    await inRolledBackTransaction(async (tx) => {
      const variants = [
        email,
        "Beatriz.Fontes@Example.com",
        "  BEATRIZ.FONTES@EXAMPLE.COM ",
        email,
      ];
      const list = variants.map((value, n) => ({
        ip: `203.0.113.${n + 1}`,
        email: value,
      }));

      await expect(attempts(tx, list, byEmail)).resolves.toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });

  it("ca_22 a quarta tentativa do mesmo IP com e-mails diferentes é recusada", async () => {
    await inRolledBackTransaction(async (tx) => {
      const list = [1, 2, 3, 4].map((n) => ({
        ip: "198.51.100.7",
        email: `pessoa${n}@example.com`,
      }));

      await expect(attempts(tx, list, byIp)).resolves.toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });

  it("ca_22 depois que a janela vence, a tentativa volta a passar", async () => {
    await inRolledBackTransaction(async (tx) => {
      const list = [1, 2, 3, 4].map((n) => ({ ip: `203.0.113.${n}`, email }));
      await attempts(tx, list, byEmail);

      await tx.$executeRaw`
        UPDATE "rate_limits" SET "window_started_at" = now() - interval '61 seconds'`;

      await expect(
        consumeAttempt(tx, { ip: "203.0.113.5", email }, byEmail),
      ).resolves.toEqual({ allowed: true });
    });
  });
});

describe.each(["authenticated", "anon"])("rate_limits como %s", (role) => {
  const setRole = `SET LOCAL ROLE ${role}`;

  async function insertAsOwner(tx: Prisma.TransactionClient) {
    await tx.rateLimit.create({
      data: { key: "0".repeat(64), count: 1, windowStartedAt: new Date() },
    });
    expect(await tx.rateLimit.count()).toBeGreaterThan(0);
  }

  it(`ca_14 ${role} não lê a linha de rate_limits que o dono lê`, async () => {
    await inRolledBackTransaction(async (tx) => {
      await insertAsOwner(tx);

      await tx.$executeRawUnsafe(setRole);

      await expect(tx.rateLimit.count()).resolves.toBe(0);
    });
  });

  // Controle: prova que o zero acima vem da RLS, e não de outra coisa.
  it(`ca_14 ${role} lê a linha de rate_limits quando a RLS está desligada`, async () => {
    await inRolledBackTransaction(async (tx) => {
      await insertAsOwner(tx);
      await tx.$executeRawUnsafe(
        `ALTER TABLE "rate_limits" DISABLE ROW LEVEL SECURITY`,
      );

      await tx.$executeRawUnsafe(setRole);

      await expect(tx.rateLimit.count()).resolves.toBeGreaterThan(0);
    });
  });
});

// A RLS sozinha já nega tudo: só o catálogo mostra se a policy explícita existe.
it("ca_14 a policy explícita de rate_limits nega tudo a anon e authenticated", async () => {
  await expect(
    db.$queryRaw`
      SELECT policyname, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'rate_limits'`,
  ).resolves.toEqual([
    {
      policyname: "rate_limits_deny_all",
      roles: ["anon", "authenticated"],
      cmd: "ALL",
      qual: "false",
      with_check: "false",
    },
  ]);
});

afterAll(async () => {
  await db.$disconnect();
});
