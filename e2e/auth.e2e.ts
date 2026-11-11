import { randomUUID } from "node:crypto";

import { expect, type APIRequestContext, test } from "@playwright/test";

import { authMessages } from "../src/lib/auth-messages";
import {
  adminAuth,
  cleanupAccounts,
  createAccount,
  data,
  failure,
  mutation,
  newRequest,
  query,
  sessionCookies,
  sql,
  trackTenant,
  trackUser,
  uniqueEmail,
} from "../tests/e2e/accounts";

// As rotas do servidor da T-07 contra o Auth de verdade da pilha efêmera, onde o seed do
// globalSetup criou a default. As telas chegam nas T-09 a T-11; aqui a prova é a resposta HTTP
// e o cookie.

const password = "senha-certa-123";

test.afterAll(async () => {
  await cleanupAccounts();
});

async function signIn(request: APIRequestContext, email: string, pass = password) {
  return mutation(request, "auth.signIn", { email, password: pass });
}

test("ca_09 sem sessão, GET /api/trpc/account.me responde 401 e o corpo não traz nome, e-mail nem papel", async ({
  request,
}) => {
  const { status, body } = await query(request, "account.me");

  expect(status).toBe(401);
  expect(body).toMatchObject(failure("UNAUTHORIZED", 401));
  expect(JSON.stringify(body)).not.toMatch(/"(name|email|role)"/);
});

test("ca_05 a primeira entrada pelo auth.signIn cria o vínculo member na default; a segunda não cria outro", async ({
  request,
}) => {
  const email = uniqueEmail("enzo.paiva");
  await createAccount(email, password);

  // Sem nome, o destino é /account/setup (CA-06).
  await expect(signIn(request, email)).resolves.toEqual({
    status: 200,
    body: data({ redirectTo: "/account/setup" }),
  });
  const [cookie] = await sessionCookies(request);
  expect(cookie).toMatchObject({ httpOnly: true });

  await expect(signIn(request, email)).resolves.toMatchObject({ status: 200 });

  // Com dois vínculos, a sessão ficaria sem papel (RN-46): o papel member prova um vínculo só.
  await expect(query(request, "account.me")).resolves.toEqual({
    status: 200,
    body: data({ name: null, email, role: "member" }),
  });
});

test("ca_14 auth.signIn e auth.signOut de quem está na área A não leem nem alteram vínculo, papel ou nome da área B", async ({
  playwright,
  request,
}) => {
  const tenantA = trackTenant(randomUUID());
  const tenantB = trackTenant(randomUUID());
  const emailA = uniqueEmail("beatriz.fontes");
  const emailB = uniqueEmail("flavia.rocha");
  const userA = await createAccount(emailA, password);
  const userB = await createAccount(emailB, password);
  sql(`
    INSERT INTO "tenants" ("id", "slug", "name") VALUES
      ('${tenantA}', 'a-${tenantA}', 'Área A'), ('${tenantB}', 'b-${tenantB}', 'Área B');
    INSERT INTO "memberships" ("tenant_id", "user_id", "role") VALUES
      ('${tenantA}', '${userA}', 'member'), ('${tenantB}', '${userB}', 'operations');
    INSERT INTO "profiles" ("id", "name") VALUES
      ('${userA}', 'Beatriz Fontes'), ('${userB}', 'Flávia Rocha');
  `);
  const accountB = data({ name: "Flávia Rocha", email: emailB, role: "operations" });

  const asB = await newRequest(playwright);
  try {
    await expect(signIn(asB, emailB)).resolves.toEqual({
      status: 200,
      body: data({ redirectTo: "/operations/loans" }),
    });
    await expect(query(asB, "account.me")).resolves.toEqual({ status: 200, body: accountB });

    // Um tenantId no input é recusado na validação.
    await expect(
      mutation(request, "auth.signIn", { email: emailA, password, tenantId: tenantB }),
    ).resolves.toMatchObject({ status: 400, body: failure("BAD_REQUEST", 400) });

    await expect(signIn(request, emailA)).resolves.toEqual({
      status: 200,
      body: data({ redirectTo: "/catalog" }),
    });
    await expect(query(request, "account.me")).resolves.toEqual({
      status: 200,
      body: data({ name: "Beatriz Fontes", email: emailA, role: "member" }),
    });

    await expect(mutation(request, "auth.signOut")).resolves.toEqual({
      status: 200,
      body: data({ redirectTo: "/login" }),
    });
    expect(await sessionCookies(request)).toEqual([]);
    await expect(query(request, "account.me")).resolves.toMatchObject({ status: 401 });

    // A área B segue igual, e a sessão de Flávia continua aberta.
    await expect(query(asB, "account.me")).resolves.toEqual({ status: 200, body: accountB });
  } finally {
    await asB.dispose();
  }
});

test("ca_21 com sessão aberta, a conta bloqueada no Auth recebe UNAUTHORIZED na chamada seguinte a account.me", async ({
  request,
}) => {
  const email = uniqueEmail("caio.moreira");
  const userId = await createAccount(email, password);

  await expect(signIn(request, email)).resolves.toMatchObject({ status: 200 });
  await expect(query(request, "account.me")).resolves.toMatchObject({ status: 200 });

  const { error } = await adminAuth().updateUserById(userId, { ban_duration: "876000h" });
  expect(error).toBeNull();

  await expect(query(request, "account.me")).resolves.toMatchObject({
    status: 401,
    body: failure("UNAUTHORIZED", 401),
  });
});

test("ca_22 a quarta tentativa de entrar com o mesmo e-mail falha com a mensagem do RN-26, mesmo com a senha certa", async ({
  request,
}) => {
  const email = uniqueEmail("denise.araujo");
  await createAccount(email, password);

  for (let attempt = 1; attempt <= 3; attempt++) {
    await expect(signIn(request, email, "senha-errada")).resolves.toMatchObject({
      status: 401,
      body: failure("UNAUTHORIZED", 401, authMessages.invalidCredentials),
    });
  }

  // A senha certa não chega ao Auth: quem responde é o limite.
  await expect(signIn(request, email)).resolves.toMatchObject({
    status: 429,
    body: failure("TOO_MANY_REQUESTS", 429, authMessages.tooManyAttempts),
  });
  expect(await sessionCookies(request)).toEqual([]);
});

test("ca_22 duas tentativas de entrar e um pedido de redefinição com o mesmo e-mail esgotam o limite", async ({
  request,
}) => {
  const email = uniqueEmail("denise.araujo");
  await createAccount(email, password);

  for (let attempt = 1; attempt <= 2; attempt++) {
    await expect(signIn(request, email, "senha-errada")).resolves.toMatchObject({ status: 401 });
  }
  await expect(mutation(request, "auth.requestPasswordReset", { email })).resolves.toEqual({
    status: 200,
    body: data({ message: authMessages.resetRequested }),
  });

  const tooMany = {
    status: 429,
    body: failure("TOO_MANY_REQUESTS", 429, authMessages.tooManyAttempts),
  };
  await expect(signIn(request, email)).resolves.toMatchObject(tooMany);
  await expect(mutation(request, "auth.requestPasswordReset", { email })).resolves.toMatchObject(
    tooMany,
  );
  expect(await sessionCookies(request)).toEqual([]);
});

test("ca_28 e-mail com e sem conta recebem a mesma resposta ao pedir a redefinição", async ({
  request,
}) => {
  const withAccount = uniqueEmail("beatriz.fontes");
  const withoutAccount = uniqueEmail("ninguem");
  await createAccount(withAccount, password);

  // Status, corpo e cabeçalhos de cookie. O segundo pedido seguido com a conta que existe
  // esbarra no intervalo mínimo de envio do Auth, e mesmo assim a resposta não muda.
  async function reset(email: string) {
    const response = await request.post("/api/trpc/auth.requestPasswordReset", {
      data: { json: { email } },
    });
    return {
      status: response.status(),
      body: await response.json(),
      setCookie: response
        .headersArray()
        .filter((header) => header.name.toLowerCase() === "set-cookie"),
    };
  }

  const expected = {
    status: 200,
    body: data({ message: authMessages.resetRequested }),
    setCookie: [],
  };
  for (const email of [withAccount, withAccount, withoutAccount, withoutAccount]) {
    await expect(reset(email)).resolves.toEqual(expected);
  }
});

test("ca_30 o link do convite aberto sem clique não se gasta; o clique em Continuar grava a sessão e leva a /account/setup", async ({
  browser,
  page,
  playwright,
}) => {
  const email = uniqueEmail("enzo.paiva");
  const { data: link, error } = await adminAuth().generateLink({ type: "invite", email });
  expect(error).toBeNull();
  if (link.user) trackUser(link.user.id);
  const confirmPath = `/auth/confirm?token_hash=${link.properties?.hashed_token}&type=invite`;

  // Um leitor de e-mail abre o link sozinho: a página responde sem chamar o Auth e sem cookie.
  const scanner = await newRequest(playwright);
  try {
    const opened = await scanner.get(confirmPath, { maxRedirects: 0 });
    expect(opened.status()).toBe(200);
    expect(await sessionCookies(scanner)).toEqual([]);
  } finally {
    await scanner.dispose();
  }

  // A pessoa abre o mesmo link depois, e ele ainda vale.
  await page.goto(confirmPath);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Defina sua senha");
  expect(await sessionCookies(page.context())).toEqual([]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("**/account/setup");
  const [cookie] = await sessionCookies(page.context());
  expect(cookie).toMatchObject({ httpOnly: true });

  // CA-05: a entrada pelo convite cria o vínculo member na default.
  await expect(
    mutation(page.request, "account.setup", { password: "senha-nova-123", name: "Enzo Paiva" }),
  ).resolves.toEqual({ status: 200, body: data({ redirectTo: "/catalog" }) });
  await expect(query(page.request, "account.me")).resolves.toEqual({
    status: 200,
    body: data({ name: "Enzo Paiva", email, role: "member" }),
  });

  // CA-25: o mesmo link, já usado, leva a /login com o aviso, sem cookie.
  const other = await browser.newContext();
  try {
    const again = await other.newPage();
    await again.goto(new URL(confirmPath, page.url()).toString());
    await again.getByRole("button", { name: "Continuar" }).click();
    await again.waitForURL("**/login?error=expired-link");
    expect(await sessionCookies(other)).toEqual([]);
  } finally {
    await other.close();
  }
});

test("ca_32 sair encerra a sessão só deste navegador", async ({ playwright, request }) => {
  const email = uniqueEmail("caio.moreira");
  await createAccount(email, password);

  const elsewhere = await newRequest(playwright);
  try {
    await expect(signIn(request, email)).resolves.toMatchObject({ status: 200 });
    await expect(signIn(elsewhere, email)).resolves.toMatchObject({ status: 200 });

    await expect(mutation(request, "auth.signOut")).resolves.toEqual({
      status: 200,
      body: data({ redirectTo: "/login" }),
    });
    expect(await sessionCookies(request)).toEqual([]);
    await expect(query(request, "account.me")).resolves.toMatchObject({ status: 401 });
    await expect(query(elsewhere, "account.me")).resolves.toMatchObject({ status: 200 });
  } finally {
    await elsewhere.dispose();
  }
});
