import { describe, expect, it } from "vitest";

import { GET } from "./route";

// Pela rota HTTP de verdade, com o createContext da aplicação. Sem as variáveis
// do Supabase, como nos testes, não há sessão (RN-34).
describe("GET /api/trpc/account.me", () => {
  it("ca_09 sem sessão, responde 401 e o corpo não traz nome, e-mail nem papel", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/trpc/account.me"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      error: { json: { data: { code: "UNAUTHORIZED", httpStatus: 401 } } },
    });
    expect(body).not.toHaveProperty("result");
    expect(JSON.stringify(body)).not.toMatch(/"(name|email|role)"/);
  });
});
