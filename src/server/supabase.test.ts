import { NextRequest } from "next/server";
import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { appRouter } from "@/server/api/root";
import { createCallerFactory, createContextForUser } from "@/server/api/trpc";
import type { AuthConfig } from "@/server/auth-client";
import { handleSession } from "@/server/session-proxy";
import { getUserFromCookies } from "@/server/supabase";
import { fakeSession, sessionCookie, startFakeAuth } from "../../tests/helpers/auth";
import { createTestDb } from "../../tests/helpers/db";

const KEY = "sb_publishable_de_teste";
const db = createTestDb(inject("databaseUrl"));
const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

afterAll(async () => {
  await db.$disconnect();
});

// O caminho do GET /api/trpc/health.check, sem subir HTTP: o proxy vai ao Auth
// com getClaims(), e depois o createContext vai de novo com getUser(), lendo os
// cookies que o proxy repassou à rota.
async function healthCheckThroughProxy(config: AuthConfig, cookie: string) {
  const request = new NextRequest("http://localhost:3000/api/trpc/health.check", {
    headers: { cookie },
  });
  const proxied = await handleSession(request, config);
  const user = await getUserFromCookies(config, {
    getAll: () => request.cookies.getAll(),
    setAll: () => undefined,
  });
  const ctx = await createContextForUser(db, user);
  const result = await createCallerFactory(appRouter)(ctx).health.check();

  return { proxied, user, result };
}

// CA-29: o proxy e o createContext vão ao Auth um depois do outro, cada um com
// o limite de 3 s do RN-48. Sem o limite, esta chamada levava 25,7 s (T-05).
describe("health.check com o banco de pé e o Auth fora do ar", () => {
  const limit = 7_000;

  it(
    "ca_29 cookie vencido e Auth recusando a conexão: o health.check responde ok em menos de 7 s",
    { timeout: 20_000 },
    async () => {
      const config = { url: "http://127.0.0.1:1", key: KEY };
      const expired = sessionCookie(config.url, fakeSession("refresh", -60));
      const started = Date.now();

      const { proxied, user, result } = await healthCheckThroughProxy(config, expired);

      expect(Date.now() - started).toBeLessThan(limit);
      expect(proxied.headers.get("x-middleware-next")).toBe("1");
      expect(user).toBeNull();
      expect(result).toEqual({ status: "ok" });
    },
  );

  it(
    "ca_29 cookie vencido e Auth que aceita a conexão e não responde: o health.check responde ok em menos de 7 s",
    { timeout: 20_000 },
    async () => {
      const silent = await startFakeAuth(() => undefined);
      closers.push(silent.close);
      const config = { url: silent.url, key: KEY };
      const expired = sessionCookie(config.url, fakeSession("refresh", -60));
      const started = Date.now();

      const { proxied, user, result } = await healthCheckThroughProxy(config, expired);

      expect(Date.now() - started).toBeLessThan(limit);
      expect(proxied.headers.get("x-middleware-next")).toBe("1");
      expect(user).toBeNull();
      expect(result).toEqual({ status: "ok" });
    },
  );
});
