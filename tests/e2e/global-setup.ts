import { randomBytes } from "node:crypto";

import { type App, startApp } from "./app";
import { generateAuthKeys } from "./auth-keys";
import { type AuthRelay, startAuthRelay } from "./auth-relay";
import { runSeed, type SeedTarget } from "./seed";
import { type AuthStack, freePort, startAuthStack } from "./stack";

// Validade do token de acesso na pilha de token curto (CA-17). O supabase-js já trata como vencido
// o token com menos de 90 s de vida; com 5 s, o caso espera o token vencer de verdade.
export const SHORT_TOKEN_SECONDS = 5;

// Sobe as duas pilhas efêmeras, a comum e a de token curto, com as mesmas chaves; roda o seed na
// comum; e sobe o app de produção apontado para o repasse do Auth, que começa na pilha comum. O
// teardown derruba tudo.
export default async function globalSetup() {
  const port = await freePort();
  const siteUrl = `http://127.0.0.1:${port}`;
  const keys = generateAuthKeys();

  const started = await Promise.allSettled([
    startAuthStack({ siteUrl, keys }),
    startAuthStack({ siteUrl, keys, authEnv: { GOTRUE_JWT_EXP: String(SHORT_TOKEN_SECONDS) } }),
  ]);
  const stacks = started.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const stopStacks = () => Promise.all(stacks.map((item) => item.stop()));
  const failed = started.find((result) => result.status === "rejected");
  if (failed) {
    await stopStacks();
    throw failed.reason;
  }
  const [stack, shortTokenStack] = stacks as [AuthStack, AuthStack];

  // A senha da conta do seed nasce e morre com a rodada.
  const seedTarget: SeedTarget = {
    databaseUrl: stack.databaseUrl,
    supabaseUrl: stack.gatewayUrl,
    secretKey: stack.secretKey,
    password: randomBytes(18).toString("base64url"),
  };

  let relay: AuthRelay | undefined;
  let app: App;
  try {
    runSeed(seedTarget);
    relay = await startAuthRelay({
      primary: stack.gatewayUrl,
      "short-token": shortTokenStack.gatewayUrl,
    });
    app = await startApp({
      port,
      env: {
        DATABASE_URL: stack.databaseUrl,
        NEXT_PUBLIC_SUPABASE_URL: relay.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        APP_URL: siteUrl,
      },
    });
  } catch (error) {
    await relay?.stop();
    await stopStacks();
    throw error;
  }

  // Os workers do Playwright herdam este ambiente: o baseURL (playwright.config.ts) e a pilha,
  // para os casos que rodam o seed de novo ou entram com a conta dele, e o repasse do Auth, para
  // os casos que trocam de pilha ou tiram o Auth do ar.
  process.env.E2E_BASE_URL = app.baseURL;
  process.env.E2E_DATABASE_URL = seedTarget.databaseUrl;
  process.env.E2E_SUPABASE_URL = seedTarget.supabaseUrl;
  process.env.E2E_SUPABASE_SECRET_KEY = seedTarget.secretKey;
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY = stack.publishableKey;
  process.env.E2E_SEED_PASSWORD = seedTarget.password;
  process.env.E2E_AUTH_RELAY_URL = relay.url;
  process.env.E2E_AUTH_RELAY_CONTROL_URL = relay.controlUrl;

  const startedRelay = relay;
  return async () => {
    try {
      await app.stop();
    } finally {
      await startedRelay.stop();
      await stopStacks();
    }
  };
}
