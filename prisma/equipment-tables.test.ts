// RLS e isolamento das tabelas de equipamento (spec 003, T-01; CA-10, a parte da RLS). O carregamento
// e o resto do isolamento são da T-02.
import { afterAll, describe, expect, inject, it } from "vitest";

import type { Prisma } from "../src/generated/prisma/client";
import { createTestDb } from "../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const rollback = new Error("desfaz a transação do teste");

afterAll(async () => {
  await db.$disconnect();
});

// Nada deste arquivo fica no banco: toda transação termina em rollback.
async function inRolledBackTransaction(run: (tx: Prisma.TransactionClient) => Promise<void>) {
  await db
    .$transaction(async (tx) => {
      await run(tx);
      throw rollback;
    })
    .catch((error: unknown) => {
      if (error !== rollback) throw error;
    });
}

async function createTenant(tx: Prisma.TransactionClient, slug: string) {
  return tx.tenant.create({ data: { slug, name: `Área ${slug}` } });
}

async function createCategory(tx: Prisma.TransactionClient, tenantId: string) {
  return tx.equipmentCategory.create({ data: { tenantId, name: "Notebooks" } });
}

const tables = [
  {
    name: "equipment_categories",
    insert: async (tx: Prisma.TransactionClient) => {
      const tenant = await createTenant(tx, "ca-10-a");
      await createCategory(tx, tenant.id);
    },
    count: (tx: Prisma.TransactionClient) => tx.equipmentCategory.count(),
  },
  {
    name: "equipments",
    insert: async (tx: Prisma.TransactionClient) => {
      const tenant = await createTenant(tx, "ca-10-a");
      const category = await createCategory(tx, tenant.id);
      await tx.equipment.create({
        data: {
          tenantId: tenant.id,
          assetTag: "TI-0001",
          name: "Notebook 14 polegadas",
          categoryId: category.id,
          status: "available",
          imageObject: "TI-0001-111.jpg",
        },
      });
    },
    count: (tx: Prisma.TransactionClient) => tx.equipment.count(),
  },
];

describe.each(tables)("$name", (table) => {
  describe.each(["authenticated", "anon"])("como %s", (role) => {
    const setRole = `SET LOCAL ROLE ${role}`;

    it(`ca_10 ${role} não lê a linha de ${table.name} que o dono lê`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await table.insert(tx);
        expect(await table.count(tx)).toBeGreaterThan(0);

        await tx.$executeRawUnsafe(setRole);

        await expect(table.count(tx)).resolves.toBe(0);
      });
    });

    // Controle: prova que o zero acima vem da RLS, e não de outra coisa.
    it(`ca_10 ${role} lê a linha de ${table.name} quando a RLS está desligada`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await table.insert(tx);
        await tx.$executeRawUnsafe(`ALTER TABLE "${table.name}" DISABLE ROW LEVEL SECURITY`);

        await tx.$executeRawUnsafe(setRole);

        await expect(table.count(tx)).resolves.toBeGreaterThan(0);
      });
    });
  });
});

// A RLS sozinha já nega tudo: só o catálogo mostra se as policies explícitas existem.
it("ca_10 as policies explícitas negam tudo a anon e authenticated", async () => {
  await expect(
    db.$queryRaw`
      SELECT tablename, policyname, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('equipment_categories', 'equipments')
      ORDER BY tablename`,
  ).resolves.toEqual(
    ["equipment_categories", "equipments"].map((name) => ({
      tablename: name,
      policyname: `${name}_deny_all`,
      roles: ["anon", "authenticated"],
      cmd: "ALL",
      qual: "false",
      with_check: "false",
    })),
  );
});

// A FK composta: o banco recusa ligar um equipamento a uma categoria de outra área.
it("ca_10 um equipamento da área A não aceita categoria da área B", async () => {
  await inRolledBackTransaction(async (tx) => {
    const tenantA = await createTenant(tx, "ca-10-a");
    const tenantB = await createTenant(tx, "ca-10-b");
    const categoryOfB = await createCategory(tx, tenantB.id);

    await expect(
      tx.$executeRaw`
        INSERT INTO equipments (tenant_id, asset_tag, name, category_id, status, image_object)
        VALUES (${tenantA.id}::uuid, 'TI-0001', 'Notebook 14 polegadas', ${categoryOfB.id}::uuid,
                'available', 'TI-0001-111.jpg')`,
    ).rejects.toThrow(/equipments_tenant_id_category_id_fkey/);
  });
});
