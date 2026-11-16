// Lê pelo Prisma as linhas que o seed deixa na pilha do E2E e as escreve em JSON no stdout. Roda no
// Node, com o hook do seed, e não no Playwright, que carrega os casos como CommonJS e não importa o
// client gerado, que é ESM.
import { PrismaPg } from "@prisma/adapter-pg";

import { DEFAULT_TENANT } from "../../prisma/default-tenant";
import { CATEGORY_NAMES } from "../../prisma/equipment-data";
import { PrismaClient } from "../../src/generated/prisma/client";

// As cinco categorias dos dados iniciais (spec 003, RN-05). Os outros casos do E2E gravam os seus
// equipamentos na mesma área, em categorias com outro nome, que ficam de fora daqui.
const seeded = { tenant: { slug: DEFAULT_TENANT.slug }, name: { in: [...CATEGORY_NAMES] } };

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Falta E2E_DATABASE_URL");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }) });

try {
  const rows = {
    tenants: await db.tenant.findMany({ select: { slug: true } }),
    users: await db.$queryRaw<{ id: string; email: string }[]>`
      SELECT id::text AS id, email FROM auth.users`,
    profiles: await db.profile.findMany({ select: { id: true, name: true } }),
    memberships: await db.membership.findMany({
      select: { userId: true, role: true, tenant: { select: { slug: true } } },
    }),
    categories: await db.equipmentCategory.findMany({
      where: seeded,
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    }),
    equipments: await db.equipment.findMany({
      where: { category: seeded },
      orderBy: { assetTag: "asc" },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: true,
        imageObject: true,
        category: { select: { name: true } },
      },
    }),
  };
  process.stdout.write(JSON.stringify(rows));
} finally {
  await db.$disconnect();
}
