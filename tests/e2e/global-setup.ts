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
      },
    });
  } catch (error) {
    await stack.stop();
    throw error;
  }

  // Os workers do Playwright herdam este ambiente: o baseURL (playwright.config.ts) e a pilha,
  // para os casos que rodam o seed de novo ou entram com a conta dele.
  process.env.E2E_BASE_URL = app.baseURL;
  process.env.E2E_DATABASE_URL = seedTarget.databaseUrl;
  process.env.E2E_SUPABASE_URL = seedTarget.supabaseUrl;
  process.env.E2E_SUPABASE_SECRET_KEY = seedTarget.secretKey;
  process.env.E2E_SEED_PASSWORD = seedTarget.password;

  return async () => {
    await app.stop();
    await stack.stop();
  };
}
