import { accountRouter } from "@/server/api/routers/account";
import { authRouter } from "@/server/api/routers/auth";
import { healthRouter } from "@/server/api/routers/health";
import { createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  auth: authRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
