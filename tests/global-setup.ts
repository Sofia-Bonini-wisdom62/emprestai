import type { TestProject } from "vitest/node";

import { startPostgres } from "./helpers/postgres";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

// Só o Postgres, sem Auth: o teste de procedimento recebe a sessão como dado (ADR-006, seção 2).
export default async function setup(project: TestProject) {
  const { container, databaseUrl } = await startPostgres();

  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await container.stop();
  };
}
