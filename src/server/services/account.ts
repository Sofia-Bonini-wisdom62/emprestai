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

// Sem nome, a pessoa vai antes a /account/setup (CA-06), tenha ou não papel: a
// sessão do convite que ainda não passou por lá não tem vínculo. Com nome e sem
// papel, o que inclui o vínculo em mais de uma área (RN-46), não há destino:
// quem chama recusa a entrada sem dizer o motivo (RN-52). O /login usa a mesma
// regra para quem já tem sessão (RN-23); o auth.signIn confere o vínculo antes.
export function destinationOf(account: {
  name: string | null;
  role: MembershipRole | null;
}): Destination | null {
  if (!account.name) return "/account/setup";
  if (!account.role) return null;

  return account.role === "operations" ? "/operations/loans" : "/catalog";
}

// Quanto tempo depois de entrar pelo link do convite ou da redefinição a sessão
// ainda pode definir a senha sem informar a atual (RN-59; decisão da pessoa).
export const LINK_PASSWORD_WINDOW_SECONDS = 60 * 60;

// A senha nova só vale para a sessão que entrou pelo link há menos de 1 hora
// (RN-59). linkEntryAt é o horário dessa entrada, em segundos, ou null quando a
// sessão entrou com senha. O account.setup confere isto no servidor, e a tela
// usa a mesma regra para mostrar o campo.
export function canSetPassword(linkEntryAt: number | null, nowSeconds: number) {
  return (
    linkEntryAt !== null &&
    nowSeconds - linkEntryAt >= 0 &&
    nowSeconds - linkEntryAt < LINK_PASSWORD_WINDOW_SECONDS
  );
}

export type SetupFields = { password: boolean; name: boolean };

// O que /account/setup pede (RN-21; docs/layout.md, tela 7): a senha quando a sessão
// veio do link do e-mail, o do convite ou o da redefinição, e o nome quando ele falta
// (RN-20, CA-06). Assim o convite pede os dois, e a redefinição de quem tem nome, só a
// senha. Sem nenhum dos dois, a tela não tem o que pedir.
export function setupFields(
  account: { name: string | null },
  fromEmailLink: boolean,
): SetupFields {
  return { password: fromEmailLink, name: !account.name };
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
