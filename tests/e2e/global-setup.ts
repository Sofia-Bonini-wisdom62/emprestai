import { type App, startApp } from "./app";
import { freePort, startAuthStack } from "./stack";

// Sobe a pilha efêmera e o app de produção apontado para ela; o teardown derruba os dois.
export default async function globalSetup() {
  const port = await freePort();
  const siteUrl = `http://127.0.0.1:${port}`;
  const stack = await startAuthStack({ siteUrl });

  let app: App;
  try {
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

  // Os workers do Playwright herdam este ambiente e leem o baseURL dele (playwright.config.ts).
  process.env.E2E_BASE_URL = app.baseURL;

  return async () => {
    try {
      await app.stop();
    } finally {
      await stack.stop();
    }
  };
}
