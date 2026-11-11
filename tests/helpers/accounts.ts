import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import type { AuthPort, PasswordResetPort } from "@/server/services/auth";
import { rateLimitRulesFrom } from "@/server/services/rate-limit";

// A senha que o Auth de mentira trata como a atual da conta (RN-56).
export const CURRENT_PASSWORD = "senha-atual";

// Auth de mentira para o createCaller: registra cada chamada e responde como o
// Auth responderia. Entrar só aceita os e-mails de `users`, com qualquer senha.
// O caminho real até o Auth se prova no E2E (ADR-006, seção 2).
export function fakeAuth(users: Record<string, string> = {}) {
  const calls = {
    signIn: [] as string[],
    signOut: [] as string[],
    reset: [] as { email: string; redirectTo: string }[],
    updateUser: [] as string[],
  };

  const auth: AuthPort & PasswordResetPort = {
    async signInWithPassword({ email }) {
      calls.signIn.push(email);
      const id = users[email];
      return id
        ? { data: { user: { id } }, error: null }
        : { data: { user: null }, error: { code: "invalid_credentials" } };
    },
    async signOut({ scope }) {
      calls.signOut.push(scope);
      return { error: null };
    },
    async resetPasswordForEmail(email, { redirectTo }) {
      calls.reset.push({ email, redirectTo });
      return users[email] ? { error: null } : { error: { code: "user_not_found" } };
    },
    async updateUser({ password }) {
      calls.updateUser.push(password);
      if (password.length < 6) return { error: { code: "weak_password" } };
      if (password === CURRENT_PASSWORD) {
        return { error: { code: "same_password" } };
      }
      return { error: null };
    },
  };

  return { auth, calls };
}

// Limites altos o bastante para os testes que não são do CA-22.
export const generousRules = rateLimitRulesFrom({
  RATE_LIMIT_IP_MAX: 1000,
  RATE_LIMIT_IP_WINDOW_SECONDS: 60,
  RATE_LIMIT_USER_MAX: 1000,
  RATE_LIMIT_USER_WINDOW_SECONDS: 60,
});

// A área da primeira entrada deste arquivo de teste, no lugar da default: o
// first-admin.test.ts cria e apaga a default no mesmo banco, ao mesmo tempo. A
// default de verdade se prova no E2E, onde o seed a cria.
export async function createFirstEntryTenant(db: PrismaClient) {
  const tenant = await db.tenant.create({
    data: { slug: `primeira-entrada-${randomUUID()}`, name: "Área de teste" },
  });

  async function cleanup() {
    await db.membership.deleteMany({ where: { tenantId: tenant.id } });
    await db.tenant.delete({ where: { id: tenant.id } });
  }

  return { tenant, slug: tenant.slug, cleanup };
}

// Duas áreas, Beatriz como Colaborador só na A e Flávia como Operações só na B,
// cada uma com nome (CA-14).
export async function createTwoAreas(db: PrismaClient) {
  const tenantA = await db.tenant.create({
    data: { slug: `a-${randomUUID()}`, name: "Área A" },
  });
  const tenantB = await db.tenant.create({
    data: { slug: `b-${randomUUID()}`, name: "Área B" },
  });
  const inA = { userId: randomUUID(), email: "beatriz.fontes@example.com" };
  const inB = { userId: randomUUID(), email: "flavia.rocha@example.com" };

  await db.membership.createMany({
    data: [
      { tenantId: tenantA.id, userId: inA.userId, role: "member" },
      { tenantId: tenantB.id, userId: inB.userId, role: "operations" },
    ],
  });
  await db.profile.createMany({
    data: [
      { id: inA.userId, name: "Beatriz Fontes" },
      { id: inB.userId, name: "Flávia Rocha" },
    ],
  });

  // O que a área B tem de vínculo, papel e nome, para comparar antes e depois.
  async function snapshotB() {
    return {
      memberships: await db.membership.findMany({
        where: { OR: [{ tenantId: tenantB.id }, { userId: inB.userId }] },
        orderBy: { id: "asc" },
      }),
      profile: await db.profile.findUnique({ where: { id: inB.userId } }),
    };
  }

  async function cleanup() {
    const userIds = [inA.userId, inB.userId];
    await db.membership.deleteMany({ where: { userId: { in: userIds } } });
    await db.profile.deleteMany({ where: { id: { in: userIds } } });
    await db.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  }

  return { tenantA, tenantB, inA, inB, snapshotB, cleanup };
}
