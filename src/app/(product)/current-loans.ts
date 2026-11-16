import "server-only";

import { cache } from "react";

import type { MyOpenLoans } from "@/server/services/loan";
import { serverCaller } from "@/trpc/server";

// O loan.listMine da sessão, uma vez por request: o header e as telas leem o mesmo resultado.
// Sem área, ou com o servidor fora, volta null, e o header não mostra o contador.
export const currentLoans = cache(async (): Promise<MyOpenLoans | null> => {
  try {
    const caller = await serverCaller();
    return await caller.loan.listMine();
  } catch {
    return null;
  }
});
