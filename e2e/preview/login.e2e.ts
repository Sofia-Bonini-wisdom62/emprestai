import { expect, test } from "@playwright/test";

import { authMessages } from "../../src/lib/auth-messages";

// Roda pelo playwright.preview.config.ts, com o app buildado como no Preview (RN-34; ADR-004).

test("ca_23 sem as variáveis do Supabase, /login abre e entrar mostra a mensagem do RN-25, sem erro 500", async ({
  page,
}) => {
  const statuses: number[] = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/api/trpc/")) statuses.push(response.status());
  });

  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);

  await page.getByLabel("E-mail").fill("beatriz.fontes@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-certa-123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText(authMessages.invalidCredentials);
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(statuses.length).toBeGreaterThan(0);
  expect(statuses.every((status) => status < 500)).toBe(true);
});
