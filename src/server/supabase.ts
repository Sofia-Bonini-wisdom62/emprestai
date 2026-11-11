import "server-only";

import type { CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  type AuthConfig,
  authConfigFromEnv,
  createAuthClient,
  createRecoveryAuthClient,
  withAuthTimeout,
} from "@/server/auth-client";
import type { AuthPort, PasswordResetPort } from "@/server/services/auth";

export type SessionUser = { id: string; email: string | null };

type CookieStore = Awaited<ReturnType<typeof cookies>>;

// getUser(), e não getClaims(): pergunta ao Auth a cada chamada, e a conta
// bloqueada perde o acesso já na seguinte (RN-31, RN-32). Qualquer falha do
// Auth ou do gateway, e o limite de AUTH_TIMEOUT_MS estourado, viram chamada
// sem sessão, sem repassar o erro.
export async function getUserFromCookies(
  config: AuthConfig,
  cookieMethods: CookieMethodsServer,
): Promise<SessionUser | null> {
  try {
    const result = await withAuthTimeout(
      createAuthClient(config, cookieMethods).auth.getUser(),
    );
    if (!result || result.error || !result.data.user) return null;

    return { id: result.data.user.id, email: result.data.user.email ?? null };
  } catch {
    return null;
  }
}

// Os cookies do Next para o @supabase/ssr.
function nextCookieMethods(
  cookieStore: CookieStore,
  responseHeaders?: Headers,
): CookieMethodsServer {
  return {
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet, headers) => {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Server Component não grava cookie; quem renova a sessão ali é o
        // proxy.ts (ADR-003, 2.7).
        return;
      }
      // Resposta que grava cookie de sessão não pode ir para cache compartilhado.
      for (const [header, value] of Object.entries(headers)) {
        responseHeaders?.set(header, value);
      }
    },
  };
}

export async function getSessionUser(
  responseHeaders?: Headers,
): Promise<SessionUser | null> {
  const config = authConfigFromEnv();
  if (!config) return null;

  try {
    const cookieStore = await cookies();

    return await getUserFromCookies(
      config,
      nextCookieMethods(cookieStore, responseHeaders),
    );
  } catch {
    return null;
  }
}

// O cliente que grava o cookie de sessão: o das procedures do tRPC e o do envio
// de /auth/confirm/verify. Sem as duas variáveis, como no Preview (RN-34), null.
export async function createServerAuthClient(responseHeaders?: Headers) {
  const config = authConfigFromEnv();
  if (!config) return null;

  const cookieStore = await cookies();
  return {
    client: createAuthClient(config, nextCookieMethods(cookieStore, responseHeaders)),
    cookieStore,
  };
}

// O cookie de sessão do @supabase/ssr, inteiro ou em pedaços, e os do PKCE.
const SESSION_COOKIE = /^sb-.+-auth-token/;

function clearSessionCookies(cookieStore: CookieStore) {
  for (const { name } of cookieStore.getAll()) {
    if (SESSION_COOKIE.test(name)) cookieStore.delete(name);
  }
}

const TIMED_OUT = { code: "request_timeout" };

// As chamadas das procedures ao Auth, cada uma inteira dentro do limite do
// RN-48, novas tentativas incluídas. Estourado o limite, a chamada conta como
// falha do Auth.
export async function createRouterAuth(
  responseHeaders?: Headers,
): Promise<AuthPort | null> {
  const server = await createServerAuthClient(responseHeaders);
  if (!server) return null;
  const { auth } = server.client;

  return {
    async signInWithPassword(credentials) {
      return (
        (await withAuthTimeout(auth.signInWithPassword(credentials))) ?? {
          data: { user: null },
          error: TIMED_OUT,
        }
      );
    },
    // O escopo local apaga a sessão antes de ir à rede, mas a sessão vencida
    // tenta renovar primeiro. Com o Auth fora do ar, o cookie sai daqui mesmo
    // assim (RN-54).
    async signOut(options) {
      const result = await withAuthTimeout(auth.signOut(options)).catch(
        () => null,
      );
      clearSessionCookies(server.cookieStore);
      return result ?? { error: TIMED_OUT };
    },
    async updateUser(attributes) {
      return (
        (await withAuthTimeout(auth.updateUser(attributes))) ?? {
          error: TIMED_OUT,
        }
      );
    },
  };
}

// O pedido de redefinição, pelo cliente sem cookie (auth-client.ts), também
// dentro do limite do RN-48.
export function createPasswordResetAuth(): PasswordResetPort | null {
  const config = authConfigFromEnv();
  if (!config) return null;
  const { auth } = createRecoveryAuthClient(config);

  return {
    async resetPasswordForEmail(email, options) {
      return (
        (await withAuthTimeout(auth.resetPasswordForEmail(email, options))) ?? {
          error: TIMED_OUT,
        }
      );
    },
  };
}
