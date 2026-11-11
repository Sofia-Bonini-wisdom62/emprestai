import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

import type { MembershipRole, PrismaClient } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { findSessionMembership } from "@/server/services/membership";
import { getSessionUser, type SessionUser } from "@/server/supabase";

export type Session = { userId: string; email: string | null };

// Sessão, área e papel ausentes ou nulos: chamada sem sessão. O teste monta o
// contexto à mão, sem Auth (ADR-006, seção 2).
export type Context = {
  db: PrismaClient;
  session?: Session | null;
  tenantId?: string | null;
  role?: MembershipRole | null;
};

// A área e o papel saem do vínculo da sessão, nunca do input (ADR-001, 2.6;
// RN-15). Se o banco falha nessa leitura, a sessão fica sem área: o
// tenantProcedure recusa, e os procedimentos públicos, como o health.check,
// continuam respondendo.
export async function createContextForUser(
  database: PrismaClient,
  user: SessionUser | null,
): Promise<Context> {
  if (!user) return { db: database, session: null, tenantId: null, role: null };

  const membership = await findSessionMembership(database, user.id).catch(
    () => null,
  );

  return {
    db: database,
    session: { userId: user.id, email: user.email },
    tenantId: membership?.tenantId ?? null,
    role: membership?.role ?? null,
  };
}

export async function createContext(
  opts?: Pick<FetchCreateContextFnOptions, "resHeaders">,
): Promise<Context> {
  return createContextForUser(db, await getSessionUser(opts?.resHeaders));
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// "Está logado" (ADR-001, 2.7).
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { session: ctx.session } });
});

// "Pertence à área": injeta a área da sessão no service (ADR-001, 2.6).
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.tenantId || !ctx.role) throw new TRPCError({ code: "FORBIDDEN" });

  return next({ ctx: { tenantId: ctx.tenantId, role: ctx.role } });
});

// "É administrador": administrador é o papel de Operações (RN-10, RN-16).
export const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.role !== "operations") throw new TRPCError({ code: "FORBIDDEN" });

  return next();
});
