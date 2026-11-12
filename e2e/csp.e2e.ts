import { expect, type Page, test } from "@playwright/test";

import { cleanupAccounts, createAccount, sql, uniqueEmail } from "../tests/e2e/accounts";

// A CSP sem 'unsafe-inline', com nonce por request (T-12, CA-16), contra o build de produção do
// E2E: o next dev precisa de 'unsafe-eval' e de estilo inline, então a prova é com next start.

const password = "senha-certa-123";

test.afterAll(async () => {
  await cleanupAccounts();
});

type Violation = { directive: string; blocked: string };

// Junta toda violação de CSP da página: o evento securitypolicyviolation, que o script de início do
// Playwright escuta sem passar pela CSP, e as mensagens de erro do console sobre a CSP.
async function watchViolations(page: Page) {
  const fromConsole: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      fromConsole.push(message.text());
    }
  });
  await page.addInitScript(() => {
    const store: Violation[] = [];
    Object.defineProperty(window, "__cspViolations", { value: store });
    document.addEventListener("securitypolicyviolation", (event) => {
      store.push({ directive: event.violatedDirective, blocked: event.blockedURI });
    });
  });

  return async () => ({
    events: await page.evaluate(
      () => (window as unknown as { __cspViolations: Violation[] }).__cspViolations,
    ),
    console: fromConsole,
  });
}

async function expectNoViolations(read: () => Promise<{ events: Violation[]; console: string[] }>) {
  expect(await read()).toEqual({ events: [], console: [] });
}

test("ca_16 a resposta de /login traz a CSP sem 'unsafe-inline', e todo script da página leva o nonce dela", async ({
  request,
}) => {
  const response = await request.get("/login");

  expect(response.status()).toBe(200);
  const policy = response.headers()["content-security-policy"] ?? "";
  expect(policy).not.toContain("unsafe-inline");
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeDefined();

  const scripts = [...(await response.text()).matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) expect(script).toContain(`nonce="${nonce}"`);
});

test("ca_16 a resposta traz os cabeçalhos fixos de segurança", async ({ request }) => {
  const headers = (await request.get("/login")).headers();

  expect(headers).toMatchObject({
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
  });
});

// Cada tela espera um sinal de que o JavaScript dela rodou, com o nonce, antes de ler as violações.
const screens: { path: string; ready: (page: Page) => Promise<void> }[] = [
  {
    path: "/",
    ready: (page) => expect(page.getByRole("status")).toHaveText("Banco de dados ok"),
  },
  {
    path: "/login",
    ready: async (page) => {
      await page.getByRole("button", { name: "Mostrar senha" }).click();
      await expect(page.getByRole("button", { name: "Ocultar senha" })).toBeVisible();
    },
  },
  {
    path: "/auth/confirm?token_hash=link-de-teste&type=invite",
    ready: (page) => expect(page.getByRole("button", { name: "Continuar" })).toBeVisible(),
  },
];

for (const { path, ready } of screens) {
  test(`ca_16 ${path.split("?")[0]} abre sem violação de CSP no console`, async ({ page }) => {
    const violations = await watchViolations(page);

    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await ready(page);

    await expectNoViolations(violations);
  });
}

test("ca_16 o header, com o menu do usuário aberto, abre sem violação de CSP no console", async ({
  page,
}) => {
  const violations = await watchViolations(page);
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  // O id vem do Auth, sempre UUID; o nome é um literal deste arquivo.
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/catalog");
  await page.getByRole("banner").getByRole("button", { name: "Beatriz Fontes" }).click();
  await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible();

  await expectNoViolations(violations);
});
