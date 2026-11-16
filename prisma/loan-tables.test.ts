// Banco das tabelas de empréstimo e auditoria (spec 004, T-01): o índice parcial (CA-07), a
// auditoria append-only (CA-12, a parte do banco) e a RLS com as FKs compostas (CA-15, a parte do
// banco). As regras do pedido são da T-03.
import { randomUUID } from "node:crypto";

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

// Uma área com um equipamento disponível e uma pessoa com vínculo nela.
async function createArea(tx: Prisma.TransactionClient, slug: string) {
  const tenant = await tx.tenant.create({ data: { slug, name: `Área ${slug}` } });
  const category = await tx.equipmentCategory.create({
    data: { tenantId: tenant.id, name: "Notebooks" },
  });
  const equipment = await tx.equipment.create({
    data: {
      tenantId: tenant.id,
      assetTag: "TI-0005",
      name: "Monitor 24 polegadas",
      categoryId: category.id,
      status: "available",
      imageObject: "TI-0005-111.jpg",
    },
  });
  const membership = await tx.membership.create({
    data: { tenantId: tenant.id, userId: randomUUID(), role: "member" },
  });
  return { tenant, equipment, userId: membership.userId };
}

async function createLoan(
  tx: Prisma.TransactionClient,
  area: Awaited<ReturnType<typeof createArea>>,
  returnedAt: Date | null = null,
) {
  return tx.loan.create({
    data: {
      tenantId: area.tenant.id,
      equipmentId: area.equipment.id,
      userId: area.userId,
      dueOn: new Date("2026-11-26"),
      returnedAt,
    },
  });
}

async function createAuditEvent(tx: Prisma.TransactionClient) {
  const area = await createArea(tx, "ca-12");
  const loan = await createLoan(tx, area);
  return tx.auditEvent.create({
    data: {
      tenantId: area.tenant.id,
      actorUserId: area.userId,
      action: "loan.create",
      resourceType: "loan",
      resourceId: loan.id,
    },
  });
}

describe("ca_07 índice único parcial de loans", () => {
  it("ca_07 recusa um segundo empréstimo em aberto do mesmo equipamento", async () => {
    await inRolledBackTransaction(async (tx) => {
      const area = await createArea(tx, "ca-07");
      await createLoan(tx, area);

      await expect(
        tx.$executeRaw`
          INSERT INTO loans (tenant_id, equipment_id, user_id, due_on)
          VALUES (${area.tenant.id}::uuid, ${area.equipment.id}::uuid, ${area.userId}::uuid,
                  '2026-11-26')`,
      ).rejects.toThrow(/loans_equipment_id_open_key/);
    });
  });

  it("ca_07 aceita um empréstimo em aberto depois de um já devolvido", async () => {
    await inRolledBackTransaction(async (tx) => {
      const area = await createArea(tx, "ca-07");
      await createLoan(tx, area, new Date("2026-11-20"));

      await expect(createLoan(tx, area)).resolves.toMatchObject({ returnedAt: null });
      await expect(tx.loan.count({ where: { equipmentId: area.equipment.id } })).resolves.toBe(2);
    });
  });
});

describe("ca_12 audit_events é append-only", () => {
  const changes = [
    ["UPDATE", (id: string) => `UPDATE audit_events SET action = 'loan.other' WHERE id = '${id}'`],
    ["DELETE", (id: string) => `DELETE FROM audit_events WHERE id = '${id}'`],
    ["TRUNCATE", () => "TRUNCATE audit_events"],
  ] as const;

  it.each(changes)("ca_12 %s em audit_events falha para o dono das tabelas", async (op, sql) => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createAuditEvent(tx);

      await expect(tx.$executeRawUnsafe(sql(event.id))).rejects.toThrow(
        new RegExp(`audit_events é append-only: ${op} recusado`),
      );
    });
  });

  it("ca_12 o INSERT em audit_events passa", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createAuditEvent(tx);

      await expect(tx.auditEvent.findUnique({ where: { id: event.id } })).resolves.toMatchObject({
        action: "loan.create",
        resourceType: "loan",
      });
    });
  });
});

const tables = [
  {
    name: "loans",
    insert: async (tx: Prisma.TransactionClient) => {
      await createLoan(tx, await createArea(tx, "ca-15-a"));
    },
    count: (tx: Prisma.TransactionClient) => tx.loan.count(),
  },
  {
    name: "audit_events",
    insert: async (tx: Prisma.TransactionClient) => {
      await createAuditEvent(tx);
    },
    count: (tx: Prisma.TransactionClient) => tx.auditEvent.count(),
  },
];

describe.each(tables)("$name", (table) => {
  describe.each(["authenticated", "anon"])("como %s", (role) => {
    const setRole = `SET LOCAL ROLE ${role}`;

    it(`ca_15 ${role} não lê a linha de ${table.name} que o dono lê`, async () => {
      await inRolledBackTransaction(async (tx) => {
        await table.insert(tx);
        expect(await table.count(tx)).toBeGreaterThan(0);

        await tx.$executeRawUnsafe(setRole);

        await expect(table.count(tx)).resolves.toBe(0);
      });
    });

    // Controle: prova que o zero acima vem da RLS, e não de outra coisa.
    it(`ca_15 ${role} lê a linha de ${table.name} quando a RLS está desligada`, async () => {
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
it("ca_15 as policies explícitas negam tudo a anon e authenticated", async () => {
  await expect(
    db.$queryRaw`
      SELECT tablename, policyname, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('audit_events', 'loans')
      ORDER BY tablename`,
  ).resolves.toEqual(
    ["audit_events", "loans"].map((name) => ({
      tablename: name,
      policyname: `${name}_deny_all`,
      roles: ["anon", "authenticated"],
      cmd: "ALL",
      qual: "false",
      with_check: "false",
    })),
  );
});

// As FKs compostas: o banco recusa um empréstimo que cruza áreas.
describe("ca_15 um empréstimo da área A não cruza para a área B", () => {
  it("ca_15 recusa o equipamento da área B", async () => {
    await inRolledBackTransaction(async (tx) => {
      const areaA = await createArea(tx, "ca-15-a");
      const areaB = await createArea(tx, "ca-15-b");

      await expect(
        tx.$executeRaw`
          INSERT INTO loans (tenant_id, equipment_id, user_id, due_on)
          VALUES (${areaA.tenant.id}::uuid, ${areaB.equipment.id}::uuid, ${areaA.userId}::uuid,
                  '2026-11-26')`,
      ).rejects.toThrow(/loans_tenant_id_equipment_id_fkey/);
    });
  });

  it("ca_15 recusa a pessoa sem vínculo na área A", async () => {
    await inRolledBackTransaction(async (tx) => {
      const areaA = await createArea(tx, "ca-15-a");
      const areaB = await createArea(tx, "ca-15-b");

      await expect(
        tx.$executeRaw`
          INSERT INTO loans (tenant_id, equipment_id, user_id, due_on)
          VALUES (${areaA.tenant.id}::uuid, ${areaA.equipment.id}::uuid, ${areaB.userId}::uuid,
                  '2026-11-26')`,
      ).rejects.toThrow(/loans_tenant_id_user_id_fkey/);
    });
  });
});
