import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

export function createTestDb(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 1 }),
  });
}
