import { type CookieMethodsServer, createServerClient } from "@supabase/ssr";

import { clientEnv } from "@/env/client";

// Sem server-only: o proxy.ts também usa este módulo. Ele não tem segredo, só a
// URL e a chave publishable, que são públicas por design (rules/secrets.md).

// Como os 2 s do banco (src/server/db.ts). Sem limite, o Auth fora do ar segura
// cada chamada por até 30 s, nas novas tentativas de renovar a sessão do
// supabase-js. Estourado o limite, a chamada segue sem sessão (decisão da
// pessoa, 2026-11-11).
export const AUTH_TIMEOUT_MS = 3_000;

export type AuthConfig = { url: string; key: string };

// Sem as duas variáveis, como no Preview (RN-34), não há Auth, e a chamada
// segue sem sessão.
export function authConfigFromEnv(): AuthConfig | null {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return url && key ? { url, key } : null;
}

// Cada request ao Auth tem o mesmo limite, para a tentativa que segue depois do
// limite não ficar pendurada num Auth que aceita a conexão e não responde.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  return fetch(input, { ...init, signal });
};

// Um cliente novo por request, como o @supabase/ssr exige.
export function createAuthClient(
  config: AuthConfig,
  cookies: CookieMethodsServer,
) {
  return createServerClient(config.url, config.key, {
    // O navegador não tem cliente Supabase (RN-07): o cookie de sessão não
    // precisa ser legível por JavaScript (RN-08).
    cookieOptions: { httpOnly: true },
    cookies,
    global: { fetch: fetchWithTimeout },
  });
}

// O laço de novas tentativas do supabase-js não para com o fetch abortado: só a
// corrida contra o relógio limita a chamada inteira. Estourado o limite, null.
export async function withAuthTimeout<T>(call: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
