// Passo do primeiro administrador no workflow de produção (ADR-009; spec 001, CA-24): upsert da
// área default e do vínculo operations da conta do FIRST_ADMIN_EMAIL, que a pessoa convidou pelo
// painel do Supabase. Roda a cada deploy, depois das migrations; rodar de novo não muda nada.
// Roda fora do Next e lê o ambiente direto, pela exceção de rules/secrets.md: só FIRST_ADMIN_EMAIL
// e a URL do banco que o workflow passa. Não escreve no log nem o e-mail nem o id da conta.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT, upsertDefaultTenant } from "./default-tenant";

// Aviso que o GitHub Actions mostra no resumo da rodada, sem falhar o passo.
const warn = (message: string) => console.log(`::warning::${message}`);

const databaseUrl = process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("Falta DIRECT_URL: o passo precisa da URL do banco que o workflow passa");
}
const email = process.env.FIRST_ADMIN_EMAIL?.trim() ?? "";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }) });

try {
  const tenant = await upsertDefaultTenant(db);

  if (!email) {
    // Sem o secret, não há conta a procurar: a rodada que já tiver o secret completa.
    warn(`Sem FIRST_ADMIN_EMAIL: área ${DEFAULT_TENANT.slug} garantida, nenhum vínculo gravado.`);
  } else {
    // Consulta parametrizada: o e-mail vai como parâmetro, nunca no texto do SQL.
    const users = await db.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM auth.users WHERE lower(email) = lower(${email}) LIMIT 2`;

    if (users.length === 0) {
      warn(
        `A conta do FIRST_ADMIN_EMAIL ainda não existe no Auth: área ${DEFAULT_TENANT.slug} garantida, nenhum vínculo gravado. A rodada depois do convite completa.`,
      );
    } else if (users.length > 1) {
      throw new Error("Mais de uma conta do Auth com o e-mail do FIRST_ADMIN_EMAIL: nenhum vínculo gravado");
    } else {
      const userId = users[0].id;
      await db.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId } },
        update: { role: "operations" },
        create: { tenantId: tenant.id, userId, role: "operations" },
      });
      console.log(`Primeiro administrador: vínculo operations na área ${DEFAULT_TENANT.slug} garantido.`);
    }
  }
} finally {
  await db.$disconnect();
}
