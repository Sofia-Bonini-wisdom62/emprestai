import { expect, test } from "@playwright/test";

// A parte do CA-08 que já existe: a raiz e o health.check continuam públicos, sem sessão.
// O redirecionamento de /catalog e /operations/loans para /login chega com o proxy.ts (T-08).

test("ca_08 sem sessão, a raiz abre a landing e mostra o banco ok", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Saiba o que está disponível e com quem está cada item.",
  );
  await expect(page.getByRole("status")).toHaveText("Banco de dados ok");
  expect(await page.context().cookies()).toEqual([]);
});

test("ca_08 sem sessão, GET /api/trpc/health.check responde ok", async ({ request }) => {
  const response = await request.get("/api/trpc/health.check");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ result: { data: { json: { status: "ok" } } } });
});
