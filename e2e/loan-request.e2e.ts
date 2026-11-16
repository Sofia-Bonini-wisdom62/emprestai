import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { cleanupAccounts, createAccount, sql, uniqueEmail } from "../tests/e2e/accounts";
import { seedTargetFromEnv } from "../tests/e2e/seed";

// O detalhe e o pedido pela tela (spec 004, T-06), contra o build de produção e a CSP ligada: a ficha,
// a foto e o crédito (CA-08), o card "Solicitar empréstimo" em cada situação (CA-01 a CA-04 e
// CA-09), Operações pedindo pelo mesmo caminho (CA-11) e o detalhe sem sessão (CA-13). O aviso de
// resultado em Meus empréstimos é da T-07, que cria a tela. Os equipamentos e os empréstimos de
// antes do pedido entram direto no banco da pilha efêmera.

const password = "senha-certa-123";
const run = randomUUID().slice(0, 8);
const categoryName = `Monitores E2E ${run}`;
let sequence = 0;

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

test.beforeAll(() => {
  sql(`
    INSERT INTO "equipment_categories" ("tenant_id", "name")
    SELECT "id", '${categoryName}' FROM "tenants" WHERE "slug" = 'default';
  `);
});

type Status = "available" | "loaned" | "maintenance" | "out_of_service";

// Cada sql() sobe o Prisma CLI, o que leva alguns segundos nesta máquina: os casos preparam o
// banco com poucas chamadas, e os que preparam mais de um empréstimo têm limite maior.
function nextEquipment() {
  sequence += 1;
  const tag = `R${run}-${String(sequence).padStart(2, "0")}`;
  return { id: randomUUID(), tag, name: `Monitor ${tag}` };
}

function insertEquipment(equipment: { id: string; tag: string }, status: Status) {
  return `
    INSERT INTO "equipments" ("id", "tenant_id", "asset_tag", "name", "category_id", "status", "image_object")
    SELECT '${equipment.id}'::uuid, c."tenant_id", '${equipment.tag}', 'Monitor ${equipment.tag}', c."id",
           '${status}', '${equipment.tag}-111.jpg'
    FROM "equipment_categories" c WHERE c."name" = '${categoryName}';`;
}

// Um equipamento da default, com o id escolhido aqui, para o teste abrir o detalhe dele.
function createEquipment(status: Status = "available") {
  const equipment = nextEquipment();
  sql(insertEquipment(equipment, status));
  return equipment;
}

// Empréstimos em aberto de antes do teste, como o pedido os teria deixado, numa chamada só.
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

async function signIn(page: Page, email: string, secret: string, landing: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`**${landing}`);
}

// Uma Beatriz Fontes nova por caso; a primeira entrada dá a ela o papel member na default (RN-13).
async function newBeatriz(page: Page) {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; o nome é um literal deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);
  await signIn(page, email, password, "/catalog");
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

const requestCard = (page: Page) =>
  page.getByRole("complementary").filter({ hasText: "Solicitar empréstimo" });

test("ca_01 Beatriz confirma o pedido no detalhe, cai em Meus empréstimos, e o item passa a emprestado com ela", async ({
  page,
}) => {
  // O diálogo do Radix injeta um <style> para travar a rolagem; ele precisa sair com o nonce (ADR-012).
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      cspErrors.push(message.text());
    }
  });
  await newBeatriz(page);
  const equipment = createEquipment();

  await page.goto(`/catalog/${equipment.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(equipment.name);
  await expect(requestCard(page)).toContainText(`Devolver até ${expectedDueOn()}`);
  await expect(requestCard(page)).toContainText("Retire no balcão de Operações");

  await requestCard(page).getByRole("button", { name: "Solicitar empréstimo" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Confirmar empréstimo" });
  await expect(dialog).toContainText(`Devolver até ${expectedDueOn()}`);
  await expect(dialog).toContainText("Depois deste, você fica com 1 de 3 itens");
  expect(cspErrors).toEqual([]);
  await dialog.getByRole("button", { name: "Confirmar empréstimo" }).click();

  await page.waitForURL("**/my-loans?confirmado=*");

  await page.goto(`/catalog/${equipment.id}`);
  await expect(page.getByRole("main")).toContainText("Emprestado");
  await expect(requestCard(page)).toContainText(`Com Beatriz Fontes · volta até ${expectedDueOn()}`);
  await expect(page.getByRole("banner")).toContainText("Você está com 1 de 3 itens");
});

test("ca_01 Cancelar fecha o diálogo sem criar o empréstimo", async ({ page }) => {
  await newBeatriz(page);
  const equipment = createEquipment();

  await page.goto(`/catalog/${equipment.id}`);
  await requestCard(page).getByRole("button", { name: "Solicitar empréstimo" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("banner")).toContainText("Você está com 0 de 3 itens");
});

test("ca_02 o item em manutenção mostra o motivo no lugar do botão", async ({ page }) => {
  await newBeatriz(page);
  const equipment = createEquipment("maintenance");

  await page.goto(`/catalog/${equipment.id}`);

  await expect(requestCard(page)).toContainText("Em manutenção. Não pode ser pedido agora.");
  await expect(requestCard(page).getByRole("button")).toHaveCount(0);
});

test("ca_17 o item fora de uso mostra a pill e o motivo no lugar do botão", async ({ page }) => {
  await newBeatriz(page);
  const equipment = createEquipment("out_of_service");

  await page.goto(`/catalog/${equipment.id}`);

  await expect(page.getByRole("main")).toContainText("Fora de uso");
  await expect(requestCard(page)).toContainText("Este equipamento não está disponível.");
  await expect(requestCard(page).getByRole("button")).toHaveCount(0);
});

test("ca_03 com 3 em aberto, o botão fica desabilitado com o motivo; com 2, o diálogo avisa que completa o limite", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const userId = await newBeatriz(page);
  giveLoans(userId, ["2099-01-01", "2099-01-01"]);
  const equipment = createEquipment();

  await page.goto(`/catalog/${equipment.id}`);
  await requestCard(page).getByRole("button", { name: "Solicitar empréstimo" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Depois deste, você fica com 3 de 3 itens",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();

  giveLoans(userId, ["2099-01-01"]);
  await page.reload();

  const button = requestCard(page).getByRole("button", { name: "Solicitar empréstimo" });
  await expect(button).toBeDisabled();
  await expect(requestCard(page)).toContainText(
    "Você já está com 3 itens. Devolva um para pedir outro.",
  );
  await expect(page.getByRole("banner")).toContainText("Limite atingido");
});

test("ca_04 com item em atraso, o catálogo e o detalhe mostram o quadro de bloqueio", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const userId = await newBeatriz(page);
  giveLoans(userId, ["2020-01-01"]);
  const equipment = createEquipment();

  await page.goto("/catalog");
  await expect(page.getByRole("alert").filter({ hasText: "em atraso" })).toContainText(
    "Você tem um item em atraso. Devolva-o para pedir outro.",
  );

  await page.goto(`/catalog/${equipment.id}`);
  await expect(page.getByRole("alert").filter({ hasText: "em atraso" }).first()).toBeVisible();
  await expect(requestCard(page).getByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled();
});

test("ca_08 o detalhe mostra a foto de 800×600 e o crédito do Pixabay", async ({ page }) => {
  await newBeatriz(page);
  const equipment = createEquipment();

  await page.goto(`/catalog/${equipment.id}`);

  const photo = page.getByRole("main").locator("img");
  await expect(photo).toHaveAttribute("src", new RegExp(`/equipment-images/${equipment.tag}-111\\.jpg$`));
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
    .toEqual([800, 600]);
  await expect(page.getByRole("link", { name: "Pixabay" })).toHaveAttribute("href", "https://pixabay.com");
});

test("ca_09 o detalhe do item emprestado mostra quem está com ele e a data", async ({ page }) => {
  const userId = await newBeatriz(page);
  const [equipment] = giveLoans(userId, ["2026-11-26"]);

  await page.goto(`/catalog/${equipment.id}`);

  await expect(requestCard(page)).toContainText("Com Beatriz Fontes · volta até 26/11/2026");
});

test("ca_11 Flávia, de Operações, chega ao detalhe pelo catálogo e solicita pelo mesmo diálogo", async ({
  page,
}) => {
  await signIn(page, "flavia.rocha@example.com", seedTargetFromEnv().password, "/operations/loans");
  const equipment = createEquipment();

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Catálogo" }).click();
  await page.waitForURL("**/catalog");
  await page.goto(`/catalog/${equipment.id}`);
  await requestCard(page).getByRole("button", { name: "Solicitar empréstimo" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar empréstimo" }).click();

  await page.waitForURL("**/my-loans?confirmado=*");
  await page.goto(`/catalog/${equipment.id}`);
  await expect(requestCard(page)).toContainText("Com Flávia Rocha");
});

test("ca_13 sem sessão, o detalhe leva a /login", async ({ page }) => {
  await page.goto(`/catalog/${randomUUID()}`);

  expect(new URL(page.url()).pathname).toBe("/login");
});
