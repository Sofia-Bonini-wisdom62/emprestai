import { createHash } from "node:crypto";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type RateLimitRule = { max: number; windowSeconds: number };
export type RateLimitRules = { ip: RateLimitRule; email: RateLimitRule };

export type RateLimitEnv = {
  RATE_LIMIT_IP_MAX: number;
  RATE_LIMIT_IP_WINDOW_SECONDS: number;
  RATE_LIMIT_USER_MAX: number;
  RATE_LIMIT_USER_WINDOW_SECONDS: number;
};

// "USER" nas variáveis é o contador por e-mail (RN-09).
export function rateLimitRulesFrom(env: RateLimitEnv): RateLimitRules {
  return {
    ip: {
      max: env.RATE_LIMIT_IP_MAX,
      windowSeconds: env.RATE_LIMIT_IP_WINDOW_SECONDS,
    },
    email: {
      max: env.RATE_LIMIT_USER_MAX,
      windowSeconds: env.RATE_LIMIT_USER_WINDOW_SECONDS,
    },
  };
}

type Db = PrismaClient | Prisma.TransactionClient;

// A chave é o hash: a tabela não guarda IP nem e-mail em claro.
function keyFor(kind: "ip" | "email", value: string) {
  return createHash("sha256").update(`${kind}:${value}`).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Um só comando, para duas tentativas simultâneas não lerem o mesmo valor.
// A janela começa na primeira tentativa e recomeça quando vence.
async function hit(db: Db, key: string, windowSeconds: number) {
  const [row] = await db.$queryRaw<[{ count: number }]>`
    INSERT INTO "rate_limits" ("key", "count", "window_started_at")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limits"."window_started_at" <= now() - make_interval(secs => ${windowSeconds}::float8)
        THEN 1
        ELSE "rate_limits"."count" + 1
      END,
      "window_started_at" = CASE
        WHEN "rate_limits"."window_started_at" <= now() - make_interval(secs => ${windowSeconds}::float8)
        THEN now()
        ELSE "rate_limits"."window_started_at"
      END
    RETURNING "count"`;
  return row.count;
}

// Conta a tentativa nos dois contadores (RN-09). Entrar e pedir a redefinição
// chamam esta mesma função com o mesmo e-mail, e por isso somam juntos (RN-43).
export async function consumeAttempt(
  db: Db,
  attempt: { ip: string; email: string },
  rules: RateLimitRules,
): Promise<{ allowed: boolean }> {
  const ipCount = await hit(db, keyFor("ip", attempt.ip), rules.ip.windowSeconds);
  const emailCount = await hit(
    db,
    keyFor("email", normalizeEmail(attempt.email)),
    rules.email.windowSeconds,
  );
  return { allowed: ipCount <= rules.ip.max && emailCount <= rules.email.max };
}
