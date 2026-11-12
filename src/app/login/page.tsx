import { redirect } from "next/navigation";

import { authMessages, LINK_EXPIRED_QUERY } from "@/lib/auth-messages";
import { destinationOf } from "@/server/services/account";
import { serverCaller } from "@/trpc/server";

import { AuthFrame } from "./auth-frame";
import { LoginForm } from "./login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Quem já tem sessão vai para o destino do papel (RN-23). Sem sessão, ou sem
// papel (vínculo em mais de uma área, RN-46), a tela abre.
async function sessionDestination() {
  try {
    const caller = await serverCaller();
    return destinationOf(await caller.account.me());
  } catch {
    return null;
  }
}

// Tela 1 de docs/layout.md, seção 6.
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const destination = await sessionDestination();
  if (destination) redirect(destination);

  // O /auth/confirm/verify traz aqui quem abriu um link vencido ou já usado (RN-38).
  const [key, value] = LINK_EXPIRED_QUERY.split("=");
  const linkExpired = (await searchParams)[key ?? ""] === value;

  return (
    <AuthFrame>
      <LoginForm initialError={linkExpired ? authMessages.linkExpired : null} />
    </AuthFrame>
  );
}
