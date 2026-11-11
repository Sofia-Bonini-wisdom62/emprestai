import "server-only";

import { appRouter } from "@/server/api/root";
import { createCallerFactory, createContext } from "@/server/api/trpc";

// O tRPC chamado de um Server Component: os mesmos procedimentos e a mesma
// checagem de sessão e de área da rota HTTP, sem ler o Prisma por fora deles
// (ADR-001, 2.3 e seção 3).
export async function serverCaller() {
  return createCallerFactory(appRouter)(await createContext());
}
