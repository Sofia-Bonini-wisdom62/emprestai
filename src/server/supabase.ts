import "server-only";

import type { CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  type AuthConfig,
  authConfigFromEnv,
  createAuthClient,
  withAuthTimeout,
} from "@/server/auth-client";

export type SessionUser = { id: string; email: string | null };

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

export async function getSessionUser(
  responseHeaders?: Headers,
): Promise<SessionUser | null> {
  const config = authConfigFromEnv();
  if (!config) return null;

  try {
    const cookieStore = await cookies();

    return await getUserFromCookies(config, {
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
    });
  } catch {
    return null;
  }
}
