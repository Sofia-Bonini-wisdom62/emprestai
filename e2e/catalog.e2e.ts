import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { cleanupAccounts, createAccount, sql, uniqueEmail } from "../tests/e2e/accounts";

// O catálogo da spec 004 (T-05): os 12 cards com foto, o crédito "Fotos: Pixabay" (CA-08), o item
// emprestado com quem está com ele (CA-09) e a tela sem sessão (CA-13), contra o build de produção
// e a CSP ligada. As fotos vêm do servidor de teste da pilha (tests/e2e/image-server.ts), e os
// equipamentos entram direto no banco da pilha efêmera.

const password = "senha-certa-123";
// Os patrimônios desta rodada começam por "0", para virem antes de qualquer outro na ordem do
// catálogo e caberem na primeira página.
const run = randomUUID().slice(0, 8);
const tags = Array.from({ length: 12 }, (_, i) => `0${run}-${String(i + 1).padStart(2, "0")}`);
const categoryName = `Notebooks E2E ${run}`;

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

// Beatriz Fontes com senha e nome; a primeira entrada dá a ela o papel member na default (RN-13).
async function signedInBeatriz(page: Page) {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; os outros valores são literais deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/catalog");
  return userId;
}

// Os 12 equipamentos: o 01 emprestado a Beatriz até 26/11/2026, o 04 em manutenção, o resto livre.
function createEquipment(borrowerId: string) {
  const rows = tags
    .map((tag, i) => {
      const status = i === 0 ? "loaned" : i === 3 ? "maintenance" : "available";
      return `('${tag}', 'Equipamento ${tag}', '${status}', '${tag}-111.jpg')`;
    })
    .join(",\n      ");
  sql(`
    WITH area AS (SELECT "id" FROM "tenants" WHERE "slug" = 'default'),
    category AS (
      INSERT INTO "equipment_categories" ("tenant_id", "name")
      SELECT "id", '${categoryName}' FROM area RETURNING "id", "tenant_id"),
    items AS (
      INSERT INTO "equipments" ("tenant_id", "asset_tag", "name", "category_id", "status", "image_object")
      SELECT c."tenant_id", v.tag, v.name, c."id", v.status::"equipment_status", v.object
      FROM category c, (VALUES
      ${rows}) AS v(tag, name, status, object)
      RETURNING "id", "tenant_id", "asset_tag")
    INSERT INTO "loans" ("tenant_id", "equipment_id", "user_id", "due_on")
    SELECT i."tenant_id", i."id", '${borrowerId}'::uuid, DATE '2026-11-26'
    FROM items i WHERE i."asset_tag" = '${tags[0]}';
  `);
}

// Junta as violações de CSP da página, como o e2e/csp.e2e.ts.
async function watchViolations(page: Page) {
  const fromConsole: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      fromConsole.push(message.text());
    }
  });
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: store });
    document.addEventListener("securitypolicyviolation", (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return async () => ({
    events: await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations),
    console: fromConsole,
  });
}

// O ca_09 lê os equipamentos que o ca_08 grava: os dois rodam em ordem.
test.describe.configure({ mode: "serial" });

test("ca_08 o catálogo mostra os 12 equipamentos, cada um com a foto de 800×600, e o crédito do Pixabay", async ({
  page,
}) => {
  const violations = await watchViolations(page);
  const userId = await signedInBeatriz(page);
  createEquipment(userId);

  await page.goto("/catalog");

  for (const tag of tags) {
    const card = page.getByRole("link", { name: new RegExp(`· ${tag}`) });
    await expect(card).toBeVisible();
    const photo = card.locator("img");
    await expect(photo).toHaveAttribute("src", new RegExp(`/equipment-images/${tag}-111\\.jpg$`));
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
      .toEqual([800, 600]);
  }
  await expect(page.getByRole("link", { name: new RegExp(`· ${tags[1]}`) })).toContainText(
    "Disponível",
  );
  await expect(page.getByRole("link", { name: new RegExp(`· ${tags[3]}`) })).toContainText(
    "Em manutenção",
  );

  const credit = page.getByRole("link", { name: "Pixabay" });
  await expect(credit).toHaveAttribute("href", "https://pixabay.com");
  await expect(page.getByText("Fotos:")).toBeVisible();

  expect(await violations()).toEqual({ events: [], console: [] });
});

test("ca_09 o card do item emprestado mostra quem está com ele e a data", async ({ page }) => {
  // O ca_08 deixou os itens no banco, emprestados à Beatriz dele; esta é outra conta.
  await signedInBeatriz(page);

  const card = page.getByRole("link", { name: new RegExp(`· ${tags[0]}`) });
  await expect(card).toContainText("Emprestado");
  await expect(card).toContainText("Com Beatriz Fontes");
  await expect(card).toContainText("Volta até 26/11");
  await expect(card).toHaveAttribute("href", /^\/catalog\/[0-9a-f-]{36}$/);
});

test("ca_13 sem sessão, /catalog leva a /login", async ({ page }) => {
  await page.goto("/catalog");

  expect(new URL(page.url()).pathname).toBe("/login");
});
