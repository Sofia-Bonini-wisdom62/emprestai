import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { findSessionMembership } from "@/server/services/membership";
import { createTestDb } from "../../../tests/helpers/db";

const db = createTestDb(inject("databaseUrl"));
const tenantIds: string[] = [];

async function createTenant(label: string) {
  const tenant = await db.tenant.create({
    data: { slug: `${label}-${randomUUID()}`, name: `Área ${label}` },
  });
  tenantIds.push(tenant.id);
  return tenant;
}

describe("findSessionMembership", () => {
  const onlyInA = randomUUID();
  const inBoth = randomUUID();
  const withoutMembership = randomUUID();
  let tenantA: { id: string };
  let tenantB: { id: string };

  beforeAll(async () => {
    tenantA = await createTenant("a");
    tenantB = await createTenant("b");
    await db.membership.createMany({
      data: [
        { tenantId: tenantA.id, userId: onlyInA, role: "member" },
        { tenantId: tenantB.id, userId: randomUUID(), role: "operations" },
        { tenantId: tenantA.id, userId: inBoth, role: "member" },
        { tenantId: tenantB.id, userId: inBoth, role: "operations" },
      ],
    });
  });

  afterAll(async () => {
    await db.membership.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await db.$disconnect();
  });

  it("ca_14 quem tem vínculo só na área A recebe a área A e o papel desse vínculo", async () => {
    await expect(findSessionMembership(db, onlyInA)).resolves.toEqual({
      tenantId: tenantA.id,
      role: "member",
    });
  });

  it("ca_14 quem tem vínculo nas áreas A e B não recebe nenhuma das duas", async () => {
    await expect(findSessionMembership(db, inBoth)).resolves.toBeNull();
  });

  it("ca_14 quem não tem vínculo não recebe área", async () => {
    await expect(findSessionMembership(db, withoutMembership)).resolves.toBeNull();
  });
});
