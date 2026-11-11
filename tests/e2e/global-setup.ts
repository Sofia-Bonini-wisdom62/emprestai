import { randomBytes } from "node:crypto";

import { type App, startApp } from "./app";
import { runSeed, type SeedTarget } from "./seed";
import { freePort, startAuthStack } from "./stack";

// Sobe a pilha efêmera, roda o seed nela e sobe o app de produção apontado para ela; o teardown
// derruba os dois.
export default async function globalSetup() {
  const port = await freePort();
  const siteUrl = `http://127.0.0.1:${port}`;
  const stack = await startAuthStack({ siteUrl });

  // A senha da conta do seed nasce e morre com a rodada.
  const seedTarget: SeedTarget = {
    databaseUrl: stack.databaseUrl,
    supabaseUrl: stack.gatewayUrl,
    secretKey: stack.secretKey,
    password: randomBytes(18).toString("base64url"),
  };

  let app: App;
  try {
    runSeed(seedTarget);
    app = await startApp({
      port,
      env: {
        DATABASE_URL: stack.databaseUrl,
        NEXT_PUBLIC_SUPABASE_URL: stack.gatewayUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        APP_URL: siteUrl,
        // Os valores do CA-22: três tentativas por e-mail em 60 s. Cada caso usa um e-mail
        // próprio. Todo request vem de 127.0.0.1, e por isso o limite por IP fica alto: o
        // limite por IP se prova no pnpm test.
        RATE_LIMIT_USER_MAX: "3",
        RATE_LIMIT_USER_WINDOW_SECONDS: "60",
        RATE_LIMIT_IP_MAX: "1000",
        RATE_LIMIT_IP_WINDOW_SECONDS: "60",
      },
    });
  } catch (error) {
    await stack.stop();
    throw error;
  }

  // Os workers do Playwright herdam este ambiente: o baseURL (playwright.config.ts) e a pilha,
  // para os casos que rodam o seed de novo, entram com a conta dele ou criam e bloqueiam contas
  // de teste (rules/secrets.md).
  process.env.E2E_BASE_URL = app.baseURL;
  process.env.E2E_DATABASE_URL = seedTarget.databaseUrl;
  process.env.E2E_SUPABASE_URL = seedTarget.supabaseUrl;
  process.env.E2E_SUPABASE_SECRET_KEY = seedTarget.secretKey;
  process.env.E2E_SEED_PASSWORD = seedTarget.password;

  return async () => {
    try {
      await app.stop();
    } finally {
      await stack.stop();
    }
  };
}
