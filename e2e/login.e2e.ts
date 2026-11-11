import { expect, type Page, test } from "@playwright/test";

import { authMessages, LINK_EXPIRED_QUERY } from "../src/lib/auth-messages";
import {
  adminAuth,
  cleanupAccounts,
  createAccount,
  sessionCookies,
  sql,
  uniqueEmail,
} from "../tests/e2e/accounts";
import { seedTargetFromEnv } from "../tests/e2e/seed";

// A tela /login da T-09 contra o Auth de verdade da pilha efêmera. O CA-01 e o CA-02 conferem
// também o header da T-11, com o nome; o resto do header está em header.e2e.ts.

const password = "senha-certa-123";

test.afterAll(async () => {
  await cleanupAccounts();
});

async function signInOnScreen(page: Page, email: string, pass: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// Conta com senha, nome e, depois da primeira entrada, o papel member na default (RN-13).
async function createMemberWithName(name: string) {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; o nome é um literal deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, '${name}');`);
  return email;
}

async function expectStillOnLoginWith(page: Page, message: string) {
  await expect(page.locator("form").getByRole("alert")).toHaveText(message);
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(await sessionCookies(page.context())).toEqual([]);
}

test("ca_01 Beatriz Fontes, com senha, nome e papel member, entra e chega em /catalog", async ({
  page,
}) => {
  const email = await createMemberWithName("Beatriz Fontes");

  await signInOnScreen(page, email, password);

  await page.waitForURL("**/catalog");
  const [cookie] = await sessionCookies(page.context());
  expect(cookie).toMatchObject({ httpOnly: true });

  // O header da T-11: o nome e o menu do usuário com "Sair".
  await page.getByRole("banner").getByRole("button", { name: "Beatriz Fontes" }).click();
  await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible();
});

test("ca_02 Flávia Rocha, a conta do seed, entra e chega em /operations/loans", async ({ page }) => {
  await signInOnScreen(page, "flavia.rocha@example.com", seedTargetFromEnv().password);

  await page.waitForURL("**/operations/loans");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Empréstimos em aberto");
  await expect(page.getByRole("banner").getByRole("button", { name: "Flávia Rocha" })).toBeVisible();
});

test("ca_03 senha errada fica em /login com a mensagem do RN-25 e sem cookie de sessão", async ({
  page,
}) => {
  const email = await createMemberWithName("Beatriz Fontes");

  await signInOnScreen(page, email, "senha-errada-456");

  await expectStillOnLoginWith(page, authMessages.invalidCredentials);
});

test("ca_03 e-mail sem conta fica em /login com a mesma mensagem e sem cookie de sessão", async ({
  page,
}) => {
  await signInOnScreen(page, uniqueEmail("ninguem"), password);

  await expectStillOnLoginWith(page, authMessages.invalidCredentials);
});

test("ca_04 conta bloqueada no Auth, com a senha certa, fica em /login com a mensagem do RN-25", async ({
  page,
}) => {
  const email = uniqueEmail("caio.moreira");
  const userId = await createAccount(email, password);
  const { error } = await adminAuth().updateUserById(userId, { ban_duration: "876000h" });
  if (error) throw error;

  await signInOnScreen(page, email, password);

  await expectStillOnLoginWith(page, authMessages.invalidCredentials);
});

test("ca_19 Beatriz Fontes com sessão abre /login e vai para /catalog", async ({ page }) => {
  const email = await createMemberWithName("Beatriz Fontes");
  await signInOnScreen(page, email, password);
  await page.waitForURL("**/catalog");

  await page.goto("/login");

  expect(new URL(page.url()).pathname).toBe("/catalog");
});

test("ca_22 a quarta tentativa com o mesmo e-mail dentro da janela mostra a mensagem do limite na tela", async ({
  page,
}) => {
  const email = await createMemberWithName("Beatriz Fontes");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await signInOnScreen(page, email, "senha-errada-456");
    await expect(page.locator("form").getByRole("alert")).toHaveText(authMessages.invalidCredentials);
  }
  await signInOnScreen(page, email, password);

  await expectStillOnLoginWith(page, authMessages.tooManyAttempts);
});

test("ca_25 /login com o aviso de link vencido mostra a mensagem do RN-38", async ({ page }) => {
  await page.goto(`/login?${LINK_EXPIRED_QUERY}`);

  await expect(page.locator("form").getByRole("alert")).toHaveText(authMessages.linkExpired);
});

test.describe("ca_12 a tela /login", () => {
  test("ca_12 não tem link de criar conta, leva a /forgot-password e mostra o aviso como texto", async ({
    page,
  }) => {
    await page.goto("/login");

    const links = page.getByRole("link");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveText("Esqueci minha senha");
    await expect(links).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByText("Sem acesso? Fale com Operações.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("ca_12 o botão de mostrar e ocultar a senha tem nome acessível e troca o tipo do campo", async ({
    page,
  }) => {
    await page.goto("/login");
    const passwordField = page.getByLabel("Senha", { exact: true });

    await expect(passwordField).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(passwordField).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar senha" }).click();
    await expect(passwordField).toHaveAttribute("type", "password");
  });

  for (const { width, height, columns } of [
    { width: 1024, height: 768, columns: 2 },
    { width: 375, height: 812, columns: 1 },
  ]) {
    test(`ca_12 em ${width}px, ${columns === 2 ? "duas colunas" : "uma coluna"}, sem rolagem lateral`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height });
      await page.goto("/login");

      const panel = await page.locator("aside").boundingBox();
      const form = await page.locator("form").boundingBox();
      if (!panel || !form) throw new Error("painel ou formulário fora da tela");
      if (columns === 2) {
        expect(form.x).toBeGreaterThanOrEqual(panel.x + panel.width);
      } else {
        expect(form.y).toBeGreaterThanOrEqual(panel.y + panel.height);
      }
      const scroll = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(scroll.page).toBeLessThanOrEqual(scroll.viewport);

      // A captura do CA-12 fica em test-results/, fora do git, a cada rodada.
      const path = testInfo.outputPath(`login-${width}px.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(`login-${width}px.png`, { path, contentType: "image/png" });
    });
  }
});
