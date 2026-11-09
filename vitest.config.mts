import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // O server-only lança erro fora do servidor do Next (R15).
      "server-only": fromRoot("./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    // Só para src/env/server.ts carregar: os testes usam a URI do contêiner.
    env: { DATABASE_URL: "postgresql://127.0.0.1:1/x" },
    hookTimeout: 180_000,
  },
});
