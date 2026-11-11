import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "./route";

function confirm(query: string) {
  return GET(new NextRequest(`http://localhost:3000/auth/confirm${query}`));
}

// O link de verdade, gerado pelo Auth, se prova no E2E da T-10 (CA-07, CA-25).
// Aqui fica o caminho que não depende do Auth: link que não vale vai a /login
// com o aviso do RN-38, sem cookie.
describe("GET /auth/confirm", () => {
  it.each([
    ["sem token_hash", "?type=invite"],
    ["com type que não é convite nem redefinição", "?token_hash=abc&type=signup"],
    ["sem Auth, como no Preview", "?token_hash=abc&type=recovery"],
  ])("ca_25 %s, leva a /login com o aviso do link vencido e sem cookie", async (_, query) => {
    const response = await confirm(query);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=expired-link",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
