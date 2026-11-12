import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PRISMA_CLI = "node_modules/prisma/build/index.js";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

// O globalSetup grava estes valores, todos da pilha efêmera da rodada.
function fromSetup(
  name: "E2E_BASE_URL" | "E2E_DATABASE_URL" | "E2E_SUPABASE_URL" | "E2E_SUPABASE_SECRET_KEY",
) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não veio do globalSetup do E2E`);
  return value;
}

// No Windows, abrir um arquivo do node_modules às vezes falha com EBUSY, quando outro processo da
// máquina o segura naquele instante. O Prisma CLI já caiu assim ao carregar os próprios módulos,
// antes de abrir a conexão. Só essa queda tenta de novo, até duas vezes, e qualquer outra falha
// aparece na hora. Se um script tivesse rodado antes da queda, repeti-lo seria visível: os DELETE
// não mudam nada, e os INSERT falham com chave duplicada.
const BUSY_RETRIES = 2;

function busyWhileLoading(stderr: string) {
  return stderr.includes("EBUSY") && stderr.includes("internal/modules");
}

// O Playwright não carrega o client gerado do Prisma, que usa import.meta. Por isso os
// casos gravam pelo Prisma CLI, como o globalSetup aplica as migrations, e leem pela API do app.
// Só no banco da pilha efêmera, nunca no de dev. Cada chamada sobe um processo do CLI, o que
// leva cerca de 4 s no Windows.
export function sql(script: string) {
  const url = fromSetup("E2E_DATABASE_URL");
  if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
    throw new Error("O E2E só grava no banco local da pilha efêmera");
  }

  for (let attempt = 0; ; attempt++) {
    try {
      execFileSync(process.execPath, [PRISMA_CLI, "db", "execute", "--stdin"], {
        input: script,
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
        stdio: ["pipe", "ignore", "pipe"],
      });
      return;
    } catch (error) {
      const stderr = String((error as { stderr?: Buffer }).stderr ?? "");
      if (attempt < BUSY_RETRIES && busyWhileLoading(stderr)) {
        const cause = stderr.match(/Error: EBUSY.*/)?.[0] ?? "EBUSY";
        console.warn(`Prisma CLI caiu ao carregar (${cause}); tentativa ${attempt + 2}`);
        continue;
      }
      process.stderr.write(stderr);
      throw error;
    }
  }
}

// A API de admin do Auth da pilha, só para criar, convidar e bloquear contas de teste.
export function adminAuth() {
  return createClient(fromSetup("E2E_SUPABASE_URL"), fromSetup("E2E_SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;
}

// Um e-mail novo a cada caso: o limite do CA-22 conta por e-mail, e a pilha dura a rodada inteira.
export function uniqueEmail(person: string) {
  return `${person}+${randomUUID().slice(0, 8)}@example.com`;
}

// O que os casos criam na pilha, para o cleanupAccounts apagar: o ca_13 do seed.e2e.ts conta
// todas as contas e áreas da pilha.
const created = { users: [] as string[], tenants: [] as string[] };

export function trackUser(id: string) {
  created.users.push(id);
  return id;
}

export function trackTenant(id: string) {
  created.tenants.push(id);
  return id;
}

export async function createAccount(email: string, password: string) {
  const { data, error } = await adminAuth().createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("O Auth não criou a conta");
  return trackUser(data.user.id);
}

// Os ids vêm do Auth e do randomUUID, sempre UUID: entram no SQL sem risco.
const uuidList = (ids: string[]) => ids.map((id) => `'${id}'::uuid`).join(", ");

// Um processo só do Prisma CLI para as tabelas do app, e as contas do Auth apagadas em paralelo
// entre si. Nenhuma tabela do app aponta para auth.users, então a ordem entre as duas partes não
// importa. Antes, as contas eram apagadas uma depois da outra, e o auth.e2e.ts, que também grava
// áreas, subia o CLI duas vezes. Com outra suíte rodando na máquina, o afterAll do auth.e2e.ts e o
// do account.e2e.ts passaram dos 30 s.
export async function cleanupAccounts() {
  const { users, tenants } = created;
  const statements: string[] = [];
  if (users.length) {
    statements.push(
      `DELETE FROM "memberships" WHERE "user_id" IN (${uuidList(users)});`,
      `DELETE FROM "profiles" WHERE "id" IN (${uuidList(users)});`,
    );
  }
  if (tenants.length) {
    statements.push(
      `DELETE FROM "memberships" WHERE "tenant_id" IN (${uuidList(tenants)});`,
      `DELETE FROM "tenants" WHERE "id" IN (${uuidList(tenants)});`,
    );
  }
  if (statements.length) sql(statements.join("\n"));

  const admin = adminAuth();
  const results = await Promise.all(users.map((id) => admin.deleteUser(id)));
  const failed = results.find(({ error }) => error);
  if (failed?.error) throw failed.error;
  created.users = [];
  created.tenants = [];
}

type TrpcResponse = { status: number; body: unknown };

// O formato HTTP do tRPC com superjson: o input vai em { json }, e a resposta volta assim também.
export async function mutation(
  request: APIRequestContext,
  path: string,
  input?: unknown,
): Promise<TrpcResponse> {
  // Sem input, o cliente do tRPC manda {} como JSON: o content-type vai sempre.
  const response = await request.post(`/api/trpc/${path}`, {
    data: input === undefined ? {} : { json: input },
  });
  return { status: response.status(), body: await response.json() };
}

export async function query(
  request: APIRequestContext,
  path: string,
): Promise<TrpcResponse> {
  const response = await request.get(`/api/trpc/${path}`);
  return { status: response.status(), body: await response.json() };
}

export function data(value: unknown) {
  return { result: { data: { json: value } } };
}

export function failure(code: string, httpStatus: number, message?: string) {
  return {
    error: {
      json: {
        ...(message === undefined ? {} : { message }),
        data: { code, httpStatus },
      },
    },
  };
}

// Um segundo navegador, com cookies próprios, no mesmo app.
export function newRequest(playwright: {
  request: {
    newContext: (options: { baseURL: string }) => Promise<APIRequestContext>;
  };
}) {
  return playwright.request.newContext({ baseURL: fromSetup("E2E_BASE_URL") });
}

// O cookie de sessão do @supabase/ssr, inteiro ou em pedaços (.0, .1), de um request ou de um
// navegador do Playwright. Os de code verifier do PKCE não são sessão e ficam de fora.
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export async function sessionCookies(target: {
  storageState(): Promise<{ cookies: { name: string; httpOnly: boolean }[] }>;
}) {
  const { cookies } = await target.storageState();
  return cookies.filter((cookie) => SESSION_COOKIE.test(cookie.name));
}
