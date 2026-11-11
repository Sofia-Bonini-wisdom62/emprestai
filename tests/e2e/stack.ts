import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import {
  GenericContainer,
  Network,
  type StartedNetwork,
  type StartedTestContainer,
  Wait,
} from "testcontainers";

import { IMAGES } from "../images";
import { startPostgres } from "../helpers/postgres";
import { generateAuthKeys } from "./auth-keys";

// Caminhos a partir da raiz do repositório, de onde o pnpm roda o Playwright.
const fromRoot = (path: string) => resolve(process.cwd(), path);
const readEnvFile = (path: string) =>
  parseEnv(readFileSync(fromRoot(path), "utf8")) as Record<string, string>;

const HEALTH_CHECK = { interval: 1_000, timeout: 5_000, retries: 60 };

export type AuthStack = {
  databaseUrl: string;
  gatewayUrl: string;
  publishableKey: string;
  // Só para o setup do E2E criar, convidar e bloquear contas de teste (rules/secrets.md).
  secretKey: string;
  stop: () => Promise<void>;
};

type AuthStackOptions = {
  // Endereço do app que o E2E sobe: vira a Site URL e a lista de redirects do Auth.
  siteUrl: string;
  // Troca valores do docker/auth/auth.env, como a validade do token numa suíte própria.
  authEnv?: Record<string, string>;
};

// A pilha efêmera do E2E (ADR-006, seção 2): o Postgres, o Auth e o gateway do dev, na mesma rede,
// com a configuração de docker/ e chaves novas. Nunca o banco de dev.
export async function startAuthStack(options: AuthStackOptions): Promise<AuthStack> {
  const keys = generateAuthKeys();
  const started: { stop: () => Promise<unknown> }[] = [];
  const stopAll = async () => {
    for (const item of started.reverse()) {
      await item.stop().catch((error: unknown) => console.error("Falha ao parar a pilha do E2E", error));
    }
  };

  try {
    const network: StartedNetwork = await new Network().start();
    started.push(network);

    const postgres = await startPostgres({
      network: { network, alias: "db" },
      initScripts: [{ source: fromRoot("docker/db/auth-password.sql"), name: "99-auth-password.sql" }],
    });
    started.push(postgres.container);

    // A porta do gateway é fixada antes de o Auth subir, porque os links do Auth levam o endereço dele.
    const gatewayPort = await freePort();
    const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;

    const auth: StartedTestContainer = await new GenericContainer(IMAGES.auth)
      .withNetwork(network)
      .withNetworkAliases("auth")
      .withEnvironment({
        ...readEnvFile("docker/auth/auth.env"),
        API_EXTERNAL_URL: gatewayUrl,
        GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${postgres.container.getPassword()}@db:5432/postgres`,
        GOTRUE_SITE_URL: options.siteUrl,
        GOTRUE_URI_ALLOW_LIST: `${options.siteUrl}/**`,
        GOTRUE_JWT_SECRET: keys.jwtSecret,
        GOTRUE_JWT_KEYS: keys.jwtKeys,
        GOTRUE_JWT_ISSUER: `${gatewayUrl}/auth/v1`,
        ...options.authEnv,
      })
      .withHealthCheck({
        test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"],
        ...HEALTH_CHECK,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();
    started.push(auth);

    const gateway: StartedTestContainer = await new GenericContainer(IMAGES.gateway)
      .withNetwork(network)
      .withCopyFilesToContainer(
        ["envoy.yaml", "cds.yaml", "lds.template.yaml"]
          .map((file) => ({ source: fromRoot(`docker/envoy/${file}`), target: `/etc/envoy/${file}` }))
          .concat({ source: fromRoot("docker/envoy/docker-entrypoint.sh"), target: "/docker-entrypoint.sh" }),
      )
      .withEntrypoint(["/bin/sh", "/docker-entrypoint.sh"])
      .withEnvironment({
        ...readEnvFile("docker/envoy/envoy.env"),
        SUPABASE_PUBLISHABLE_KEY: keys.publishableKey,
        SUPABASE_SECRET_KEY: keys.secretKey,
        ANON_KEY_ASYMMETRIC: keys.anonJwt,
        SERVICE_ROLE_KEY_ASYMMETRIC: keys.serviceRoleJwt,
        SUPABASE_PUBLIC_URL: gatewayUrl,
      })
      .withExposedPorts({ container: 8000, host: gatewayPort })
      // Pronto quando o Auth responde pelo gateway com a chave publishable, como no CA-15.
      .withWaitStrategy(
        Wait.forHttp("/auth/v1/health", 8000)
          .withHeaders({ apikey: keys.publishableKey })
          .forStatusCode(200),
      )
      .start();
    started.push(gateway);

    console.log(`Gateway do Auth do E2E em ${gatewayUrl}`);

    return {
      databaseUrl: postgres.databaseUrl,
      gatewayUrl,
      publishableKey: keys.publishableKey,
      secretKey: keys.secretKey,
      stop: stopAll,
    };
  } catch (error) {
    await stopAll();
    throw error;
  }
}

// Uma porta livre em 127.0.0.1, que o chamador ocupa logo em seguida.
export async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolvePort(address.port);
        } else {
          reject(new Error("Sem porta livre"));
        }
      });
    });
  });
}
