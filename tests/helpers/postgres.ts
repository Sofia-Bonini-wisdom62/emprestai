import { execFileSync } from "node:child_process";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedNetwork } from "testcontainers";

import { IMAGES } from "../images";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const PRISMA_CLI = "node_modules/prisma/build/index.js";

type StartPostgresOptions = {
  // Rede e nome pelos quais o Auth da pilha do E2E chega ao banco.
  network?: { network: StartedNetwork; alias: string };
  // Scripts SQL de inicialização da imagem, que só rodam com o volume vazio.
  initScripts?: { source: string; name: string }[];
};

export type StartedPostgres = {
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
};

// Postgres efêmero da imagem do dev, com as migrations do Prisma aplicadas do zero.
export async function startPostgres(options: StartPostgresOptions = {}): Promise<StartedPostgres> {
  // supabase_admin é o superusuário da imagem. Trocar esse nome quebra a
  // inicialização dela, que cria os papéis anon, authenticated e postgres.
  let builder = new PostgreSqlContainer(IMAGES.postgres)
    .withUsername("supabase_admin")
    .withDatabase("postgres");

  if (options.network) {
    builder = builder
      .withNetwork(options.network.network)
      .withNetworkAliases(options.network.alias);
  }

  if (options.initScripts?.length) {
    builder = builder.withCopyFilesToContainer(
      options.initScripts.map((script) => ({
        source: script.source,
        target: `/docker-entrypoint-initdb.d/init-scripts/${script.name}`,
      })),
    );
  }

  const container = await builder.start();

  // Os testes conectam como postgres, que é o dono das tabelas, como no dev.
  const url = new URL(container.getConnectionUri());
  url.username = "postgres";

  if (!LOCAL_HOSTS.includes(url.hostname)) {
    await container.stop();
    throw new Error(`Testes só rodam em banco local, não em ${url.hostname}`);
  }

  console.log(`Postgres do Testcontainers em ${url.host}`);

  const databaseUrl = url.toString();
  try {
    execFileSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
      stdio: "inherit",
    });
  } catch (error) {
    await container.stop();
    throw error;
  }

  return { container, databaseUrl };
}
