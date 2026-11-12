import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";

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
const healthCheck = async () =>
  createCallerFactory(appRouter)(await createContextForUser(db, null)).health.check();

// "Dado o banco de pé" (CA-29): a primeira consulta do arquivo inicializa o client
// de teste, que carrega o compilador de consultas do Prisma e abre a conexão com o
// contêiner. No Windows, o primeiro health.check levou 1,8 s, e os seguintes de 18
// a 54 ms. Esse tempo não é do Auth, que é o que o CA-29 mede, e fica fora do relógio.
beforeAll(async () => {
  await healthCheck();
});

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

afterAll(async () => {
  await db.$disconnect();
});

// O caminho do GET /api/trpc/health.check, sem subir HTTP: o proxy vai ao Auth
// com getClaims(), e depois o createContext vai de novo com getUser(), lendo os
// cookies que o proxy repassou à rota. O tempo sai por trecho: as duas idas ao
// Auth, cada uma com o limite do RN-48, e o resto, que é o banco.
async function healthCheckThroughProxy(config: AuthConfig, cookie: string) {
  const request = new NextRequest("http://localhost:3000/api/trpc/health.check", {
    headers: { cookie },
  });
  const started = performance.now();
  const proxied = await handleSession(request, config);
  const afterProxy = performance.now();
  const user = await getUserFromCookies(config, {
    getAll: () => request.cookies.getAll(),
    setAll: () => undefined,
  });
  const afterGetUser = performance.now();
  const ctx = await createContextForUser(db, user);
  const result = await createCallerFactory(appRouter)(ctx).health.check();
  const finished = performance.now();

  const elapsed = {
    proxy: Math.round(afterProxy - started),
    getUser: Math.round(afterGetUser - afterProxy),
    rest: Math.round(finished - afterGetUser),
    total: Math.round(finished - started),
  };
  return { proxied, user, result, elapsed };
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

      const { proxied, user, result, elapsed } = await healthCheckThroughProxy(config, expired);

      expect(elapsed.total, `tempo por trecho, em ms: ${JSON.stringify(elapsed)}`).toBeLessThan(limit);
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

      const { proxied, user, result, elapsed } = await healthCheckThroughProxy(config, expired);

      expect(elapsed.total, `tempo por trecho, em ms: ${JSON.stringify(elapsed)}`).toBeLessThan(limit);
      expect(proxied.headers.get("x-middleware-next")).toBe("1");
      expect(user).toBeNull();
      expect(result).toEqual({ status: "ok" });
    },
  );
});
