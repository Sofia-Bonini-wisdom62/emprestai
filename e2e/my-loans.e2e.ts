import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { cleanupAccounts, createAccount, sql, uniqueEmail } from "../tests/e2e/accounts";

// Meus empréstimos (spec 004, T-07): o aviso de resultado depois de confirmar um pedido (CA-01, o
// pedaço que a T-06 deixou para cá), a lista só com os empréstimos em aberto da pessoa e o estado
// vazio (CA-10), e a tela sem sessão (CA-13).

const password = "senha-certa-123";
const run = randomUUID().slice(0, 8);
const categoryName = `Cabos E2E ${run}`;
let sequence = 0;

test.beforeAll(() => {
  sql(`
    INSERT INTO "equipment_categories" ("tenant_id", "name")
    SELECT "id", '${categoryName}' FROM "tenants" WHERE "slug" = 'default';
  `);
});

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

function nextEquipment() {
  sequence += 1;
  const tag = `M${run}-${String(sequence).padStart(2, "0")}`;
  return { id: randomUUID(), tag, name: `Cabo ${tag}` };
}

function insertEquipment(equipment: { id: string; tag: string; name: string }, status: string) {
  return `
    INSERT INTO "equipments" ("id", "tenant_id", "asset_tag", "name", "category_id", "status", "image_object")
    SELECT '${equipment.id}'::uuid, c."tenant_id", '${equipment.tag}', '${equipment.name}', c."id",
           '${status}', '${equipment.tag}-111.jpg'
    FROM "equipment_categories" c WHERE c."name" = '${categoryName}';`;
}

// Cada sql() sobe o Prisma CLI: os empréstimos de antes do teste entram numa chamada só.
function giveLoans(userId: string, dueOns: string[]) {
  const equipment = dueOns.map(() => nextEquipment());
  sql(
    equipment
      .map(
        (item, i) => `${insertEquipment(item, "loaned")}
    INSERT INTO "loans" ("tenant_id", "equipment_id", "user_id", "due_on")
    SELECT "id", '${item.id}'::uuid, '${userId}'::uuid, DATE '${dueOns[i]}'
    FROM "tenants" WHERE "slug" = 'default';`,
      )
      .join("\n"),
  );
  return equipment;
}

// Uma pessoa nova por caso; a primeira entrada dá a ela o papel member na default (RN-13).
async function newPerson(page: Page, name: string) {
  const email = uniqueEmail(name.toLowerCase().replace(" ", "."));
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; o nome é um literal deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, '${name}');`);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/catalog");
  return userId;
}

// A data prevista de um pedido feito agora: hoje em São Paulo mais 14 dias corridos (RN-04).
function expectedDueOn() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const due = new Date(`${today}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 14);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(due);
}

const withYou = (page: Page) => page.getByRole("region", { name: "Itens com você" });

test("ca_01 depois de confirmar, Meus empréstimos mostra o aviso de resultado e o item na lista", async ({
  page,
}) => {
  await newPerson(page, "Beatriz Fontes");
  const equipment = nextEquipment();
  sql(insertEquipment(equipment, "available"));

  await page.goto(`/catalog/${equipment.id}`);
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Solicitar empréstimo" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar empréstimo" }).click();

  await page.waitForURL("**/my-loans?confirmado=*");
  await expect(page.getByRole("status").filter({ hasText: "Empréstimo confirmado" })).toHaveText(
    `Empréstimo confirmado. Retire o item no balcão de Operações e devolva até ${expectedDueOn()}.`,
  );
  await expect(withYou(page)).toContainText(equipment.name);

  // Na navegação seguinte, o aviso some (docs/layout.md, seção 5).
  await page.getByRole("link", { name: "Ver catálogo" }).click();
  await page.waitForURL("**/catalog");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Meus empréstimos" }).click();
  await page.waitForURL("**/my-loans");
  await expect(page.getByText("Empréstimo confirmado")).toHaveCount(0);
});

test("ca_10 Meus empréstimos mostra só os empréstimos em aberto da pessoa, com nome, patrimônio e data", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const userId = await newPerson(page, "Beatriz Fontes");
  const [first, second] = giveLoans(userId, ["2099-01-26", "2099-01-28"]);
  const enzo = await createAccount(uniqueEmail("enzo.paiva"), password);
  sql(`
    INSERT INTO "memberships" ("tenant_id", "user_id", "role")
    SELECT "id", '${enzo}'::uuid, 'member' FROM "tenants" WHERE "slug" = 'default';
  `);
  const [ofEnzo] = giveLoans(enzo, ["2099-01-27"]);

  await page.goto("/my-loans");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meus empréstimos");
  const rows = withYou(page).getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(first!.name);
  await expect(rows.nth(0)).toContainText(first!.tag);
  await expect(rows.nth(0)).toContainText("Devolver até 26/01");
  await expect(rows.nth(1)).toContainText(second!.name);
  await expect(rows.nth(1)).toContainText("Devolver até 28/01");
  await expect(withYou(page)).not.toContainText(ofEnzo!.name);
  await expect(withYou(page).getByRole("button", { name: "Devolver" })).toHaveCount(0);
  await expect(page.getByRole("banner")).toContainText("Você está com 2 de 3 itens");
});

test("ca_10 sem empréstimo, Meus empréstimos mostra o estado vazio com o link para o catálogo", async ({
  page,
}) => {
  await newPerson(page, "Enzo Paiva");

  await page.goto("/my-loans");

  await expect(withYou(page)).toContainText("Você não está com nenhum item.");
  await withYou(page).getByRole("link", { name: "Ver o catálogo" }).click();
  await page.waitForURL("**/catalog");
});

test("ca_13 sem sessão, /my-loans leva a /login", async ({ page }) => {
  await page.goto("/my-loans");

  expect(new URL(page.url()).pathname).toBe("/login");
});
