import { redirect } from "next/navigation";

import { currentAccount } from "../current-account";

// O layout das telas de Operações: o Colaborador que abre uma delas vai para o catálogo (RN-24,
// CA-18). É só navegação: o dado de Operações o servidor nega de qualquer jeito (adminProcedure).
export default async function OperationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (account.role !== "operations") redirect("/catalog");

  return children;
}
