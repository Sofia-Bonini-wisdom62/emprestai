import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { AUTH_TIMEOUT_MS, type AuthConfig } from "@/server/auth-client";
import { handleSession } from "@/server/session-proxy";
import {
  decodeSessionCookie,
  fakeSession,
  fakeJwks,
  readBody,
  sendJson,
  sessionCookie,
  sessionCookieName,
  startFakeAuth,
} from "../../tests/helpers/auth";

const KEY = "sb_publishable_de_teste";
const unreachableAuth: AuthConfig = { url: "http://127.0.0.1:1", key: KEY };
const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function expectRedirectToLogin(response: Response) {
  expect(response.status).toBe(307);
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
}

// NextResponse.next(): o request segue para a rota, sem redirecionar.
function expectPassThrough(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("location")).toBeNull();
}

describe("handleSession sem sessão", () => {
  it.each(["/catalog", "/operations/loans"])("ca_08 %s leva a /login", async (path) => {
    expectRedirectToLogin(await handleSession(request(path), unreachableAuth));
  });

  // RN-49: fora da lista pública, até o que não é tela do produto leva a /login.
  it.each(["/account/setup", "/rota-que-nao-existe"])(
    "ca_08 %s, fora da lista pública, leva a /login (RN-49)",
    async (path) => {
      expectRedirectToLogin(await handleSession(request(path), unreachableAuth));
    },
  );

  it.each([
    "/",
    "/api/trpc/health.check",
    "/login",
    "/forgot-password",
    "/auth/confirm",
    "/auth/confirm/verify",
  ])(
    "ca_08 %s continua abrindo",
    async (path) => {
      expectPassThrough(await handleSession(request(path), unreachableAuth));
    },
  );

  it("ca_08 sem as variáveis do Supabase, como no Preview, /catalog leva a /login e / abre", async () => {
    expectRedirectToLogin(await handleSession(request("/catalog"), null));
    expectPassThrough(await handleSession(request("/"), null));
  });
});

describe("handleSession com sessão", () => {
  async function startAuth(onRefresh: (refreshToken: string) => [number, object]) {
    const refreshTokens: string[] = [];
    const paths: string[] = [];
    const auth = await startFakeAuth(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://auth");
      paths.push(`${req.method} ${url.pathname}`);
      if (req.method === "POST" && url.pathname === "/auth/v1/token") {
        const { refresh_token: refreshToken } = JSON.parse(await readBody(req));
        refreshTokens.push(refreshToken);
        const [status, body] = onRefresh(refreshToken);
        return sendJson(res, status, body);
      }
      if (req.method === "GET" && url.pathname === "/auth/v1/.well-known/jwks.json") {
        return sendJson(res, 200, fakeJwks);
      }
      sendJson(res, 404, {});
    });
    closers.push(auth.close);
    return { config: { url: auth.url, key: KEY }, refreshTokens, paths };
  }

  it("ca_17 token de acesso vencido e refresh válido: renova o cookie e segue para /catalog", async () => {
    const { config, refreshTokens, paths } = await startAuth(() => [
      200,
      fakeSession("refresh-novo", 3600),
    ]);
    const expired = sessionCookie(config.url, fakeSession("refresh-antigo", -60));

    const response = await handleSession(request("/catalog", expired), config);

    expectPassThrough(response);
    expect(refreshTokens).toEqual(["refresh-antigo"]);
    // O token renovado foi conferido pelo JWKS, em ES256, como no dev e na produção.
    expect(paths).toEqual([
      "POST /auth/v1/token",
      "GET /auth/v1/.well-known/jwks.json",
    ]);
    const renewed = response.cookies.get(sessionCookieName(config.url));
    expect(decodeSessionCookie(renewed?.value ?? "")).toMatchObject({
      refresh_token: "refresh-novo",
    });
    expect(response.headers.getSetCookie().join("\n")).toMatch(/HttpOnly/i);
    // A rota recebe o token novo e não renova de novo com o refresh já usado.
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      renewed?.value,
    );
    expect(response.headers.get("cache-control")).toMatch(/no-store/);
  });

  it("ca_08 refresh recusado pelo Auth: /catalog leva a /login e o cookie da sessão é apagado", async () => {
    const { config } = await startAuth(() => [
      400,
      { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" },
    ]);
    const expired = sessionCookie(config.url, fakeSession("refresh-revogado", -60));

    const response = await handleSession(request("/catalog", expired), config);

    expectRedirectToLogin(response);
    const cleared = response.cookies.get(sessionCookieName(config.url));
    expect(cleared?.value ?? "").toBe("");
  });
});

describe("handleSession com o Auth fora do ar", () => {
  // CA-29: só o proxy vai ao Auth, uma vez, com o limite do RN-48.
  const limit = 4_000;

  it("ca_29 o limite do RN-48 é de 3 s", () => {
    expect(AUTH_TIMEOUT_MS).toBe(3_000);
  });

  it(
    "ca_29 cookie vencido e Auth recusando a conexão: /catalog leva a /login em menos de 4 s",
    { timeout: 15_000 },
    async () => {
      const expired = sessionCookie(unreachableAuth.url, fakeSession("refresh", -60));
      const started = Date.now();

      const response = await handleSession(request("/catalog", expired), unreachableAuth);

      expect(Date.now() - started).toBeLessThan(limit);
      expectRedirectToLogin(response);
    },
  );

  it(
    "ca_29 cookie vencido e Auth que aceita a conexão e não responde: /catalog leva a /login em menos de 4 s",
    { timeout: 15_000 },
    async () => {
      const silent = await startFakeAuth(() => undefined);
      closers.push(silent.close);
      const config = { url: silent.url, key: KEY };
      const expired = sessionCookie(config.url, fakeSession("refresh", -60));
      const started = Date.now();

      const response = await handleSession(request("/catalog", expired), config);

      expect(Date.now() - started).toBeLessThan(limit);
      expectRedirectToLogin(response);
    },
  );
});
