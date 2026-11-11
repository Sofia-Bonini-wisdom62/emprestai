import type { MembershipRole, PrismaClient } from "@/generated/prisma/client";

export type SessionMembership = { tenantId: string; role: MembershipRole };

// A área e o papel da sessão vêm do vínculo da pessoa (RN-11, RN-15). Sem
// vínculo, ou com vínculo em mais de uma área, a sessão fica sem área: a v1 não
// tem troca de área (RN-12), e o código não escolhe uma por conta própria (RN-13).
export async function findSessionMembership(
  db: PrismaClient,
  userId: string,
): Promise<SessionMembership | null> {
  const memberships = await db.membership.findMany({
    where: { userId },
    select: { tenantId: true, role: true },
    take: 2,
  });

  return memberships.length === 1 ? memberships[0] : null;
}
