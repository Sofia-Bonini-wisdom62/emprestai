import { afterAll, describe, expect, inject, it } from "vitest";

import { appRouter } from "@/server/api/root";
import { createCallerFactory, createContextForUser } from "@/server/api/trpc";
import { AUTH_TIMEOUT_MS } from "@/server/auth-client";
import { getUserFromCookies } from "@/server/supabase";
import { fakeSession, sessionCookie } from "../../tests/helpers/auth";
import { createTestDb } from "../../tests/helpers/db";

const unreachableAuth = { url: "http://127.0.0.1:1", key: "sb_publishable_de_teste" };

function cookiesOf(header: string) {
  const [name, ...value] = header.split("=");
  return {
    getAll: () => [{ name, value: value.join("=") }],
    setAll: () => undefined,
  };
}

describe("getUserFromCookies com o Auth fora do ar", () => {
  const db = createTestDb(inject("databaseUrl"));

  afterAll(async () => {
    await db.$disconnect();
  });

  // O caso achado na T-05: sem o limite, esta chamada levava 25,7 s.
  it(
    "az_04 cookie vencido e Auth recusando a conexão: a chamada segue sem sessão dentro do limite e o health.check responde",
    { timeout: 15_000 },
    async () => {
      const expired = sessionCookie(unreachableAuth.url, fakeSession("refresh", -60));
      const started = Date.now();

      const user = await getUserFromCookies(unreachableAuth, cookiesOf(expired));

      expect(Date.now() - started).toBeLessThan(AUTH_TIMEOUT_MS + 1_000);
      expect(user).toBeNull();
      const ctx = await createContextForUser(db, user);
      await expect(
        createCallerFactory(appRouter)(ctx).health.check(),
      ).resolves.toEqual({ status: "ok" });
    },
  );
});
