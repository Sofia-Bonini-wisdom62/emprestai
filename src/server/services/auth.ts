import type { PrismaClient } from "@/generated/prisma/client";
import { enterAccount, type Destination } from "@/server/services/account";
import { consumeAttempt, type RateLimitRules } from "@/server/services/rate-limit";

// Só o que esta spec usa do supabase.auth do servidor. O cliente real satisfaz
// este tipo; o teste por createCaller passa um objeto que só registra a chamada,
// sem Auth (ADR-006, seção 2).
export type AuthPort = {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<{ error: unknown }>;
  updateUser(attributes: {
    password: string;
  }): Promise<{ error: { code?: string } | null }>;
};

export type AttemptDeps = {
  db: PrismaClient;
  auth: AuthPort | null;
  ip: string;
  rules: RateLimitRules;
};

export type SignInResult =
  | { ok: true; destination: Destination }
  | { ok: false; reason: "too_many_attempts" | "invalid_credentials" };

// O limite vem antes do Auth (RN-09; CA-22: a tentativa a mais não chega ao
// Auth). Se o contador falha, a tentativa também não chega ao Auth.
async function checkLimit(
  deps: AttemptDeps,
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
export async function signIn(
  deps: AttemptDeps,
  credentials: { email: string; password: string },
): Promise<SignInResult> {
  const limit = await checkLimit(deps, credentials.email);
  if (limit === "too_many_attempts") {
    return { ok: false, reason: "too_many_attempts" };
  }
  if (limit === "failed" || !deps.auth) {
    return { ok: false, reason: "invalid_credentials" };
  }

  let userId: string;
  try {
    const { data, error } = await deps.auth.signInWithPassword(credentials);
    if (error || !data.user) return { ok: false, reason: "invalid_credentials" };
    userId = data.user.id;
  } catch {
    return { ok: false, reason: "invalid_credentials" };
  }

  try {
    return { ok: true, destination: await enterAccount(deps.db, userId) };
  } catch {
    // Sem vínculo gravado, a entrada não se completa: o cookie recém-gravado sai.
    await deps.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { ok: false, reason: "invalid_credentials" };
  }
}

// O escopo local apaga a sessão deste navegador antes de ir à rede, então o
// cookie sai mesmo com o Auth fora do ar (CA-11).
export async function signOut(auth: AuthPort | null) {
  await auth?.signOut({ scope: "local" }).catch(() => undefined);
}

// A mesma resposta exista ou não a conta, e mesmo se o Auth ou o contador
// falharem (RN-42). Só o limite muda a resposta (RN-43).
export async function requestPasswordReset(
  deps: AttemptDeps & { confirmUrl: string },
  email: string,
): Promise<{ ok: true } | { ok: false; reason: "too_many_attempts" }> {
  const limit = await checkLimit(deps, email);
  if (limit === "too_many_attempts") {
    return { ok: false, reason: "too_many_attempts" };
  }
  if (limit === "failed") return { ok: true };

  await deps.auth
    ?.resetPasswordForEmail(email, { redirectTo: deps.confirmUrl })
    .catch(() => undefined);

  return { ok: true };
}

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; reason: "weak_password" | "failed" };

// A senha nova no convite e na redefinição. O mínimo é o do Auth (RN-39).
export async function setPassword(
  auth: AuthPort | null,
  password: string,
): Promise<SetPasswordResult> {
  if (!auth) return { ok: false, reason: "failed" };

  try {
    const { error } = await auth.updateUser({ password });
    if (!error) return { ok: true };
    return {
      ok: false,
      reason: error.code === "weak_password" ? "weak_password" : "failed",
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
