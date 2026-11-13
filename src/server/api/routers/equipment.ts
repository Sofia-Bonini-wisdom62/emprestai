import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import {
  EQUIPMENT_PAGE_SIZE,
  getEquipment,
  listEquipment,
} from "@/server/services/equipment";

// O catálogo e o detalhe (spec 004). A área sai da sessão, nunca do input (RN-21), e
// strictObject recusa campo a mais, como um tenantId.
export const equipmentRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.strictObject({
        cursor: z.uuid().optional(),
        limit: z.number().int().min(1).max(EQUIPMENT_PAGE_SIZE).optional(),
        // O useInfiniteQuery do tRPC manda a direção junto com o cursor. O catálogo só anda para a
        // frente, e o service ignora o campo; sem ele aqui, o strictObject recusaria a tela.
        direction: z.enum(["forward", "backward"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Sem repassar o erro do banco: a mensagem do driver pode trazer host e usuário.
      try {
        return await listEquipment(
          ctx.db,
          ctx.tenantId,
          { cursor: input.cursor, limit: input.limit },
          ctx.equipmentImagesBaseUrl ?? null,
        );
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  byId: tenantProcedure
    .input(z.strictObject({ equipmentId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      let equipment: Awaited<ReturnType<typeof getEquipment>>;
      try {
        equipment = await getEquipment(
          ctx.db,
          ctx.tenantId,
          input.equipmentId,
          ctx.equipmentImagesBaseUrl ?? null,
        );
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Inexistente ou de outra área: a mesma resposta, sem dizer qual (CA-15).
      if (!equipment) throw new TRPCError({ code: "NOT_FOUND" });
      return equipment;
    }),
});
