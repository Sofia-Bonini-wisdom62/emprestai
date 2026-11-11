import type { PrismaClient } from "@/generated/prisma/client";
import { enterAccount, type Destination } from "@/server/services/account";
import {
  consumeAttempt,
  normalizeEmail,
  type RateLimitRules,
} from "@/server/services/rate-limit";

// Só o que esta spec usa do supabase.auth do servidor. O cliente real satisfaz
// este tipo; o teste por createCaller passa um objeto que só registra a chamada,
// sem Auth (ADR-006, seção 2).
export type AuthPort = {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
  updateUser(attributes: {
    password: string;
  }): Promise<{ error: { code?: string } | null }>;
};

// O pedido de redefinição sai por um cliente que não grava cookie (src/server/supabase.ts).
export type PasswordResetPort = {
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<{ error: unknown }>;
};

export type LimitDeps = { db: PrismaClient; ip: string; rules: RateLimitRules };

export type SignInResult =
  | { ok: true; destination: Destination }
  | { ok: false; reason: "too_many_attempts" | "invalid_credentials" };

// O limite vem antes do Auth (RN-09; CA-22: a tentativa a mais não chega ao
// Auth). Se o contador falha, a tentativa também não chega ao Auth (RN-57).
async function checkLimit(
  deps: LimitDeps,
  email: string,
): Promise<"allowed" | "too_many_attempts" | "failed"> {
  try {
    const { allowed } = await consumeAttempt(
      deps.db,
      { ip: deps.ip, email },
      deps.rules,
    );
    return allowed ? "allowed" : "too_many_attempts";
  } catch {
    return "failed";
  }
}

// Qualquer falha que não seja o limite vira a mesma resposta de senha errada
// (RN-25), inclusive conta bloqueada, Auth fora do ar e o Preview sem Auth (RN-34).
// O e-mail que o Auth recebe é o mesmo que o contador contou: com normalizações
// diferentes, uma variante do e-mail abriria um contador novo para a mesma conta.
export async function signIn(
  deps: LimitDeps & { auth: AuthPort | null; firstEntryTenantSlug?: string },
  credentials: { email: string; password: string },
): Promise<SignInResult> {
  const email = normalizeEmail(credentials.email);
  const limit = await checkLimit(deps, email);
  if (limit === "too_many_attempts") {
    return { ok: false, reason: "too_many_attempts" };
  }
  if (limit === "failed" || !deps.auth) {
    return { ok: false, reason: "invalid_credentials" };
  }

  let userId: string;
  try {
    const { data, error } = await deps.auth.signInWithPassword({
      email,
      password: credentials.password,
    });
    if (error || !data.user) return { ok: false, reason: "invalid_credentials" };
    userId = data.user.id;
  } catch {
    return { ok: false, reason: "invalid_credentials" };
  }

  // Sem vínculo gravado, ou com vínculo em mais de uma área (RN-52), a entrada
  // não se completa: o cookie recém-gravado sai, e a resposta é a do RN-25.
  const destination = await enterAccount(
    deps.db,
    userId,
    deps.firstEntryTenantSlug,
  ).catch(() => null);
  if (!destination) {
    await deps.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { ok: false, reason: "invalid_credentials" };
  }

  return { ok: true, destination };
}

// Só este navegador (RN-53). O escopo local apaga a sessão guardada no cookie
// antes de ir à rede, então o cookie sai mesmo com o Auth fora do ar (RN-54).
export async function signOut(auth: AuthPort | null) {
  await auth?.signOut({ scope: "local" }).catch(() => undefined);
}

// A mesma resposta exista ou não a conta, e mesmo se o Auth ou o contador
// falharem (RN-42). Só o limite muda a resposta (RN-43).
export async function requestPasswordReset(
  deps: LimitDeps & {
    passwordReset: PasswordResetPort | null;
    confirmUrl: string;
  },
  rawEmail: string,
): Promise<{ ok: true } | { ok: false; reason: "too_many_attempts" }> {
  const email = normalizeEmail(rawEmail);
  const limit = await checkLimit(deps, email);
  if (limit === "too_many_attempts") {
    return { ok: false, reason: "too_many_attempts" };
  }
  if (limit === "failed") return { ok: true };

  await deps.passwordReset
    ?.resetPasswordForEmail(email, { redirectTo: deps.confirmUrl })
    .catch(() => undefined);

  return { ok: true };
}

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; reason: "weak_password" | "same_password" | "failed" };

// A senha nova no convite e na redefinição. O mínimo é o do Auth (RN-39), e a
// senha igual à atual também é ele quem recusa (RN-56).
export async function setPassword(
  auth: AuthPort | null,
  password: string,
): Promise<SetPasswordResult> {
  if (!auth) return { ok: false, reason: "failed" };

  try {
    const { error } = await auth.updateUser({ password });
    if (!error) return { ok: true };
    if (error.code === "weak_password" || error.code === "same_password") {
      return { ok: false, reason: error.code };
    }
    return { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
