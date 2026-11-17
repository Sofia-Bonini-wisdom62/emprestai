// O passo de produção dos equipamentos iniciais (spec 003, T-03; CA-09), rodado como o workflow
// roda: por node --import ./prisma/resolve-ts.mjs, só com DIRECT_URL no ambiente.
// O script grava na área default, e o first-admin.test.ts cria e apaga a default no banco que os
// outros arquivos dividem. Por isso este arquivo usa um banco próprio, no mesmo Postgres do
// Testcontainers, com as migrations aplicadas do zero: é o "banco vazio com a área default" do CA.
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { complete } from "../.claude/skills/imagens-equipamentos/scripts/lib/manifest.fixtures";
import { createTestDb } from "../tests/helpers/db";
import { upsertDefaultTenant } from "./default-tenant";
import { CATEGORY_NAMES, imageObjectFor } from "./equipment-data";

const PRISMA_CLI = "node_modules/prisma/build/index.js";
const SCRIPT = "prisma/load-equipment.ts";
const LIST_PATH = "prisma/data/equipment.json";
const MANIFEST_PATH = "prisma/data/equipment-images.json";

const sharedUrl = inject("databaseUrl");
const admin = createTestDb(sharedUrl);

// Só letras e dígitos: o nome entra no texto do CREATE DATABASE, que não aceita parâmetro.
const database = `step_${randomUUID().replaceAll("-", "")}`;
const stepUrl = (() => {
  const url = new URL(sharedUrl);
  url.pathname = `/${database}`;
  return url.toString();
})();
const db = createTestDb(stepUrl);

const workDir = mkdtempSync(join(tmpdir(), "emprestai-load-equipment-"));

// O que o sistema exige para um processo Node abrir rede no Windows, mais o PATH. Nenhuma variável
// do projeto passa: o passo roda só com a que o caso lhe dá.
const OS_ENV = Object.fromEntries(
  ["SystemRoot", "PATH"].flatMap((name) => {
    const value = process.env[name];
    return value ? [[name, value]] : [];
  }),
);

// Roda o script como o workflow roda. Não lança: devolve a saída e o código de saída.
function runStep(args: string[] = [], env: Record<string, string> = { DIRECT_URL: stepUrl }) {
  return spawnSync(process.execPath, ["--import", "./prisma/resolve-ts.mjs", SCRIPT, ...args], {
    // O tipo do Next exige NODE_ENV, que o passo não lê e o workflow não define.
    env: { ...OS_ENV, ...env } as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
}

function writeJson(name: string, content: unknown) {
  const path = join(workDir, name);
  writeFileSync(path, JSON.stringify(content));
  return path;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

type ListItem = { patrimonio: string; nome: string; categoria: string; situacao: string };
const list = readJson(LIST_PATH) as ListItem[];
// O manifesto aprovado, quando a T-07 da spec 002 o puser no repositório; até lá, nenhum.
const approved = existsSync(MANIFEST_PATH) ? (readJson(MANIFEST_PATH) as ReturnType<typeof complete>) : null;

// As chaves da lista e o que elas viram no banco (RN-03 e RN-05).
const CATEGORY = { notebook: "Notebooks", monitor: "Monitores", cabo: "Cabos", camera: "Câmeras" };
const STATUS = { disponivel: "available", manutencao: "maintenance" };

const equipments = () =>
  db.equipment.findMany({
    orderBy: { assetTag: "asc" },
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      imageObject: true,
      tenant: { select: { slug: true } },
      category: { select: { name: true } },
    },
  });
const categories = () => db.equipmentCategory.findMany({ orderBy: { name: "asc" } });

// Cada caso sobe um processo Node que carrega o client gerado e abre a própria conexão, como os do
// first-admin.test.ts, que levaram até 9,5 s com a suíte inteira. O limite só pega o que trava.
describe("o passo de produção dos equipamentos iniciais (ADR-013)", { timeout: 60_000 }, () => {
  beforeAll(async () => {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    execFileSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: stepUrl, DIRECT_URL: stepUrl },
      stdio: "pipe",
    });
    // Em produção, quem cria a default é o passo do ADR-009, que roda antes deste.
    await upsertDefaultTenant(db);
  });

  afterAll(async () => {
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.$disconnect();
    rmSync(workDir, { recursive: true, force: true });
  });

  it("ca_09 sem argumentos e só com DIRECT_URL, grava as 5 categorias e os 12 da lista na default", async () => {
    expect(await equipments()).toEqual([]);

    const run = runStep();

    expect(run.status, run.stderr).toBe(0);
    const withoutImage = list.filter((item) => imageObjectFor(approved, item.patrimonio) === null).length;
    expect(run.stdout).toContain(
      `Equipamentos iniciais na área default: 12 criados, 0 com a imagem trocada, ${withoutImage} sem foto.`,
    );

    expect((await categories()).map((category) => category.name).sort()).toEqual([...CATEGORY_NAMES].sort());
    const rows = await equipments();
    expect(rows).toEqual(
      list.map((item) => ({
        id: expect.any(String),
        assetTag: item.patrimonio,
        name: item.nome,
        status: STATUS[item.situacao as keyof typeof STATUS],
        imageObject: imageObjectFor(approved, item.patrimonio),
        tenant: { slug: "default" },
        category: { name: CATEGORY[item.categoria as keyof typeof CATEGORY] },
      })),
    );
    expect(rows.map((row) => row.assetTag)).toEqual(
      Array.from({ length: 12 }, (_, n) => `TI-${String(n + 1).padStart(4, "0")}`),
    );
    expect(rows.filter((row) => row.status === "maintenance").map((row) => row.assetTag)).toEqual([
      "TI-0004",
      "TI-0007",
      "TI-0010",
    ]);
    expect(rows.filter((row) => row.status === "available")).toHaveLength(9);
  });

  it("ca_09 o passo só grava as categorias e os equipamentos: nenhuma área, conta, vínculo nem empréstimo", async () => {
    expect(await db.tenant.findMany({ select: { slug: true } })).toEqual([{ slug: "default" }]);
    expect(await db.membership.count()).toBe(0);
    expect(await db.profile.count()).toBe(0);
    expect(await db.loan.count()).toBe(0);
  });

  it("ca_09 rodado de novo, deixa as mesmas categorias e os mesmos equipamentos, com os mesmos ids", async () => {
    const categoriesBefore = await categories();
    const before = await equipments();

    const run = runStep();

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("0 criados, 0 com a imagem trocada");
    expect(await categories()).toEqual(categoriesBefore);
    expect(await equipments()).toEqual(before);
  });

  it("ca_09 com os caminhos como argumentos, lê o manifesto indicado e só troca a imagem do que já existe", async () => {
    const before = await equipments();
    const manifest = writeJson("equipment-images.json", complete());

    const run = runStep([LIST_PATH, manifest]);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("0 criados, 3 com a imagem trocada");
    const fromFixture: Record<string, string> = {
      "TI-0001": "TI-0001-111.jpg",
      "TI-0002": "TI-0002-222.jpg",
      "TI-0003": "TI-0003-333.jpg",
    };
    expect(await equipments()).toEqual(
      before.map((row) => ({ ...row, imageObject: fromFixture[row.assetTag] ?? row.imageObject })),
    );
  });

  it("ca_09 com um manifesto que não existe no caminho indicado, não falha e não tira a foto de ninguém", async () => {
    const before = await equipments();

    const run = runStep([LIST_PATH, join(workDir, "nao-existe.json")]);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("0 criados, 0 com a imagem trocada");
    expect(await equipments()).toEqual(before);
    expect((await equipments()).find((row) => row.assetTag === "TI-0001")?.imageObject).toBe("TI-0001-111.jpg");
  });

  it.each([
    [
      "um patrimônio repetido na lista",
      () => [writeJson("repetida.json", [...list, list[0]])],
      "o patrimônio TI-0001 se repete",
    ],
    ["um manifesto que existe e traz null", () => [LIST_PATH, writeJson("manifesto-null.json", null)], "traz null"],
    [
      "um manifesto que não passa na conferência da spec 002",
      () => [LIST_PATH, writeJson("manifesto-invalido.json", { photos: [{ assetTag: "TI-0001" }] })],
      "manifesto:",
    ],
    ["uma lista que não é JSON", () => [writeText("quebrada.json", "[{")], "não é um JSON válido"],
    ["uma lista que não existe", () => [join(workDir, "sem-lista.json")], "a lista de equipamentos não existe"],
  ])("ca_09 com %s, falha dizendo o motivo e não grava nada", async (_, args, reason) => {
    const categoriesBefore = await categories();
    const before = await equipments();

    const run = runStep(args());

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Dados iniciais recusados, nada foi gravado");
    expect(run.stderr).toContain(reason);
    expect(run.stdout).toBe("");
    expect(await categories()).toEqual(categoriesBefore);
    expect(await equipments()).toEqual(before);
  });

  it("ca_09 sem DIRECT_URL, falha antes de abrir o banco", () => {
    const run = runStep([], {});

    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("Falta DIRECT_URL");
    expect(run.stdout).toBe("");
  });

  it("ca_09 o script não lê arquivo de ambiente nem outra variável além da DIRECT_URL", () => {
    // O script e a leitura dos arquivos de dados, que ele divide com o seed.
    const sources = [SCRIPT, "prisma/equipment-files.ts"].map((file) => readFileSync(file, "utf8"));

    expect(sources.flatMap((source) => source.match(/process\.env\b[.[\w"'\]]*/g) ?? [])).toEqual([
      "process.env.DIRECT_URL",
    ]);
    for (const source of sources) {
      expect(source).not.toMatch(/loadEnvFile|parseEnv|dotenv|\.env\.local/);
    }
  });
});

function writeText(name: string, content: string) {
  const path = join(workDir, name);
  writeFileSync(path, content);
  return path;
}
