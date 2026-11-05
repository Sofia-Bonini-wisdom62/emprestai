import type { PrismaClient } from "@/generated/prisma/client";

export type HealthStatus =
  | { status: "ok" }
  | { status: "unavailable"; message: string };

// Sem repassar o erro: a mensagem do driver pode trazer host e usuário do banco.
export async function checkHealth(db: PrismaClient): Promise<HealthStatus> {
  try {
    await db.healthCheck.count();
    return { status: "ok" };
  } catch {
    return { status: "unavailable", message: "Banco de dados indisponível" };
  }
}
