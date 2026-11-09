import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import { db } from "@/server/db";

// Só o Prisma por enquanto: sessão, tenant_id e role entram com a primeira spec.
export function createContext() {
  return { db };
}

type Context = ReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
