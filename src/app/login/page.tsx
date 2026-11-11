import { redirect } from "next/navigation";

import { authMessages, LINK_EXPIRED_QUERY } from "@/lib/auth-messages";
import { destinationOf } from "@/server/services/account";
import { serverCaller } from "@/trpc/server";

import { BrandPanel } from "./brand-panel";
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

// Tela 1 de docs/layout.md, seção 6: duas colunas (5/12 e 7/12) a partir de 1024px e uma abaixo
// disso (RN-29).
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const destination = await sessionDestination();
  if (destination) redirect(destination);

  // O /auth/confirm/verify traz aqui quem abriu um link vencido ou já usado (RN-38).
  const [key, value] = LINK_EXPIRED_QUERY.split("=");
  const linkExpired = (await searchParams)[key ?? ""] === value;

  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-12">
      <BrandPanel className="lg:col-span-5" />
      <section className="flex items-center px-5 py-10 md:px-8 lg:col-span-7 lg:justify-center">
        <LoginForm initialError={linkExpired ? authMessages.linkExpired : null} />
      </section>
    </main>
  );
}
