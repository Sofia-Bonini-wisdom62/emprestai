import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthFrame } from "@/app/login/auth-frame";
import { destinationOf, setupFields } from "@/server/services/account";
import { sessionFromEmailLink } from "@/server/supabase";
import { serverCaller } from "@/trpc/server";

import { SetupForm } from "./setup-form";

async function currentAccount() {
  try {
    const caller = await serverCaller();
    return await caller.account.me();
  } catch {
    return null;
  }
}

// Tela 7 de docs/layout.md, seção 6: quem chega pelo link do convite define a senha e o nome; pela
// redefinição, só a senha; a conta que já tem senha e não tem nome, só o nome (RN-21, CA-06). Sem
// nada a pedir, a pessoa segue para o destino do papel.
export default async function AccountSetupPage() {
  // A sessão é do request: sem isto, o try/catch de currentAccount engole o aviso de uso dinâmico,
  // e o build gera a página sem sessão, que mandaria todo mundo a /login.
  await connection();
  const account = await currentAccount();
  if (!account) redirect("/login");

  const fields = setupFields(account, await sessionFromEmailLink());
  if (!fields.password && !fields.name) redirect(destinationOf(account) ?? "/login");

  return (
    <AuthFrame>
      <SetupForm askPassword={fields.password} askName={fields.name} />
    </AuthFrame>
  );
}
