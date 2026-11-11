import { startApp } from "./app";
import { freePort } from "./stack";

// O app como no Preview (ADR-004; RN-34): sem as variáveis do Supabase e com um DATABASE_URL que
// não aponta para banco nenhum. Sem pilha de contêineres. O build vai para o mesmo .next do E2E
// principal, por isso esta rodada vem depois daquela, no pnpm test:e2e.
export default async function previewSetup() {
  const port = await freePort();
  const app = await startApp({
    port,
    env: {
      DATABASE_URL: "postgresql://127.0.0.1:1/x",
      APP_URL: `http://127.0.0.1:${port}`,
    },
  });

  process.env.E2E_BASE_URL = app.baseURL;

  return async () => {
    await app.stop();
  };
}
