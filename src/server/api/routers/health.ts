import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { checkHealth } from "@/server/services/health";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.input(z.void()).query(({ ctx }) => checkHealth(ctx.db)),
});
