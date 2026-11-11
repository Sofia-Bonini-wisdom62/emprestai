import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { serverEnv } from "@/env/server";
import { authMessages } from "@/lib/auth-messages";
import {
  createTRPCRouter,
  type Context,
  envRateLimitRules,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  requestPasswordReset,
  signIn,
  signOut,
} from "@/server/services/auth";

// Sem IP no request, as tentativas somam num contador só, o que só aperta o limite.
function attemptDeps(ctx: Context) {
  return {
    db: ctx.db,
    auth: ctx.auth ?? null,
    ip: ctx.ip ?? "unknown",
    rules: ctx.rateLimitRules ?? envRateLimitRules,
  };
}

// O link do e-mail volta a /auth/confirm, na URL canônica do app. O Auth só aceita
// a Site URL e o localhost (RN-37); a URL de cada deploy (VERCEL_URL) ele recusaria.
function confirmUrl() {
  const base = serverEnv.APP_URL ?? "http://localhost:3000";
  return new URL("/auth/confirm", base).toString();
}

function tooManyAttempts() {
  return new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: authMessages.tooManyAttempts,
  });
}

// O e-mail só sem espaços nas pontas: quem confere o formato é o Auth, e o
// limite conta a tentativa mesmo assim. strict() recusa campo a mais, como um
// tenantId (CA-14).
const email = z.string().trim().min(1).max(320);

export const authRouter = createTRPCRouter({
  signIn: publicProcedure
    .input(z.strictObject({ email, password: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const result = await signIn(attemptDeps(ctx), input);
      if (result.ok) return { redirectTo: result.destination };

      if (result.reason === "too_many_attempts") throw tooManyAttempts();
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: authMessages.invalidCredentials,
      });
    }),

  signOut: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
    await signOut(ctx.auth ?? null);
    return { redirectTo: "/login" as const };
  }),

  requestPasswordReset: publicProcedure
    .input(z.strictObject({ email }))
    .mutation(async ({ ctx, input }) => {
      const result = await requestPasswordReset(
        { ...attemptDeps(ctx), confirmUrl: confirmUrl() },
        input.email,
      );
      if (!result.ok) throw tooManyAttempts();

      return { message: authMessages.resetRequested };
    }),
});
