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

  // Os workers do Playwright herdam este ambiente e leem o baseURL dele (playwright.config.ts).
  // O banco e a chave secreta são os da pilha efêmera, para os casos criarem e bloquearem
  // contas de teste (rules/secrets.md).
  process.env.E2E_BASE_URL = app.baseURL;
  process.env.E2E_DATABASE_URL = stack.databaseUrl;
  process.env.E2E_AUTH_URL = stack.gatewayUrl;
  process.env.E2E_SECRET_KEY = stack.secretKey;

  return async () => {
    try {
      await app.stop();
    } finally {
      await stack.stop();
    }
  };
}
