import { z } from "zod";

// Sem `import "server-only"`: o next.config.ts importa este arquivo para validar
// no build e no dev, e o server-only lança erro fora do servidor do Next.

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);
const positiveIntOr = (fallback: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(fallback),
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
  // Os limites do RN-09, combinados na T-06: 30 tentativas por IP em 60 s e 5
  // por e-mail em 15 min. "USER" é o contador por e-mail.
  RATE_LIMIT_IP_MAX: positiveIntOr(30),
  RATE_LIMIT_IP_WINDOW_SECONDS: positiveIntOr(60),
  RATE_LIMIT_USER_MAX: positiveIntOr(5),
  RATE_LIMIT_USER_WINDOW_SECONDS: positiveIntOr(900),
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
