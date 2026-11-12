import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthFrame } from "@/app/login/auth-frame";
import { canSetPassword, destinationOf, setupFields } from "@/server/services/account";
import { sessionLinkEntryAt } from "@/server/supabase";
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

// A mesma regra do account.setup (RN-59), com a hora deste request.
async function linkPasswordAllowed() {
  return canSetPassword(await sessionLinkEntryAt(), Math.floor(Date.now() / 1000));
}

// Tela 7 de docs/layout.md, seção 6: quem chega pelo link do convite define a senha e o nome; pela
// redefinição, só a senha; a conta que já tem senha e não tem nome, só o nome (RN-21, CA-06). O
// campo de senha some passada 1 hora da entrada pelo link, como no account.setup (RN-59). Sem nada
// a pedir, a pessoa segue para o destino do papel.
export default async function AccountSetupPage() {
  // A sessão é do request: sem isto, o try/catch de currentAccount engole o aviso de uso dinâmico,
  // e o build gera a página sem sessão, que mandaria todo mundo a /login.
  await connection();
  const account = await currentAccount();
  if (!account) redirect("/login");

  const fields = setupFields(account, await linkPasswordAllowed());
  if (!fields.password && !fields.name) redirect(destinationOf(account) ?? "/login");

  return (
    <AuthFrame>
      <SetupForm askPassword={fields.password} askName={fields.name} />
    </AuthFrame>
  );
}
