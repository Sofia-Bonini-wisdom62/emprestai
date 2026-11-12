import { redirect } from "next/navigation";

import { destinationOf } from "@/server/services/account";

import { AppHeader } from "./app-header";
import { currentAccount } from "./current-account";

// A moldura das telas do produto (docs/layout.md, seção 6), por ora só com o header: a navegação
// lateral chega com as specs de empréstimo (spec 001, fora de escopo).
export default async function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await currentAccount();
  // Sem sessão, ou com a conta bloqueada, o account.me falha e a tela vai a /login (CA-21).
  if (!account) redirect("/login");

  // Sem nome, o nome vem antes de qualquer outra tela (CA-06). Vem antes do papel porque a conta
  // convidada que ainda não passou pelo account.setup não tem vínculo (RN-13) e, sem esta ordem,
  // iria para /login sem senha. Quem tem vínculo em mais de uma área e não tem nome também cai
  // ali, e o account.setup o recusa (RN-52).
  if (!account.name) redirect("/account/setup");

  // Sem papel, sem vínculo ou com vínculo em mais de uma área, a pessoa não entra (RN-52).
  if (!destinationOf(account)) redirect("/login");

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:rounded-md focus-visible:bg-card focus-visible:px-4 focus-visible:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Pular para o conteúdo
      </a>
      <AppHeader name={account.name} email={account.email} />
      <main id="conteudo" className="flex flex-1 flex-col gap-2 px-5 py-8 md:px-8">
        {children}
      </main>
    </>
  );
}
