import { randomBytes } from "node:crypto";

import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { authMessages, LINK_EXPIRED_QUERY } from "../src/lib/auth-messages";
import {
  adminAuth,
  cleanupAccounts,
  createAccount,
  data,
  failure,
  mutation,
  query,
  sessionCookies,
  sql,
  trackUser,
  uniqueEmail,
} from "../tests/e2e/accounts";
import { authRelayFromEnv, setAuthRelayMode } from "../tests/e2e/auth-relay";
import { SHORT_LINK_SECONDS, SHORT_TOKEN_SECONDS } from "../tests/e2e/global-setup";
import { seedTargetFromEnv } from "../tests/e2e/seed";

// As telas /account/setup e /forgot-password da T-10 e o "Continuar" do link, contra o Auth de
// verdade da pilha efêmera. O dev não envia e-mail: o link sai de auth.admin.generateLink (ADR-006).
// As telas /catalog e /operations/loans chegam na T-11: o destino se confere pela URL.

const password = "senha-certa-123";

// Cada caso vai várias vezes ao Auth e abre outros navegadores: os 30 s padrão não bastam.
test.describe.configure({ timeout: 90_000 });

test.afterAll(async () => {
  await cleanupAccounts();
});

type LinkType = "invite" | "recovery";

async function linkFor(type: LinkType, email: string) {
  const { data: link, error } = await adminAuth().generateLink({ type, email });
  if (error || !link.properties) throw error ?? new Error("O Auth não gerou o link");
  if (type === "invite" && link.user) trackUser(link.user.id);
  return `/auth/confirm?token_hash=${link.properties.hashed_token}&type=${type}`;
}

// Abre o link e clica em "Continuar" (RN-55).
async function continueFrom(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function openInvite(page: Page, person = "enzo.paiva") {
  const email = uniqueEmail(person);
  await continueFrom(page, await linkFor("invite", email));
  await page.waitForURL("**/account/setup");
  return email;
}

async function signInOnScreen(page: Page, email: string, pass: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

const passwordField = (page: Page) => page.getByLabel("Senha", { exact: true });
const nameField = (page: Page) => page.getByLabel("Seu nome");
const formAlert = (page: Page) => page.locator("form").getByRole("alert");

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  return { page: await context.newPage(), close: () => context.close() };
}

test("ca_07 o convite leva a /account/setup, que pede senha e nome, e daí a /catalog com o papel member", async ({
  page,
}) => {
  const email = await openInvite(page);

  await expect(passwordField(page)).toBeVisible();
  await expect(nameField(page)).toBeVisible();
  await passwordField(page).fill("senha-nova-123");
  await nameField(page).fill("Enzo Paiva");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.waitForURL("**/catalog");
  await expect(query(page.request, "account.me")).resolves.toEqual({
    status: 200,
    body: data({ name: "Enzo Paiva", email, role: "member" }),
  });
});

test("ca_06 a conta sem nome vai a /account/setup, que pede só o nome e recusa nome vazio ou longo demais", async ({
  page,
}) => {
  const email = uniqueEmail("beatriz.fontes");
  await createAccount(email, password);

  await signInOnScreen(page, email, password);
  await page.waitForURL("**/account/setup");
  await expect(passwordField(page)).toHaveCount(0);

  for (const [name, message] of [
    ["   ", authMessages.nameRequired],
    ["B".repeat(81), authMessages.nameTooLong],
  ] as const) {
    await nameField(page).fill(name);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/account/setup");
  }
  await expect(query(page.request, "account.me")).resolves.toMatchObject({
    body: data({ name: null, email, role: "member" }),
  });

  await nameField(page).fill("Beatriz Fontes");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("**/catalog");
});

test("ca_26 a senha curta mostra a mensagem do RN-39, e a pessoa continua sem senha", async ({
  page,
  request,
}) => {
  const email = await openInvite(page);

  await passwordField(page).fill("12345");
  await nameField(page).fill("Enzo Paiva");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("alert").filter({ hasText: authMessages.weakPassword })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/account/setup");
  await expect(mutation(request, "auth.signIn", { email, password: "12345" })).resolves.toMatchObject({
    status: 401,
    body: failure("UNAUTHORIZED", 401, authMessages.invalidCredentials),
  });
});

test("ca_27 Sair em /account/setup apaga o cookie de sessão e leva a /login", async ({ page }) => {
  await openInvite(page);
  expect(await sessionCookies(page.context())).not.toEqual([]);

  await page.getByRole("button", { name: "Sair" }).click();

  await page.waitForURL("**/login");
  expect(await sessionCookies(page.context())).toEqual([]);
});

test("ca_25 o link de convite já usado leva a /login com a mensagem do RN-38, sem cookie", async ({
  browser,
  page,
}) => {
  const path = await linkFor("invite", uniqueEmail("enzo.paiva"));
  await continueFrom(page, path);
  await page.waitForURL("**/account/setup");

  const other = await freshPage(browser);
  try {
    await continueFrom(other.page, new URL(path, page.url()).toString());
    await other.page.waitForURL(`**/login?${LINK_EXPIRED_QUERY}`);
    await expect(formAlert(other.page)).toHaveText(authMessages.linkExpired);
    expect(await sessionCookies(other.page.context())).toEqual([]);
  } finally {
    await other.close();
  }
});

test("ca_25 o link de convite vencido leva a /login com a mensagem do RN-38, sem cookie", async ({
  page,
}) => {
  // A pilha de token curto, pelo repasse do Auth, tem o link valendo SHORT_LINK_SECONDS. A conta nasce
  // nela e não entra no cleanupAccounts, que apaga só as da pilha comum.
  const relay = authRelayFromEnv();
  await setAuthRelayMode("short-token");
  try {
    const admin = createClient(relay.url, seedTargetFromEnv().secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).auth.admin;
    const { data: link, error } = await admin.generateLink({
      type: "invite",
      email: uniqueEmail("enzo.paiva"),
    });
    if (error || !link.properties) throw error ?? new Error("O Auth não gerou o link");
    await page.waitForTimeout((SHORT_LINK_SECONDS + 1) * 1000);

    await continueFrom(page, `/auth/confirm?token_hash=${link.properties.hashed_token}&type=invite`);

    await page.waitForURL(`**/login?${LINK_EXPIRED_QUERY}`);
    await expect(formAlert(page)).toHaveText(authMessages.linkExpired);
    expect(await sessionCookies(page.context())).toEqual([]);
  } finally {
    await setAuthRelayMode("primary");
  }
});

test("ca_20 do Esqueci minha senha à senha nova: a redefinição pede só a senha, e só a nova entra", async ({
  browser,
  page,
}) => {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);
  const newPassword = `nova-${randomBytes(6).toString("hex")}`;

  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status").filter({ hasText: authMessages.resetRequested })).toBeVisible();

  await continueFrom(page, await linkFor("recovery", email));
  await page.waitForURL("**/account/setup");
  await expect(nameField(page)).toHaveCount(0);
  await passwordField(page).fill(newPassword);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("**/catalog");

  const other = await freshPage(browser);
  try {
    await signInOnScreen(other.page, email, newPassword);
    await other.page.waitForURL("**/catalog");
  } finally {
    await other.close();
  }
  const third = await freshPage(browser);
  try {
    await signInOnScreen(third.page, email, password);
    await expect(formAlert(third.page)).toHaveText(authMessages.invalidCredentials);
  } finally {
    await third.close();
  }
});

test("ca_28 /forgot-password mostra a mesma mensagem do RN-42 para e-mail com e sem conta", async ({
  browser,
}) => {
  const withAccount = uniqueEmail("beatriz.fontes");
  await createAccount(withAccount, password);

  const shown: string[] = [];
  for (const email of [withAccount, uniqueEmail("ninguem")]) {
    const { page, close } = await freshPage(browser);
    try {
      await page.goto("/forgot-password");
      await page.getByLabel("E-mail").fill(email);
      await page.getByRole("button", { name: "Enviar link" }).click();
      const status = page.getByRole("status").filter({ hasText: authMessages.resetRequested });
      await expect(status).toBeVisible();
      shown.push((await status.textContent()) ?? "");
      await expect(page.getByLabel("E-mail")).toHaveCount(0);
    } finally {
      await close();
    }
  }

  expect(shown).toEqual([authMessages.resetRequested, authMessages.resetRequested]);
});

test("ca_34 a sessão aberta com a senha não troca a senha sem a atual, nem pelo account.setup nem pela tela", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("beatriz.fontes");
  const userId = await createAccount(email, password);
  sql(`INSERT INTO "profiles" ("id", "name") VALUES ('${userId}'::uuid, 'Beatriz Fontes');`);
  await signInOnScreen(page, email, password);
  await page.waitForURL("**/catalog");

  // Com nome e sem entrada pelo link, a tela não tem o que pedir e leva ao destino do papel.
  await page.goto("/account/setup");
  expect(new URL(page.url()).pathname).toBe("/catalog");

  await expect(
    mutation(page.request, "account.setup", { password: "senha-nova-456" }),
  ).resolves.toMatchObject({
    status: 403,
    body: failure("FORBIDDEN", 403, authMessages.setupFailed),
  });
  await expect(mutation(request, "auth.signIn", { email, password: "senha-nova-456" })).resolves.toMatchObject({
    status: 401,
  });
});

// O amr do token de acesso no cookie de sessão do @supabase/ssr, inteiro ou em pedaços (.0, .1).
async function sessionToken(context: BrowserContext) {
  const pieces = (await context.cookies())
    .filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name))
    .sort((a, b) => Number(a.name.split(".")[1] ?? 0) - Number(b.name.split(".")[1] ?? 0));
  const session = JSON.parse(
    Buffer.from(pieces.map((cookie) => cookie.value).join("").replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token: string };
  const payload = JSON.parse(
    Buffer.from(session.access_token.split(".")[1] ?? "", "base64url").toString("utf8"),
  ) as { iat: number; amr: { method: string; timestamp: number }[] };
  return { iat: payload.iat, otpAt: payload.amr.find((entry) => entry.method === "otp")?.timestamp };
}

test("ca_34 renovar a sessão do link não estende o prazo: o horário da entrada no token não muda", async ({
  page,
}) => {
  // A pilha de token curto renova a sessão em segundos. A conta nasce nela, pelo repasse do Auth,
  // e não entra no cleanupAccounts, que apaga só as da pilha comum.
  const relay = authRelayFromEnv();
  await setAuthRelayMode("short-token");
  try {
    const admin = createClient(relay.url, seedTargetFromEnv().secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).auth.admin;
    const { data: link, error } = await admin.generateLink({
      type: "invite",
      email: uniqueEmail("enzo.paiva"),
    });
    if (error || !link.properties) throw error ?? new Error("O Auth não gerou o link");

    await continueFrom(page, `/auth/confirm?token_hash=${link.properties.hashed_token}&type=invite`);
    await page.waitForURL("**/account/setup");
    const before = await sessionToken(page.context());
    expect(before.otpAt).toBeGreaterThan(0);

    // O token vence, e o proxy renova a sessão no request seguinte.
    await page.waitForTimeout((SHORT_TOKEN_SECONDS + 2) * 1000);
    await page.goto("/account/setup");
    const after = await sessionToken(page.context());

    expect(after.iat).toBeGreaterThan(before.iat);
    expect(after.otpAt).toBe(before.otpAt);
  } finally {
    await setAuthRelayMode("primary");
  }
});

test("ca_35 o pedido de redefinição sem resposta do servidor mostra a mensagem do RN-60 e mantém o formulário", async ({
  page,
}) => {
  await page.route("**/api/trpc/auth.requestPasswordReset**", (route) => route.abort("failed"));

  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill(uniqueEmail("beatriz.fontes"));
  await page.getByRole("button", { name: "Enviar link" }).click();

  await expect(formAlert(page)).toHaveText(authMessages.resetFailed);
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
});
