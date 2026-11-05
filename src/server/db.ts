import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { serverEnv } from "@/env/server";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: serverEnv.DATABASE_URL,
    max: 1,
  });

  return new PrismaClient({ adapter });
}

// Singleton: sem ele, cada hot reload do Next abre um cliente novo.
const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;
