import { defineConfig, devices } from "@playwright/test";

// E2E de interface (ADR-001, 2.8; ADR-003, 2.8) contra a pilha efêmera de tests/e2e/ (ADR-006).
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  // Os casos do app como no Preview rodam no playwright.preview.config.ts, com outro build.
  testIgnore: "preview/**",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Uma pilha e um app para a rodada inteira: os casos rodam em fila, sem disputar o mesmo banco.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: {
    // O globalSetup grava o endereço antes de os workers carregarem este arquivo.
    baseURL: process.env.E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
