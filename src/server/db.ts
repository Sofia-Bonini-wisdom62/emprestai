import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { serverEnv } from "@/env/server";
import { PrismaClient } from "@/generated/prisma/client";

// Sem limite, um banco que aceita a conexão e não responde deixa a consulta
// pendente até a function cair, e a falha explícita do AZ-04 não chega à tela.
const CONNECTION_TIMEOUT_MS = 2_000;

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });

  return new PrismaClient({ adapter });
}

// Singleton: sem ele, cada hot reload do Next abre um cliente novo.
const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ?? createPrismaClient(serverEnv.DATABASE_URL);

globalForPrisma.prisma = db;
