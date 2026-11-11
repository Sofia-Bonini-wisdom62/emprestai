import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

const origin = "http://localhost:3000";

function verify(fields: Record<string, string>, from: string | null = origin) {
  const headers = new Headers({ host: "localhost:3000" });
  if (from) headers.set("origin", from);

  return POST(
    new NextRequest(`${origin}/auth/confirm/verify`, {
      method: "POST",
      headers,
      body: new URLSearchParams(fields),
    }),
  );
}

function expectLinkExpired(response: Response) {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/login?error=expired-link");
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
}

// O link de verdade, gerado pelo Auth, e a recusa do envio de outra origem ou
// sem Origin se provam no E2E (CA-30): só com o Auth de verdade dá para ver que
// o link recusado continua valendo. Aqui ficam os caminhos sem Auth.
describe("POST /auth/confirm/verify", () => {
  it.each([
    ["sem token_hash", { type: "invite" }],
    ["com type que não é convite nem redefinição", { token_hash: "abc", type: "signup" }],
    ["sem Auth, como no Preview", { token_hash: "abc", type: "recovery" }],
  ])("ca_25 %s, leva a /login com o aviso do link vencido e sem cookie", async (_, fields) => {
    expectLinkExpired(await verify(fields));
  });
});
