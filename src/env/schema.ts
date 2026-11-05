import { z } from "zod";

// Sem `import "server-only"`: o next.config.ts importa este arquivo para validar
// no build e no dev, e o server-only lança erro fora do servidor do Next.

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);

export const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "obrigatória" })
    .regex(/^postgres(ql)?:\/\//, "precisa começar com postgresql://"),
  SUPABASE_SECRET_KEY: optionalString,
  APP_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_PRETTY: optionalString,
  SENTRY_AUTH_TOKEN: optionalString,
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,
  RATE_LIMIT_IP_MAX: optionalPositiveInt,
  RATE_LIMIT_IP_WINDOW_SECONDS: optionalPositiveInt,
  RATE_LIMIT_USER_MAX: optionalPositiveInt,
  RATE_LIMIT_USER_WINDOW_SECONDS: optionalPositiveInt,
  PORT: optionalPositiveInt,
});

export function parseServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Variáveis de ambiente inválidas:\n${problems.join("\n")}`);
  }

  return result.data;
}
