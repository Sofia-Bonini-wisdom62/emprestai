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

// O Playwright não carrega o client gerado do Prisma, que usa import.meta. Por isso os
// casos gravam pelo Prisma CLI, como o globalSetup aplica as migrations, e leem pela API do app.
// Só no banco da pilha efêmera, nunca no de dev.
export function sql(script: string) {
  const url = fromSetup("E2E_DATABASE_URL");
  if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
    throw new Error("O E2E só grava no banco local da pilha efêmera");
  }

  execFileSync(process.execPath, [PRISMA_CLI, "db", "execute", "--stdin"], {
    input: script,
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: ["pipe", "ignore", "inherit"],
  });
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

export async function createAccount(email: string, password: string) {
  const { data, error } = await adminAuth().createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("O Auth não criou a conta");
  return data.user.id;
}

export function ensureFirstEntryTenant() {
  sql(`INSERT INTO "tenants" ("slug", "name") VALUES ('default', 'Área de teste')
       ON CONFLICT ("slug") DO NOTHING;`);
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

// O cookie de sessão do @supabase/ssr, inteiro ou em pedaços (.0, .1). Os do code verifier
// do PKCE, que o pedido de redefinição grava, não são sessão e ficam de fora.
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export async function sessionCookies(request: APIRequestContext) {
  const { cookies } = await request.storageState();
  return cookies.filter((cookie) => SESSION_COOKIE.test(cookie.name));
}
