import { expect, test } from "@playwright/test";

// A metade do CA-08 que o proxy.ts traz (T-08): sem sessão, as telas do produto
// levam a /login. A raiz e o health.check sem sessão estão em landing.e2e.ts.
// As telas /catalog, /operations/loans e /login ainda não existem (T-09 e T-11):
// o que se prova aqui é o redirecionamento, que acontece antes da rota.

for (const path of ["/catalog", "/operations/loans"]) {
  test(`ca_08 sem sessão, GET ${path} responde com redirecionamento para /login`, async ({
    request,
  }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location ?? "", "http://app").pathname).toBe("/login");
    // O corpo do redirecionamento do Next é só o destino: nada da tela pedida vaza.
    expect(await response.text()).toBe("/login");
  });

  test(`ca_08 sem sessão, abrir ${path} no navegador termina em /login`, async ({ page }) => {
    await page.goto(path);

    expect(new URL(page.url()).pathname).toBe("/login");
    expect(await page.context().cookies()).toEqual([]);
  });
}
