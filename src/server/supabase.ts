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

// linkEntryAt: quando a sessão entrou pelo link do e-mail, em segundos, ou null
// (RN-59). Só o teste monta a sessão sem ele.
export type SessionUser = { id: string; email: string | null; linkEntryAt?: number | null };

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type AmrEntry = string | { method: string; timestamp: number };

// O amr do token de acesso, lido do próprio JWT, sem conferir a assinatura: quem
// chama confere o mesmo token no Auth (getUserFromCookies).
function amrOf(accessToken: string): AmrEntry[] {
  const payload = accessToken.split(".")[1];
  if (!payload) return [];
  const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const amr = (claims as { amr?: unknown }).amr;
  return Array.isArray(amr) ? (amr as AmrEntry[]) : [];
}

// Quando a sessão deste token entrou pelo link do e-mail, em segundos, pelo
// método mais recente do amr; null se ela entrou de outro jeito. O link do
// convite e o da redefinição, validados em /auth/confirm/verify (RN-55), entram
// como "otp", os dois, conferido no Auth v2.197.0 da pilha do E2E; entrar com
// senha entra como "password". O app não tem outra entrada por código. O horário
// é o da entrada e não muda quando o token é renovado, também conferido no E2E,
// o que dá o prazo do RN-59. Sem horário no amr, null.
function linkEntryAtOf(accessToken: string): number | null {
  const amr = amrOf(accessToken);
  if (amr.length === 0) return null;

  // O amr pode trazer só o nome do método (RFC 8176), sem horário.
  const entries = amr.map((entry) =>
    typeof entry === "string" ? { method: entry, timestamp: 0 } : entry,
  );
  const latest = entries.reduce((last, entry) =>
    entry.timestamp > last.timestamp ? entry : last,
  );
  return latest.method === "otp" && latest.timestamp > 0 ? latest.timestamp : null;
}

// getUser(), e não getClaims(): pergunta ao Auth a cada chamada, e a conta
// bloqueada perde o acesso já na seguinte (RN-31, RN-32). A sessão é carregada
// (e renovada, se venceu) uma vez, e o Auth confere exatamente o token dela, o
// mesmo de onde sai o linkEntryAt do RN-59: as duas coisas vêm da mesma sessão.
// Tudo dentro de um limite só de AUTH_TIMEOUT_MS (RN-48). Qualquer falha do Auth
// ou do gateway, e o limite estourado, viram chamada sem sessão, sem repassar o
// erro.
export async function getUserFromCookies(
  config: AuthConfig,
  cookieMethods: CookieMethodsServer,
): Promise<SessionUser | null> {
  try {
    const { auth } = createAuthClient(config, cookieMethods);

    return await withAuthTimeout(
      (async (): Promise<SessionUser | null> => {
        const { data: sessionData } = await auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return null;

        const { data, error } = await auth.getUser(accessToken);
        if (error || !data.user) return null;

        return {
          id: data.user.id,
          email: data.user.email ?? null,
          linkEntryAt: linkEntryAtOf(accessToken),
        };
      })(),
    );
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

// Para a tela /account/setup decidir se mostra o campo de senha (RN-59). Só a exibição: quem
// decide se a senha muda é o account.setup, com o linkEntryAt do createContext, tirado do token que
// o getUser() conferiu (getUserFromCookies). Sem sessão, ou sem horário no amr, null.
export async function sessionLinkEntryAt(): Promise<number | null> {
  try {
    const server = await createServerAuthClient();
    if (!server) return null;

    const result = await withAuthTimeout(server.client.auth.getSession());
    const accessToken = result?.data.session?.access_token;
    return accessToken ? linkEntryAtOf(accessToken) : null;
  } catch {
    return null;
  }
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
