import { defineConfig, devices } from "@playwright/test";

// Os casos do app como no Preview (e2e/preview/), sem as variáveis do Supabase (CA-23). Roda
// depois do playwright.config.ts, no pnpm test:e2e, com um build e um app próprios.
export default defineConfig({
  testDir: "e2e/preview",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./tests/e2e/preview-setup.ts",
  // Pasta própria: a rodada principal, que vem antes, guarda as capturas em test-results/.
  outputDir: "test-results/preview",
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
