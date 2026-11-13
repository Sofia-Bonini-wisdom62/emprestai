import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { cleanupAccounts, createAccount, sql, uniqueEmail } from "../tests/e2e/accounts";
import { seedTargetFromEnv } from "../tests/e2e/seed";

// O header da spec 004 (T-04): o contador de empréstimos em aberto (CA-10) e os links "Catálogo"
// e "Meus empréstimos", por onde quem é de Operações chega ao catálogo (CA-11). O pedido pela
// tela é da T-06; aqui os empréstimos entram direto no banco da pilha efêmera.

const password = "senha-certa-123";
// O que este arquivo grava fora das contas, para apagar no fim. As FKs de loans seguram o
// vínculo, então os empréstimos saem antes do cleanupAccounts.
const categoryName = `Categoria E2E ${randomUUID()}`;

test.afterAll(async () => {
  sql(`
    DELETE FROM "loans" WHERE "equipment_id" IN (
      SELECT e."id" FROM "equipments" e
      JOIN "equipment_categories" c ON c."id" = e."category_id"
      WHERE c."name" = '${categoryName}');
    DELETE FROM "equipments" WHERE "category_id" IN (
      SELECT "id" FROM "equipment_categories" WHERE "name" = '${categoryName}');
    DELETE FROM "equipment_categories" WHERE "name" = '${categoryName}';
  `);
  await cleanupAccounts();
});

test("ca_10 Beatriz Fontes, com 2 empréstimos em aberto, vê no header \"Você está com 2 de 3 itens\"", async ({
  page,
}) => {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; os outros valores são literais deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);

  // A primeira entrada dá a ela o papel member na default (RN-13).
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/catalog");
  await expect(page.getByRole("banner")).toContainText("Você está com 0 de 3 itens");

  sql(`
    WITH area AS (SELECT "id" FROM "tenants" WHERE "slug" = 'default'),
    category AS (
      INSERT INTO "equipment_categories" ("tenant_id", "name")
      SELECT "id", '${categoryName}' FROM area RETURNING "id", "tenant_id"),
    items AS (
      INSERT INTO "equipments" ("tenant_id", "asset_tag", "name", "category_id", "status", "image_object")
      SELECT c."tenant_id", t.tag || '-${userId.slice(0, 8)}', t.tag, c."id", 'loaned', t.tag || '-111.jpg'
      FROM category c, (VALUES ('E2E-0001'), ('E2E-0002')) AS t(tag)
      RETURNING "id", "tenant_id")
    INSERT INTO "loans" ("tenant_id", "equipment_id", "user_id", "due_on")
    SELECT i."tenant_id", i."id", '${userId}'::uuid, DATE '2099-01-01' FROM items i;
  `);

  await page.goto("/catalog");

  await expect(page.getByRole("banner")).toContainText("Você está com 2 de 3 itens");
});

test("ca_11 Flávia Rocha, de Operações, cai em /operations/loans e chega ao catálogo pelo header", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("flavia.rocha@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(seedTargetFromEnv().password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/operations/loans");

  const nav = page.getByRole("banner").getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Meus empréstimos" })).toHaveAttribute(
    "href",
    "/my-loans",
  );
  await nav.getByRole("link", { name: "Catálogo" }).click();

  await page.waitForURL("**/catalog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo");
  // A conta do seed é a mesma em todo o E2E: o número de itens dela não é deste caso.
  await expect(page.getByRole("banner")).toContainText(/Você está com \d de 3 itens/);
});
