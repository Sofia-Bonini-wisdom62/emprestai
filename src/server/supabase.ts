import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/env/client";

export type SessionUser = { id: string; email: string | null };

// Um cliente novo por request, como o @supabase/ssr exige. Sem as duas
// variáveis, como no Preview (RN-34), não há cliente e a chamada segue sem sessão.
export async function createSupabaseServerClient(responseHeaders?: Headers) {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    // O navegador não tem cliente Supabase (RN-07): o cookie de sessão não
    // precisa ser legível por JavaScript (RN-08).
    cookieOptions: { httpOnly: true },
    cookies: {
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
    },
  });
}

// getUser(), e não getClaims(): pergunta ao Auth a cada chamada, e a conta
// bloqueada perde o acesso já na seguinte (RN-31, RN-32). Qualquer falha do
// Auth ou do gateway vira chamada sem sessão, sem repassar o erro.
export async function getSessionUser(
  responseHeaders?: Headers,
): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient(responseHeaders);
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
