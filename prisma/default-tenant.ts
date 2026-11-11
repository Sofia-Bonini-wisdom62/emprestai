import type { PrismaClient } from "../src/generated/prisma/client";

// A área única da v1 (ADR-005; RN-12), a mesma no seed do dev e no passo de produção (ADR-009).
export const DEFAULT_TENANT = { slug: "default", name: "default" } as const;

export function upsertDefaultTenant(db: PrismaClient) {
  return db.tenant.upsert({
    where: { slug: DEFAULT_TENANT.slug },
    update: {},
    create: DEFAULT_TENANT,
  });
}
