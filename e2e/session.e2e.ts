import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { setAuthRelayMode } from "../tests/e2e/auth-relay";

// O proxy.ts com uma sessão de verdade: a renovação do token vencido (CA-17) e o Auth fora do ar
// (CA-29, RN-48). A conta de Beatriz Fontes nasce na pilha de token curto, pelo repasse do Auth
// (tests/e2e/auth-relay.ts). As telas /catalog e /login ainda não existem (T-09 e T-11): o que se
// prova aqui é o caminho do proxy, que acontece antes da rota.

type Cookie = { name: string; value: string };

const EMAIL = "beatriz.fontes@example.com";

function fromEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta ${name}: o globalSetup do E2E não rodou`);
  }
  return value;
}

// O cookie da sessão, gravado pelo @supabase/ssr em um pedaço ou em vários (.0, .1, ...).
function readSession(cookies: Cookie[]) {
  const pieces = cookies
    .filter((cookie) => /^sb-[^.]+-auth-token(\.\d+)?$/.test(cookie.name))
    .sort((a, b) => Number(a.name.split(".")[1] ?? 0) - Number(b.name.split(".")[1] ?? 0));
  const encoded = pieces.map((cookie) => cookie.value).join("");

  return JSON.parse(Buffer.from(encoded.replace(/^base64-/, ""), "base64url").toString("utf8")) as {
    refresh_token: string;
    expires_at: number;
  };
}

let expiredSession: Cookie[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  const relayUrl = fromEnv("E2E_AUTH_RELAY_URL");
  const password = randomBytes(18).toString("base64url");

  await setAuthRelayMode("short-token");
  try {
    // A chave secreta da pilha do E2E, só para criar a conta de teste (rules/secrets.md).
    const admin = createClient(relayUrl, fromEnv("E2E_SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const created = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    if (created.error) {
      throw created.error;
    }

    // Entra como o servidor entra, para o cookie sair no formato que o app grava.
    let jar: Cookie[] = [];
    const client = createServerClient(relayUrl, fromEnv("E2E_SUPABASE_PUBLISHABLE_KEY"), {
      cookies: {
        getAll: () => jar,
        setAll: (cookiesToSet) => {
          const names = new Set(cookiesToSet.map((cookie) => cookie.name));
          jar = [
            ...jar.filter((cookie) => !names.has(cookie.name)),
            ...cookiesToSet.filter((cookie) => cookie.value).map(({ name, value }) => ({ name, value })),
          ];
        },
      },
    });
    const signedIn = await client.auth.signInWithPassword({ email: EMAIL, password });
    if (signedIn.error || !signedIn.data.session) {
      throw signedIn.error ?? new Error("Sem sessão depois de entrar");
    }
    await expect.poll(() => jar.length).toBeGreaterThan(0);
    expiredSession = jar;

    // Espera o token de acesso vencer de verdade, e não só entrar na margem do supabase-js.
    const expiresAtMs = (signedIn.data.session.expires_at ?? 0) * 1000;
    await new Promise((resolveWait) => setTimeout(resolveWait, Math.max(expiresAtMs - Date.now(), 0) + 1_000));
  } finally {
    await setAuthRelayMode("primary");
  }
});

test.afterEach(async () => {
  await setAuthRelayMode("primary");
});

test("ca_17 token de acesso vencido e refresh válido: o proxy renova o cookie e ela continua em /catalog", async ({
  page,
  context,
  baseURL,
}) => {
  await setAuthRelayMode("short-token");
  const before = readSession(expiredSession);
  expect(before.expires_at * 1000).toBeLessThan(Date.now());
  await context.addCookies(
    expiredSession.map((cookie) => ({ ...cookie, url: baseURL ?? "", httpOnly: true, sameSite: "Lax" as const })),
  );

  const response = await page.goto("/catalog");

  expect(response?.request().redirectedFrom()).toBeNull();
  expect(new URL(page.url()).pathname).toBe("/catalog");
  const sessionCookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("sb-"));
  expect(sessionCookies.length).toBeGreaterThan(0);
  expect(sessionCookies.every((cookie) => cookie.httpOnly)).toBe(true);
  const renewed = readSession(sessionCookies);
  expect(renewed.refresh_token).not.toBe(before.refresh_token);
  expect(renewed.expires_at).toBeGreaterThan(before.expires_at);
});

const outages = [
  ["refuse", "recusando a conexão"],
  ["silent", "aceitando a conexão sem responder"],
] as const;

for (const [mode, label] of outages) {
  test(`ca_29 Auth ${label} e token vencido: GET /catalog leva a /login em menos de 4 s`, async ({
    request,
  }) => {
    await setAuthRelayMode(mode);
    const cookie = expiredSession.map(({ name, value }) => `${name}=${value}`).join("; ");
    const started = Date.now();

    const response = await request.get("/catalog", { headers: { cookie }, maxRedirects: 0 });

    expect(Date.now() - started).toBeLessThan(4_000);
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location ?? "", "http://app").pathname).toBe("/login");
  });

  test(`ca_29 Auth ${label} e token vencido: o health.check responde ok em menos de 7 s`, async ({
    request,
  }) => {
    await setAuthRelayMode(mode);
    const cookie = expiredSession.map(({ name, value }) => `${name}=${value}`).join("; ");
    const started = Date.now();

    const response = await request.get("/api/trpc/health.check", { headers: { cookie } });

    expect(Date.now() - started).toBeLessThan(7_000);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ result: { data: { json: { status: "ok" } } } });
  });
}
