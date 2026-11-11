import { NextResponse, type NextRequest } from "next/server";

import { LINK_EXPIRED_QUERY } from "@/lib/auth-messages";
import { withAuthTimeout } from "@/server/auth-client";
import { createServerAuthClient } from "@/server/supabase";

import { linkSchema } from "../link";

// Só o formulário desta origem: sem isso, outro site poderia entrar o navegador
// da pessoa numa conta que não é dela. A comparação é com o Host que o navegador
// mandou, porque o request.url do next start troca o endereço por localhost.
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// O clique em "Continuar" de /auth/confirm (RN-55): o Auth valida o token_hash,
// dentro do limite do RN-48, o cookie de sessão é gravado, e a pessoa vai a
// /account/setup (RN-21). Link vencido, já usado ou malformado, e o Auth fora do
// ar, levam a /login com o aviso do RN-38, sem cookie.
export async function POST(request: NextRequest) {
  // 303 com caminho relativo: o navegador segue com GET no mesmo endereço em que
  // está. Resposta que grava cookie de sessão não vai para cache compartilhado.
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const redirectTo = (path: string) => {
    headers.set("Location", path);
    return new NextResponse(null, { status: 303, headers });
  };
  const failure = () => redirectTo(`/login?${LINK_EXPIRED_QUERY}`);

  if (!sameOrigin(request)) return failure();

  const form = await request.formData().catch(() => null);
  const link = linkSchema.safeParse({
    token_hash: form?.get("token_hash"),
    type: form?.get("type"),
  });
  if (!link.success) return failure();

  try {
    const server = await createServerAuthClient(headers);
    if (!server) return failure();

    const result = await withAuthTimeout(
      server.client.auth.verifyOtp(link.data),
    );
    if (!result || result.error) return failure();
  } catch {
    return failure();
  }

  return redirectTo("/account/setup");
}
