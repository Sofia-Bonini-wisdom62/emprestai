import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { inspect } from "node:util";

import { afterAll, describe, expect, it } from "vitest";

import { ApiKey, ApiKeyError, ENV_FILE, readApiKey } from "./api-key";

// Chave fictícia, num arquivo de teste: nenhum teste lê o .env.local da pessoa.
const KEY = "chave-ficticia-de-teste-0123456789";
const dir = mkdtempSync(join(tmpdir(), "api-key-"));

function envFile(name: string, text: string) {
  const path = join(dir, name);
  writeFileSync(path, text);
  return path;
}

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Caracteres que uma colagem traz sem a pessoa ver, montados pelo código para ficarem visíveis aqui.
const CURLY = String.fromCharCode(0x201c);
const ZERO_WIDTH = String.fromCharCode(0x200b);

const invalid = (path: string) =>
  `A PEXELS_API_KEY no ${path} tem espaço, quebra de linha ou caractere fora do ASCII visível, como aspas curvas. Confira se a chave foi colada inteira.`;

// O erro de readApiKey e tudo o que um log mostraria dele.
function errorOf(path: string) {
  try {
    readApiKey(path);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiKeyError);
    return {
      message: (error as Error).message,
      shown: [String(error), (error as Error).stack ?? "", inspect(error), JSON.stringify(error)].join("\n"),
    };
  }
  throw new Error("readApiKey deveria ter falhado");
}

describe("readApiKey, CA-13 (spec 002, RN-08 e RN-19)", () => {
  it("ca_13 lê só a PEXELS_API_KEY do arquivo, entre outras variáveis", () => {
    const path = envFile(
      "completo.env",
      ["DATABASE_URL=postgresql://exemplo", `PEXELS_API_KEY=${KEY}`, "SUPABASE_SECRET_KEY=outra-ficticia", ""].join("\n"),
    );

    expect(readApiKey(path).reveal()).toBe(KEY);
  });

  it("ca_13 a chave impressa, em texto ou em JSON não aparece", () => {
    const apiKey = new ApiKey(KEY);
    const shown = [String(apiKey), `${apiKey}`, JSON.stringify({ apiKey }), inspect(apiKey), inspect({ apiKey })].join("\n");

    expect(shown).not.toContain(KEY);
    expect(String(apiKey)).toBe("[PEXELS_API_KEY]");
  });

  it.each([
    ["sem o arquivo", () => join(dir, "nao-existe.env"), (path: string) =>
      `O ${path} não existe. Copie o .env.example para .env.local e preencha a PEXELS_API_KEY.`],
    ["sem a variável", () => envFile("sem.env", "DATABASE_URL=postgresql://exemplo\n"), (path: string) =>
      `A PEXELS_API_KEY está vazia ou ausente no ${path}. Preencha com a sua chave do Pexels.`],
    ["com a variável vazia", () => envFile("vazia.env", "PEXELS_API_KEY=\n"), (path: string) =>
      `A PEXELS_API_KEY está vazia ou ausente no ${path}. Preencha com a sua chave do Pexels.`],
    ["com espaço no meio da chave", () => envFile("espaco.env", `PEXELS_API_KEY="${KEY} ${KEY}"\n`), invalid],
    ["com aspas curvas de uma colagem", () => envFile("aspas.env", `PEXELS_API_KEY=${CURLY}${KEY}${CURLY}\n`), invalid],
    ["com um espaço invisível", () => envFile("invisivel.env", `PEXELS_API_KEY=${KEY}${ZERO_WIDTH}\n`), invalid],
  ])("ca_13 o erro %s não traz a chave", (_, makePath, expected) => {
    const path = makePath();
    const { message, shown } = errorOf(path);

    expect(message).toBe(expected(path));
    expect(shown).not.toContain(KEY);
  });

  it("ca_13 o arquivo padrão é o .env.local da raiz do repositório", () => {
    // A raiz é a pasta de onde o Vitest roda; o realpath iguala os caminhos curtos do Windows.
    expect(basename(ENV_FILE)).toBe(".env.local");
    expect(realpathSync.native(dirname(ENV_FILE))).toBe(realpathSync.native(resolve(".")));
  });
});
