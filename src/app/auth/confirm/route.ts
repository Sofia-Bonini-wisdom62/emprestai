import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { LINK_EXPIRED_QUERY } from "@/lib/auth-messages";
import { createSupabaseServerClient } from "@/server/supabase";

// O link do convite e o da redefinição (RN-35, RN-44): o Auth valida o
// token_hash, o cookie de sessão é gravado, e a pessoa vai a /account/setup
// (RN-21). Link vencido, já usado ou malformado leva a /login com o aviso do
// RN-38, sem cookie.
const linkSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(["invite", "recovery"]),
});

export async function GET(request: NextRequest) {
  const failure = new URL(`/login?${LINK_EXPIRED_QUERY}`, request.url);
  // Resposta que grava cookie de sessão não vai para cache compartilhado.
  const headers = new Headers({ "Cache-Control": "private, no-store" });

  const link = linkSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!link.success) return NextResponse.redirect(failure, { headers });

  try {
    const supabase = await createSupabaseServerClient(headers);
    if (!supabase) return NextResponse.redirect(failure, { headers });

    const { error } = await supabase.auth.verifyOtp(link.data);
    if (error) return NextResponse.redirect(failure, { headers });
  } catch {
    return NextResponse.redirect(failure, { headers });
  }

  return NextResponse.redirect(new URL("/account/setup", request.url), {
    headers,
  });
}
