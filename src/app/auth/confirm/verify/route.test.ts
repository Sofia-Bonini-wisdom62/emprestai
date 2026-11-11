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

// O link de verdade, gerado pelo Auth, se prova no E2E (CA-30). Aqui ficam os
// caminhos que não dependem do Auth.
describe("POST /auth/confirm/verify", () => {
  it.each([
    ["sem token_hash", { type: "invite" }],
    ["com type que não é convite nem redefinição", { token_hash: "abc", type: "signup" }],
    ["sem Auth, como no Preview", { token_hash: "abc", type: "recovery" }],
  ])("ca_25 %s, leva a /login com o aviso do link vencido e sem cookie", async (_, fields) => {
    expectLinkExpired(await verify(fields));
  });

  it.each([
    ["de outra origem", "https://outro-site.example"],
    ["sem cabeçalho Origin", null],
  ])("ca_30 o envio %s é recusado sem chamar o Auth", async (_, from) => {
    expectLinkExpired(
      await verify({ token_hash: "abc", type: "invite" }, from),
    );
  });
});
