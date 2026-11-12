import "server-only";

import { cache } from "react";

import type { Account } from "@/server/services/account";
import { serverCaller } from "@/trpc/server";

// O account.me da sessão, uma vez por request: o layout do produto e o de Operações leem o mesmo
// resultado. Sem sessão, com a conta bloqueada no Auth (RN-32) ou com o servidor fora, volta null.
export const currentAccount = cache(async (): Promise<Account | null> => {
  try {
    const caller = await serverCaller();
    return await caller.account.me();
  } catch {
    return null;
  }
});
