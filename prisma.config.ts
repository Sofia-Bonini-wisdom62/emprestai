import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// O Prisma CLI não lê o .env.local, e na Vercel e no CI o arquivo não existe.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL },
});
