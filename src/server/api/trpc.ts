import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

import { serverEnv } from "@/env/server";
import type { MembershipRole, PrismaClient } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { AuthPort, PasswordResetPort } from "@/server/services/auth";
import { findSessionMembership } from "@/server/services/membership";
import {
  rateLimitRulesFrom,
  type RateLimitRules,
} from "@/server/services/rate-limit";
import {
  createPasswordResetAuth,
  createRouterAuth,
  getSessionUser,
  type SessionUser,
} from "@/server/supabase";

export type Session = { userId: string; email: string | null };

// Sessão, área e papel ausentes ou nulos: chamada sem sessão. O teste monta o
// contexto à mão, sem Auth (ADR-006, seção 2). Sem auth, como no Preview
// (RN-34), entrar falha com a mensagem genérica. Sem regras, valem as do
// ambiente.
export type Context = {
  db: PrismaClient;
  session?: Session | null;
  tenantId?: string | null;
  role?: MembershipRole | null;
  auth?: AuthPort | null;
  passwordReset?: PasswordResetPort | null;
  ip?: string | null;
  rateLimitRules?: RateLimitRules;
  // A área da primeira entrada (RN-13). Só o teste troca a default por outra.
  firstEntryTenantSlug?: string;
  // Quando a sessão entrou pelo link do e-mail, em segundos, ou null se entrou
  // com senha; dá o prazo da senha nova no account.setup (RN-59).
  linkEntryAt?: number | null;
};

export const envRateLimitRules = rateLimitRulesFrom(serverEnv);

// Na Vercel, o x-forwarded-for chega reescrito pela plataforma, com o IP de
// quem fez o request primeiro.
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

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
    // Do mesmo token que o getUser() conferiu (getUserFromCookies), para o RN-59.
    linkEntryAt: user.linkEntryAt ?? null,
  };
}

export async function createContext(
  opts?: Pick<FetchCreateContextFnOptions, "req" | "resHeaders">,
): Promise<Context> {
  const context = await createContextForUser(
    db,
    await getSessionUser(opts?.resHeaders),
  );
  // As chamadas ao Auth das procedures, com o limite de 3 s do RN-48.
  const auth = await createRouterAuth(opts?.resHeaders).catch(() => null);

  return {
    ...context,
    auth,
    passwordReset: createPasswordResetAuth(),
    ip: opts?.req ? clientIp(opts.req.headers) : null,
    rateLimitRules: envRateLimitRules,
  };
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
