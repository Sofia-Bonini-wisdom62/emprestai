import { z } from "zod";

// Vazia conta como ausente, como em schema.ts: o E2E zera as VERCEL_* para nada do ambiente vazar.
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const runtimeEnvSchema = z.object({
  VERCEL_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["production", "preview", "development"]).optional(),
  ),
  VERCEL_URL: z.preprocess(emptyToUndefined, z.string().optional()),
});

const vercel = runtimeEnvSchema.parse({
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
});

export const runtimeEnv = {
  environment: vercel.VERCEL_ENV ?? "development",
  deploymentUrl: vercel.VERCEL_URL && `https://${vercel.VERCEL_URL}`,
  // O Next fixa o NODE_ENV no build: "development" só no next dev, nunca no next start.
  nextDev: process.env.NODE_ENV === "development",
};
