import { execFileSync } from "node:child_process";

const PRISMA_CLI = "node_modules/prisma/build/index.js";

export type SeedTarget = {
  databaseUrl: string;
  supabaseUrl: string;
  // A chave sb_secret_ da pilha do E2E, nunca a do dev nem a de produção (rules/secrets.md).
  secretKey: string;
  password: string;
};

// O mesmo pnpm prisma db seed do dev, apontado para a pilha do E2E.
export function runSeed(target: SeedTarget) {
  execFileSync(process.execPath, [PRISMA_CLI, "db", "seed"], {
    env: {
      ...process.env,
      DIRECT_URL: target.databaseUrl,
      NEXT_PUBLIC_SUPABASE_URL: target.supabaseUrl,
      SUPABASE_SECRET_KEY: target.secretKey,
      SEED_PASSWORD: target.password,
    },
    stdio: "inherit",
  });
}

export type SeedRows = {
  tenants: { slug: string }[];
  users: { id: string; email: string }[];
  profiles: { id: string; name: string }[];
  memberships: { userId: string; role: string; tenant: { slug: string } }[];
};

// As linhas de área, conta, nome e vínculo, lidas pelo Prisma no seed-rows.ts.
export function readSeedRows(target: SeedTarget): SeedRows {
  const output = execFileSync(
    process.execPath,
    ["--import", "./prisma/resolve-ts.mjs", "tests/e2e/seed-rows.ts"],
    {
      env: { ...process.env, E2E_DATABASE_URL: target.databaseUrl },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  return JSON.parse(output) as SeedRows;
}

// Os casos leem a pilha pelo ambiente que o globalSetup grava antes de os workers subirem.
export function seedTargetFromEnv(): SeedTarget {
  const read = (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Falta ${name}: o globalSetup do E2E não rodou`);
    }
    return value;
  };

  return {
    databaseUrl: read("E2E_DATABASE_URL"),
    supabaseUrl: read("E2E_SUPABASE_URL"),
    secretKey: read("E2E_SUPABASE_SECRET_KEY"),
    password: read("E2E_SEED_PASSWORD"),
  };
}
