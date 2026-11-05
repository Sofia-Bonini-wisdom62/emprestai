import { afterAll, describe, expect, inject, it } from "vitest";

import { appRouter } from "@/server/api/root";
import { createCallerFactory } from "@/server/api/trpc";
import { createTestDb } from "../../../../tests/helpers/db";

const createCaller = createCallerFactory(appRouter);

describe("health.check", () => {
  const db = createTestDb(inject("databaseUrl"));
  const unreachableDb = createTestDb("postgresql://127.0.0.1:1/x");

  afterAll(async () => {
    await Promise.all([db.$disconnect(), unreachableDb.$disconnect()]);
  });

  it("az_04 responde ok com o banco de pé", async () => {
    await expect(createCaller({ db }).health.check()).resolves.toEqual({
      status: "ok",
    });
  });

  it("az_04 responde falha explícita com o banco fora do ar", async () => {
    const result = await createCaller({ db: unreachableDb }).health.check();

    expect(result).toEqual({
      status: "unavailable",
      message: "Banco de dados indisponível",
    });
    expect(JSON.stringify(result)).not.toContain("postgresql://");
  });
});
