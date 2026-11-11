import { type NextRequest, NextResponse } from "next/server";

import {
  type AuthConfig,
  createAuthClient,
  withAuthTimeout,
} from "@/server/auth-client";

// Sem sessão, só estas abrem; o resto leva a /login (RN-33, RN-49). A raiz
// segue pública até a spec do catálogo. O /api/trpc não é redirecionado: cada
// procedimento confere a própria sessão (ADR-001, 2.7), e o health.check
// continua público. O /_next/ fica de fora para não travar o próprio Next. O
// /auth/confirm/verify é o envio do botão de /auth/confirm, que chega sem sessão
// (RN-55).
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/forgot-password",
  "/auth/confirm",
  "/auth/confirm/verify",
]);
const PUBLIC_PREFIXES = ["/api/trpc/", "/_next/"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

// Renova a sessão e manda a /login quem abre tela do produto sem sessão, sem
// ler o banco (RN-31, RN-33). O papel não é conferido aqui (RN-24, nas telas).
export async function handleSession(
  request: NextRequest,
  config: AuthConfig | null,
) {
  let response = NextResponse.next({ request });
  const authHeaders: Record<string, string> = {};
  let hasSession = false;

  if (config) {
    const supabase = createAuthClient(config, {
      getAll: () => request.cookies.getAll(),
      // A sessão renovada vai para a resposta e também para o request, para a
      // rota ler o token novo e não renovar de novo com o refresh já usado.
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        Object.assign(authHeaders, headers);
      },
    });

    // getClaims() confere o token pelo JWKS, sem ir ao Auth a cada request, e
    // renova a sessão vencida pelo refresh token (RN-31, CA-17).
    const result = await withAuthTimeout(supabase.auth.getClaims()).catch(
      () => null,
    );
    hasSession = Boolean(result?.data?.claims);
  }

  const { pathname } = request.nextUrl;
  const final =
    hasSession || isPublic(pathname)
      ? response
      : redirectToLogin(request, response);

  // Resposta que grava cookie de sessão não pode ir para cache compartilhado.
  for (const [header, value] of Object.entries(authHeaders)) {
    final.headers.set(header, value);
  }

  return final;
}

// Leva junto o que a renovação gravou, como o cookie apagado de uma sessão
// que o Auth recusou.
function redirectToLogin(request: NextRequest, response: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}
