// Lê pelo Prisma as linhas que o seed deixa na pilha do E2E e as escreve em JSON no stdout. Roda no
// Node, com o hook do seed, e não no Playwright, que carrega os casos como CommonJS e não importa o
// client gerado, que é ESM.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

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
  };
  process.stdout.write(JSON.stringify(rows));
} finally {
  await db.$disconnect();
}
