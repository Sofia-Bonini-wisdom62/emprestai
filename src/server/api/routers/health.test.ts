import { type AddressInfo, createServer, type Socket } from "node:net";

import { afterAll, describe, expect, inject, it } from "vitest";

import { appRouter } from "@/server/api/root";
import { createCallerFactory } from "@/server/api/trpc";
import { createPrismaClient } from "@/server/db";
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

  // Usa o cliente de produção: sem o limite de conexão de src/server/db.ts, a
  // chamada não termina e o caso cai no tempo padrão do Vitest, de 5 s.
  it("az_04 responde falha explícita com banco que aceita a conexão e não responde", async () => {
    const sockets: Socket[] = [];
    const silentServer = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) =>
      silentServer.listen(0, "127.0.0.1", resolve),
    );
    const { port } = silentServer.address() as AddressInfo;
    const silentDb = createPrismaClient(`postgresql://127.0.0.1:${port}/x`);

    try {
      await expect(
        createCaller({ db: silentDb }).health.check(),
      ).resolves.toEqual({
        status: "unavailable",
        message: "Banco de dados indisponível",
      });
    } finally {
      await silentDb.$disconnect();
      sockets.forEach((socket) => socket.destroy());
      silentServer.close();
    }
  });
});
