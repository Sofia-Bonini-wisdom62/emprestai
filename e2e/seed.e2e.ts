import { expect, test } from "@playwright/test";

import { readSeedRows, runSeed, seedTargetFromEnv } from "../tests/e2e/seed";

// O globalSetup já rodou o seed uma vez; o caso roda a segunda e conta as linhas pelo Prisma.
test("ca_13 o seed rodado duas vezes deixa uma área default e Flávia Rocha em Operações", () => {
  const target = seedTargetFromEnv();
  runSeed(target);

  const { tenants, users, profiles, memberships } = readSeedRows(target);

  expect(tenants).toEqual([{ slug: "default" }]);
  expect(users.map((user) => user.email)).toEqual(["flavia.rocha@example.com"]);
  expect(profiles).toEqual([{ id: users[0].id, name: "Flávia Rocha" }]);
  expect(memberships).toEqual([
    { userId: users[0].id, role: "operations", tenant: { slug: "default" } },
  ]);
});
