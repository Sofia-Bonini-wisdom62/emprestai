import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// A fronteira da rede e da chave (spec 002, RN-01 e RN-08; tasks.md, T-04): o lint do projeto
// só deixa o fetch no pexels.ts e o process.env no api-key.ts, e a varredura do código cobre o
// que o lint não enxerga.
const SKILL = ".claude/skills/imagens-equipamentos";
const LIB = `${SKILL}/scripts/lib`;
const NETWORK = join(LIB, "pexels.ts");
const ENTRY = join(LIB, "api-key.ts");

const eslint = new ESLint();

async function rulesFor(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

const ENV = "export const value = process.env.PEXELS_API_KEY;\n";
const LOAD = "process.loadEnvFile();\n";
const FETCH = 'export const response = fetch("https://example.com");\n';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const SCRIPTS = files(join(SKILL, "scripts"));
const SOURCES = SCRIPTS.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
const matching = (pattern: RegExp, except: string[]) =>
  SOURCES.filter((file) => !except.includes(file) && pattern.test(readFileSync(file, "utf8")));

describe("a fronteira da rede, CA-01 (spec 002, RN-01)", { timeout: 60_000 }, () => {
  it.each([
    ["o fetch global", FETCH, "no-restricted-globals"],
    ["um cliente de rede", 'import { request } from "node:https";\nexport { request };\n', "no-restricted-imports"],
    ["um processo filho", 'import { spawn } from "node:child_process";\nexport { spawn };\n', "no-restricted-imports"],
  ])("ca_01 o lint reprova %s num arquivo da skill", async (_, code, rule) => {
    expect(await rulesFor(code, `${LIB}/qualquer.ts`)).toContain(rule);
  });

  it("ca_01 o lint deixa o fetch só no pexels.ts", async () => {
    expect(await rulesFor(FETCH, `${LIB}/pexels.ts`)).not.toContain("no-restricted-globals");
    expect(await rulesFor(FETCH, `${LIB}/api-key.ts`)).toContain("no-restricted-globals");
  });

  it("ca_01 fora do pexels.ts, nenhum arquivo da skill chega à rede por um caminho que o lint não vê", () => {
    const pattern = /\b(globalThis|global)\.fetch|\bimport\(|from ["'](node:)?(http2|undici)["']/;

    expect(matching(pattern, [NETWORK])).toEqual([]);
  });
});

describe("a fronteira da chave, CA-07 (spec 002, RN-08)", { timeout: 60_000 }, () => {
  it.each([
    ["process.env", ENV],
    ["process.loadEnvFile", LOAD],
  ])("ca_07 o lint reprova %s num arquivo da skill", async (_, code) => {
    expect(await rulesFor(code, `${LIB}/qualquer.ts`)).toContain("no-restricted-properties");
  });

  it("ca_07 o lint deixa o process.env só no api-key.ts", async () => {
    expect(await rulesFor(ENV, `${LIB}/api-key.ts`)).not.toContain("no-restricted-properties");
    expect(await rulesFor(ENV, `${LIB}/pexels.ts`)).toContain("no-restricted-properties");
  });

  it("ca_07 o código da skill só está em .ts, que o lint da skill cobre", () => {
    // Fixture em .json ou .jpg pode existir; código em outra extensão escaparia do lint.
    const code = [".js", ".mjs", ".cjs", ".mts", ".cts", ".jsx", ".tsx"];

    expect(SCRIPTS.filter((file) => code.includes(extname(file)))).toEqual([]);
  });

  it("ca_07 fora do api-key.ts, nenhum arquivo da skill lê o ambiente nem o .env.local", () => {
    const pattern = new RegExp(
      [
        String.raw`\bprocess\.env\b`,
        String.raw`process\[["'\x60]env`,
        String.raw`Reflect\.get\(\s*process`,
        String.raw`\b(globalThis|global)\.process`,
        String.raw`from ["'](node:)?process["']`,
        String.raw`parseEnv|loadEnvFile|dotenv`,
        String.raw`\.env\.local["'\x60]`,
        String.raw`\bENV_FILE\b`,
      ].join("|"),
    );

    expect(matching(pattern, [ENTRY])).toEqual([]);
  });

  it("ca_07 só o pexels.ts tira a chave do ApiKey, para o cabeçalho da busca", () => {
    expect(matching(/\.reveal\(/, [NETWORK, ENTRY])).toEqual([]);
  });

  it("ca_07 o próprio api-key.ts lê o arquivo por util.parseEnv, sem carregar o ambiente", () => {
    const source = readFileSync(ENTRY, "utf8");

    expect(source).toContain("parseEnv(readFileSync(");
    expect(source).not.toMatch(/process\.env|loadEnvFile/);
  });
});
