import { expect, type Page, test } from "@playwright/test";

import {
  adminAuth,
  cleanupAccounts,
  createAccount,
  sessionCookies,
  sql,
  uniqueEmail,
} from "../tests/e2e/accounts";

// O header com o nome e o menu "Sair", e o layout das telas de Operações (T-11), contra o Auth de
// verdade da pilha efêmera.

const password = "senha-certa-123";

test.afterAll(async () => {
  await cleanupAccounts();
});

// Beatriz Fontes com senha e nome; a primeira entrada dá a ela o papel member na default (RN-13).
async function signedInMember(page: Page) {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; o nome é um literal deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/catalog");

  return userId;
}

test("ca_11 Beatriz Fontes usa Sair: o cookie de sessão some, ela vai a /login, e /catalog depois leva a /login", async ({
  page,
}) => {
  await signedInMember(page);
  expect(await sessionCookies(page.context())).not.toEqual([]);

  await page.getByRole("banner").getByRole("button", { name: "Beatriz Fontes" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await page.waitForURL("**/login");
  expect(await sessionCookies(page.context())).toEqual([]);

  await page.goto("/catalog");
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("ca_18 Beatriz Fontes, com papel member, abre /operations/loans e vai para /catalog", async ({
  page,
}) => {
  await signedInMember(page);

  await page.goto("/operations/loans");

  expect(new URL(page.url()).pathname).toBe("/catalog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo");
});

test("ca_21 com a sessão aberta, a conta bloqueada no Auth vai para /login na tela seguinte", async ({
  page,
}) => {
  const userId = await signedInMember(page);
  const { error } = await adminAuth().updateUserById(userId, { ban_duration: "876000h" });
  if (error) throw error;

  await page.goto("/catalog");

  expect(new URL(page.url()).pathname).toBe("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
