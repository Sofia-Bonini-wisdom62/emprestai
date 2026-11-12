import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { createTestDb } from "../tests/helpers/db";

const databaseUrl = inject("databaseUrl");
const db = createTestDb(databaseUrl);

// Roda o script como o workflow roda, e o execFileSync falha se ele sair com erro.
function runFirstAdmin(email: string) {
  return execFileSync(
    process.execPath,
    ["--import", "./prisma/resolve-ts.mjs", "prisma/first-admin.ts"],
    {
      env: { ...process.env, DIRECT_URL: databaseUrl, FIRST_ADMIN_EMAIL: email },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

const findDefault = () => db.tenant.findMany({ where: { slug: "default" } });
const defaultMemberships = () =>
  db.membership.findMany({ where: { tenant: { slug: "default" } } });

// Os casos de um arquivo rodam em ordem: o da conta inexistente vem antes, com o banco ainda sem
// a default.
//
// Cada caso sobe um processo Node que carrega o client gerado e abre a própria conexão com o
// banco. No Windows, cada caso levou de 0,9 a 2,5 s com este arquivo rodando sozinho, e de 1,6 a
// 9,5 s com a suíte inteira: o primeiro caso cai no começo da rodada, quando os outros arquivos
// ainda importam em paralelo e o processo filho disputa a CPU com eles. O padrão de 5 s do Vitest
// é para teste sem processo filho, e o CA-24 não tem limite de tempo: o de 30 s é cerca do triplo
// do pior caso medido e só pega o processo que trava.
describe("primeiro administrador (ADR-009)", { timeout: 30_000 }, () => {
  // Conta fictícia no schema auth da imagem, como a que o convite do painel cria em produção.
  const account = { id: randomUUID(), email: `admin.${randomUUID()}@example.test` };

  // A primeira consulta do arquivo inicializa o client de teste e abre a conexão com o contêiner,
  // o que no supabase.test.ts levou 1,8 s. Ela fica aqui, e não no primeiro caso.
  beforeAll(async () => {
    await db.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await db.membership.deleteMany({ where: { userId: account.id } });
    await db.tenant.deleteMany({ where: { slug: "default" } });
    await db.$executeRaw`DELETE FROM auth.users WHERE id = ${account.id}::uuid`;
    await db.$disconnect();
  });

  it("ca_24 com e-mail de conta que não existe, cria a default, avisa e não grava vínculo", async () => {
    expect(await findDefault()).toEqual([]);

    const output = runFirstAdmin(`ninguem.${randomUUID()}@example.test`);

    expect(output).toContain("::warning::A conta do FIRST_ADMIN_EMAIL ainda não existe no Auth");
    expect(await findDefault()).toEqual([
      expect.objectContaining({ slug: "default", name: "default" }),
    ]);
    expect(await defaultMemberships()).toEqual([]);
  });

  // Escolha da pessoa em 2026-11-11: o deploy não trava enquanto o secret não existe.
  it("adr_009 sem o secret FIRST_ADMIN_EMAIL, garante a default, avisa e não falha", async () => {
    const output = runFirstAdmin("");

    expect(output).toContain("::warning::Sem FIRST_ADMIN_EMAIL");
    expect(await findDefault()).toHaveLength(1);
    expect(await defaultMemberships()).toEqual([]);
  });

  it("ca_24 com a conta no Auth, grava o vínculo operations dela na default", async () => {
    await db.$executeRaw`
      INSERT INTO auth.users (id, email) VALUES (${account.id}::uuid, ${account.email})`;

    const output = runFirstAdmin(account.email);

    expect(output).toContain("vínculo operations na área default garantido");
    expect(output).not.toContain(account.email);
    expect(await defaultMemberships()).toEqual([
      expect.objectContaining({ userId: account.id, role: "operations" }),
    ]);
  });

  it("ca_24 rodado de novo, não muda nada", async () => {
    const tenantsBefore = await findDefault();
    const membershipsBefore = await defaultMemberships();

    runFirstAdmin(account.email);

    expect(await findDefault()).toEqual(tenantsBefore);
    expect(await defaultMemberships()).toEqual(membershipsBefore);
  });
});
