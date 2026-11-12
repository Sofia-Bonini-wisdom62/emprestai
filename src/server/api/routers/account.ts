import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authMessages } from "@/lib/auth-messages";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  canSetPassword,
  enterAccount,
  getAccount,
  saveName,
} from "@/server/services/account";
import { setPassword } from "@/server/services/auth";

// Um campo só, sem espaços nas pontas e com até 80 caracteres (RN-20, RN-27).
const name = z
  .string()
  .trim()
  .min(1, authMessages.nameRequired)
  .max(80, authMessages.nameTooLong);

const passwordMessages = {
  weak_password: authMessages.weakPassword,
  same_password: authMessages.samePassword,
  failed: authMessages.setupFailed,
} as const;

export const accountRouter = createTRPCRouter({
  // Sem repassar o erro do banco: a mensagem do driver pode trazer host e usuário.
  me: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    try {
      return await getAccount(ctx.db, ctx.session, ctx.role ?? null);
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  // A senha no convite e na redefinição; o nome quando falta (RN-21). A entrada
  // pelo link do convite cria o vínculo pela mesma regra do auth.signIn (RN-13).
  // strict() recusa campo a mais, como um tenantId (CA-14).
  setup: protectedProcedure
    .input(
      z.strictObject({
        password: z.string().min(1).max(256).optional(),
        name: name.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.password !== undefined) {
        // Senha nova sem a atual, só na sessão que entrou pelo link há menos de
        // 1 hora (RN-59). Fora disso, nada muda, nem a senha nem o nome.
        const now = Math.floor(Date.now() / 1000);
        if (!canSetPassword(ctx.linkEntryAt ?? null, now)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: authMessages.setupFailed,
          });
        }

        const result = await setPassword(ctx.auth ?? null, input.password);
        if (!result.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordMessages[result.reason],
          });
        }
      }

      let destination: Awaited<ReturnType<typeof enterAccount>>;
      try {
        if (input.name !== undefined) {
          await saveName(ctx.db, ctx.session.userId, input.name);
        }
        destination = await enterAccount(
          ctx.db,
          ctx.session.userId,
          ctx.firstEntryTenantSlug,
        );
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: authMessages.setupFailed,
        });
      }

      // Vínculo em mais de uma área: sem destino, e sem dizer o motivo (RN-52).
      if (!destination) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: authMessages.setupFailed,
        });
      }
      return { redirectTo: destination };
    }),
});
