// Seed do dev e da pilha do E2E (spec 001, T-04; ADR-005): a área default e a conta fictícia de
// Operações, e os equipamentos iniciais de prisma/data/ (spec 003, T-04; RN-11). Idempotente:
// rodar de novo não duplica nada (CA-13 da 001 e CA-07 da 003). Nunca roda em produção: lá, a
// default e o primeiro administrador vêm do passo do ADR-009, e os equipamentos, do passo do
// ADR-013. Roda fora do Next e lê o ambiente direto, pela exceção de rules/secrets.md: só a chave
// do Auth da máquina, para conta de teste.
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_TENANT, upsertDefaultTenant } from "./default-tenant";
import { loadEquipmentData } from "./equipment-data";
import { readEquipmentFiles } from "./equipment-files";

// A pessoa fictícia da spec 001 (CA-02), num domínio reservado para exemplo.
const OPERATIONS_ACCOUNT = { email: "flavia.rocha@example.com", name: "Flávia Rocha" };
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// O mínimo do Auth (RN-39).
const MIN_PASSWORD_LENGTH = 6;
const USERS_PER_PAGE = 100;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta ${name} no ambiente (.env.local; ver .env.example)`);
  }
  return value;
}

// Banco e Auth da máquina, ou da pilha do E2E: nenhum endereço de fora passa daqui.
function requireLocalUrl(name: string) {
  const value = requireEnv(name);
  const { hostname } = new URL(value);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`${name} aponta para ${hostname}: o seed só roda contra a máquina`);
  }
  return value;
}

async function findUserIdByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) {
      throw new Error(`O Auth recusou a listagem de contas: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email === email);
    if (user) {
      return user.id;
    }
    if (data.users.length < USERS_PER_PAGE) {
      return null;
    }
  }
}

// Cria a conta, ou deixa a que já existe com a senha do ambiente: rodar de novo converge.
async function upsertAuthUser(supabase: SupabaseClient, email: string, password: string) {
  const existingId = await findUserIdByEmail(supabase, email);

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, { password });
    if (error) {
      throw new Error(`O Auth recusou atualizar a conta: ${error.message}`);
    }
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`O Auth recusou criar a conta: ${error?.message ?? "sem usuário na resposta"}`);
  }
  return data.user.id;
}

async function main() {
  const databaseUrl = requireLocalUrl("DIRECT_URL");
  const supabaseUrl = requireLocalUrl("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const password = requireEnv("SEED_PASSWORD");

  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY precisa ser a chave sb_secret_ gerada para o Auth da máquina");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_PASSWORD precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
  });

  try {
    const tenant = await upsertDefaultTenant(db);

    const userId = await upsertAuthUser(supabase, OPERATIONS_ACCOUNT.email, password);

    await db.profile.upsert({
      where: { id: userId },
      update: { name: OPERATIONS_ACCOUNT.name },
      create: { id: userId, name: OPERATIONS_ACCOUNT.name },
    });
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      update: { role: "operations" },
      create: { tenantId: tenant.id, userId, role: "operations" },
    });

    // O mesmo carregamento do passo de produção, depois da área e da conta: cria o que falta e,
    // no que já existe, só troca a imagem. Sem o manifesto aprovado, grava sem foto (RN-17).
    const { list, manifest } = readEquipmentFiles();
    const equipment = await loadEquipmentData(db, list, manifest);

    console.log(
      `Seed: área ${DEFAULT_TENANT.slug} e ${OPERATIONS_ACCOUNT.name} (${OPERATIONS_ACCOUNT.email}) em Operações`,
    );
    console.log(
      `Seed: equipamentos iniciais na área ${DEFAULT_TENANT.slug}: ${equipment.created} criados, ${equipment.imageUpdated} com a imagem trocada, ${equipment.withoutImage} sem foto`,
    );
  } finally {
    await db.$disconnect();
  }
}

await main();
