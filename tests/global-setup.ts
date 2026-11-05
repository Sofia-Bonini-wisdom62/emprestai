import { execFileSync } from "node:child_process";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

// A mesma tag do compose.yaml: dev e testes rodam a mesma imagem.
const IMAGE = "supabase/postgres:17.11.0.018";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const PRISMA_CLI = "node_modules/prisma/build/index.js";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  // supabase_admin é o superusuário da imagem. Trocar esse nome quebra a
  // inicialização dela, que cria os papéis anon, authenticated e postgres.
  const container = await new PostgreSqlContainer(IMAGE)
    .withUsername("supabase_admin")
    .withDatabase("postgres")
    .start();

  // Os testes conectam como postgres, que é o dono das tabelas, como no dev.
  const url = new URL(container.getConnectionUri());
  url.username = "postgres";

  if (!LOCAL_HOSTS.includes(url.hostname)) {
    await container.stop();
    throw new Error(`Testes só rodam em banco local, não em ${url.hostname}`);
  }

  console.log(`Postgres do Testcontainers em ${url.host}`);

  const databaseUrl = url.toString();
  execFileSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: "inherit",
  });

  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await container.stop();
  };
}
