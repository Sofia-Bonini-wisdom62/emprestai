import { z } from "zod";

const runtimeEnvSchema = z.object({
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  VERCEL_URL: z.string().optional(),
});

const vercel = runtimeEnvSchema.parse({
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
});

export const runtimeEnv = {
  environment: vercel.VERCEL_ENV ?? "development",
  deploymentUrl: vercel.VERCEL_URL && `https://${vercel.VERCEL_URL}`,
};
