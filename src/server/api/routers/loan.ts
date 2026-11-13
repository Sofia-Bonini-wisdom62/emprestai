import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, DomainRefusal, tenantProcedure } from "@/server/api/trpc";
import { createLoan, loanRefusalMessages } from "@/server/services/loan";

// Solicitar empréstimo (spec 004). A área e a pessoa saem da sessão; o input só traz o
// equipamento, e strictObject recusa tenantId, userId ou dueOn (RN-21; CA-14).
export const loanRouter = createTRPCRouter({
  create: tenantProcedure
    .input(z.strictObject({ equipmentId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      let result: Awaited<ReturnType<typeof createLoan>>;
      try {
        result = await createLoan(ctx.db, {
          tenantId: ctx.tenantId,
          userId: ctx.session.userId,
          equipmentId: input.equipmentId,
          now: (ctx.now ?? (() => new Date()))(),
        });
      } catch {
        // Sem repassar o erro do banco: a mensagem do driver pode trazer host e usuário.
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      if (result.ok) return result.loan;

      // Inexistente ou de outra área: a mesma resposta, sem dizer qual (CA-15).
      if (result.reason === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND" });

      const message = loanRefusalMessages[result.reason];
      throw new TRPCError({
        code: result.reason === "EQUIPMENT_UNAVAILABLE" ? "CONFLICT" : "FORBIDDEN",
        message,
        cause: new DomainRefusal(result.reason, message),
      });
    }),
});
