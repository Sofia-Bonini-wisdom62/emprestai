import type { MembershipRole, PrismaClient } from "@/generated/prisma/client";
import { findSessionMembership } from "@/server/services/membership";

export type Destination = "/catalog" | "/operations/loans" | "/account/setup";

// A área da primeira entrada, por regra explícita (RN-13). Não é destino
// implícito de quem não tem vínculo: a área da sessão continua saindo do
// vínculo (ADR-005, seção 4; RN-15).
export const FIRST_ENTRY_TENANT_SLUG = "default";

// Quem não tem vínculo nenhum ganha o de Colaborador na área da primeira
// entrada. O skipDuplicates faz duas entradas simultâneas gravarem uma linha só.
async function ensureFirstMembership(
  db: PrismaClient,
  userId: string,
  tenantSlug: string,
) {
  const existing = await db.membership.count({ where: { userId } });
  if (existing > 0) return;

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error("A área da primeira entrada não existe.");

  await db.membership.createMany({
    data: [{ tenantId: tenant.id, userId, role: "member" }],
    skipDuplicates: true,
  });
}

// Sem nome, a pessoa vai antes a /account/setup (CA-06). Sem papel, o que inclui
// o vínculo em mais de uma área (RN-46), não há destino: quem chama recusa a
// entrada sem dizer o motivo (RN-52). O /login usa a mesma regra para quem já
// tem sessão (RN-23).
export function destinationOf(account: {
  name: string | null;
  role: MembershipRole | null;
}): Destination | null {
  if (!account.role) return null;
  if (!account.name) return "/account/setup";

  return account.role === "operations" ? "/operations/loans" : "/catalog";
}

async function destinationFor(
  db: PrismaClient,
  userId: string,
): Promise<Destination | null> {
  const membership = await findSessionMembership(db, userId);
  if (!membership) return null;

  const profile = await db.profile.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  return destinationOf({ name: profile?.name ?? null, role: membership.role });
}

// A entrada, depois que o Auth aceitou a pessoa: chamada pelo auth.signIn e pelo
// account.setup (RN-13). O teste troca a área da primeira entrada por uma só
// dele, porque outros arquivos criam e apagam a default no mesmo banco.
export async function enterAccount(
  db: PrismaClient,
  userId: string,
  firstEntryTenantSlug: string = FIRST_ENTRY_TENANT_SLUG,
): Promise<Destination | null> {
  await ensureFirstMembership(db, userId, firstEntryTenantSlug);
  return destinationFor(db, userId);
}

// O nome é da pessoa, não da área: profiles não tem tenant_id (RN-17).
export async function saveName(db: PrismaClient, userId: string, name: string) {
  await db.profile.upsert({
    where: { id: userId },
    create: { id: userId, name },
    update: { name },
  });
}

export type Account = {
  name: string | null;
  email: string | null;
  role: MembershipRole | null;
};

// Só dados da própria sessão: o nome pelo id do Auth, o papel pelo vínculo que o
// createContext já resolveu.
export async function getAccount(
  db: PrismaClient,
  session: { userId: string; email: string | null },
  role: MembershipRole | null,
): Promise<Account> {
  const profile = await db.profile.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  return { name: profile?.name ?? null, email: session.email, role };
}
