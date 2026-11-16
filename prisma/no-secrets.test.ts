// CA-08 da spec 003 (RN-09 e RN-14): em prisma/ e prisma/data/, nenhum arquivo traz endereço de
// e-mail fora dos domínios reservados para exemplo (RFC 2606), e a única senha que o seed usa vem
// de SEED_PASSWORD. O e-mail e a senha da conta do professor não entram no git: os casos abaixo
// conferem o que está escrito nos arquivos, sem conhecer nenhum dos dois.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RESERVED = ["example.com", "example.test"];

// O domínio depois do @, com qualquer coisa colada antes dele: pega o e-mail inteiro e também o
// que é montado por interpolação ou por concatenação. Não casam o escopo de pacote
// ("@prisma/adapter-pg"), que não tem ponto antes da barra, nem o tipo nativo do schema do Prisma
// (o @db.Uuid), que vem sempre depois de um espaço.
const AT_DOMAIN = /(?<=\S)@((?:[a-z0-9-]+\.)+[a-z]{2,})/gi;
const isReserved = (domain: string) =>
  RESERVED.some((reserved) => domain === reserved || domain.endsWith(`.${reserved}`));

function foreignDomains(text: string) {
  return [...text.matchAll(AT_DOMAIN)].map((match) => match[1].toLowerCase()).filter((domain) => !isReserved(domain));
}

// Um texto fixo logo depois de um nome de senha, com dois-pontos ou sinal de igual entre os dois.
const LITERAL_PASSWORD = /(?:password|passwd|senha|pwd)\w*["']?\s*[:=]\s*["'`]/i;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const PRISMA_FILES = files("prisma").map((file) => ({ file, text: readFileSync(file, "utf8") }));

describe("prisma/ sem e-mail real nem senha, CA-08 (spec 003, RN-09 e RN-14)", () => {
  it("ca_08 a varredura cobre os scripts, os dados e as migrations", () => {
    const scanned = PRISMA_FILES.map(({ file }) => file.replaceAll("\\", "/"));

    expect(scanned).toEqual(
      expect.arrayContaining([
        "prisma/seed.ts",
        "prisma/first-admin.ts",
        "prisma/load-equipment.ts",
        "prisma/data/equipment.json",
        "prisma/schema.prisma",
      ]),
    );
    expect(scanned.some((file) => file.startsWith("prisma/migrations/") && file.endsWith(".sql"))).toBe(true);
  });

  it("ca_08 a varredura acha um domínio de fora, sozinho ou depois de um nome montado, e deixa os reservados", () => {
    // Os exemplos são montados aqui, para este arquivo não trazer o que ele mesmo procura.
    const at = (domain: string) => ["alguem", domain].join("@");

    expect(foreignDomains(at("escola.invalid"))).toEqual(["escola.invalid"]);
    // Sem nome antes do @, como sobra de um e-mail montado por interpolação.
    expect(foreignDomains(["}", "Escola.Invalid"].join("@"))).toEqual(["escola.invalid"]);
    expect(foreignDomains(`${at("example.com")} ${at("example.test")} ${at("mail.example.com")}`)).toEqual([]);
    expect(foreignDomains(at("example.com.invalid"))).toEqual(["example.com.invalid"]);
    expect(foreignDomains('import { PrismaPg } from "@prisma/adapter-pg";')).toEqual([]);
    expect(foreignDomains("  id  String  @id @default(dbgenerated()) @db.Uuid")).toEqual([]);
  });

  it("ca_08 nenhum arquivo de prisma/ traz e-mail fora de example.com e example.test", () => {
    const found = PRISMA_FILES.flatMap(({ file, text }) => foreignDomains(text).map((domain) => `${file}: ${domain}`));

    expect(found).toEqual([]);
  });

  it("ca_08 a varredura acha uma senha escrita no arquivo", () => {
    const name = ["pass", "word"].join("");

    expect(LITERAL_PASSWORD.test(`const ${name} = "x";`)).toBe(true);
    expect(LITERAL_PASSWORD.test(`{ "${name}": 'x' }`)).toBe(true);
    expect(LITERAL_PASSWORD.test(`SEED_${name.toUpperCase()}="x"`)).toBe(true);
    expect(LITERAL_PASSWORD.test(`const ${name} = requireEnv("SEED_${name.toUpperCase()}");`)).toBe(false);
    expect(LITERAL_PASSWORD.test(`createUser({ email, ${name}, email_confirm: true })`)).toBe(false);
  });

  it("ca_08 nenhum arquivo de prisma/ traz uma senha escrita", () => {
    const found = PRISMA_FILES.filter(({ text }) => LITERAL_PASSWORD.test(text)).map(({ file }) => file);

    expect(found).toEqual([]);
  });

  it("ca_08 a única senha que o seed usa vem de SEED_PASSWORD", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    // Tudo o que o seed liga ao nome password: a anotação de tipo e a leitura do ambiente.
    const bound = [...seed.matchAll(/\bpassword\s*[:=]\s*([^,;)\n}]+)/g)].map((match) => match[1].trim());

    expect(bound).toContain('requireEnv("SEED_PASSWORD"');
    expect(bound.filter((value) => value !== "string" && value !== 'requireEnv("SEED_PASSWORD"')).toEqual([]);
    // Quem cria a conta e quem troca a senha recebem esse mesmo nome, sem valor ao lado.
    expect(seed).toContain("updateUserById(existingId, { password })");
    expect(seed).toMatch(/createUser\(\{\s*email,\s*password,/);
  });
});
