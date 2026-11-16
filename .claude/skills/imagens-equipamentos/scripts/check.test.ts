import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { APPROVED_MANIFEST, check, checkFiles, main, type ReadFile } from "./check";
import { crop } from "./lib/crop";
import { fakeJpeg } from "./lib/image.fixtures";
import type { Manifest, Photo } from "./lib/manifest";
import { complete, photo } from "./lib/manifest.fixtures";
import type { Fetch } from "./lib/pixabay";
import { sha256 } from "./lib/sha256";

const file = (path: string, manifest: Manifest) => ({ path, bytes: Buffer.from(JSON.stringify(manifest), "utf8") });

const approved: Manifest = { photos: [photo("TI-0001", 111)] };
const swapped: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 222)] };

const dirs: string[] = [];
const tempDir = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("check, a conferência dos dois manifestos (CA-03, CA-09 e CA-12)", () => {
  it("ca_09 imprime o objeto antigo entre os a apagar e o novo entre os a enviar", () => {
    expect(check(file("novo.json", swapped), file("aprovado.json", approved))).toEqual({
      ok: true,
      lines: [
        "Manifesto novo.json: 2 fotos, 1 aprovada.",
        "Manifesto aprovado aprovado.json: 1 foto, 1 aprovada.",
        "Objetos a enviar (1):",
        "  TI-0001-222.jpg",
        "Objetos a apagar (1):",
        "  TI-0001-111.jpg",
      ],
    });
  });

  it("ca_09 com os dois manifestos iguais, as duas listas saem vazias", () => {
    expect(check(file("novo.json", approved), file("aprovado.json", approved)).lines.slice(2)).toEqual([
      "Objetos a enviar (0):",
      "  nenhum",
      "Objetos a apagar (0):",
      "  nenhum",
    ]);
  });

  it("ca_12 um manifesto que não está em UTF-8 é reprovado, sem estragar o crédito em silêncio", () => {
    const latin1 = { path: "novo.json", bytes: Buffer.from(JSON.stringify(complete()), "latin1") };

    expect(check(latin1, file("aprovado.json", approved))).toEqual({
      ok: false,
      lines: ["O manifesto novo.json não passou na conferência:", "  - o manifesto não está em UTF-8"],
    });
  });

  it("ca_12 sem --approved, o manifesto aprovado é o prisma/data/equipment-images.json da raiz", () => {
    // A raiz é a pasta de onde o Vitest roda; o realpath iguala os caminhos curtos do Windows.
    const root = resolve(APPROVED_MANIFEST, "..", "..", "..");

    expect(isAbsolute(APPROVED_MANIFEST)).toBe(true);
    expect(APPROVED_MANIFEST.endsWith(join("prisma", "data", "equipment-images.json"))).toBe(true);
    expect(realpathSync.native(root)).toBe(realpathSync.native(process.cwd()));
  });

  it("ca_12 sem manifesto aprovado, tudo o que o manifesto novo aprova vai para o envio", () => {
    const missing = { path: "/repo/prisma/data/equipment-images.json", bytes: null };

    expect(check(file("novo.json", complete()), missing).lines).toEqual([
      "Manifesto novo.json: 4 fotos, 3 aprovadas.",
      "Sem manifesto aprovado em /repo/prisma/data/equipment-images.json: tudo o que o manifesto novo aprova vai para a lista de envio.",
      "Objetos a enviar (3):",
      "  TI-0001-111.jpg",
      "  TI-0002-222.jpg",
      "  TI-0003-333.jpg",
      "Objetos a apagar (0):",
      "  nenhum",
    ]);
  });

  it("ca_03 com o manifesto novo reprovado, mostra os problemas e não lista objeto nenhum", () => {
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(check(file("novo.json", unapproved), file("aprovado.json", approved))).toEqual({
      ok: false,
      lines: ["O manifesto novo.json não passou na conferência:", "  - o patrimônio TI-0001 não tem foto aprovada"],
    });
  });

  it("ca_12 reprova o manifesto novo que deixa de fora um patrimônio aprovado, sem listar nada", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0002", 222)] };

    expect(check(file("novo.json", approved), file("aprovado.json", before))).toEqual({
      ok: false,
      lines: [
        "O manifesto novo.json não passou na conferência:",
        "  - o patrimônio TI-0002 tem foto aprovada no manifesto aprovado e ficou de fora do manifesto novo (RN-16)",
      ],
    });
  });

  it("ca_03 com o manifesto aprovado reprovado, também não lista objeto nenhum", () => {
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(check(file("novo.json", approved), file("aprovado.json", unapproved))).toEqual({
      ok: false,
      lines: [
        "O manifesto aprovado aprovado.json não passou na conferência:",
        "  - o patrimônio TI-0001 não tem foto aprovada",
      ],
    });
  });
});

describe("a foto aprovada que vem do manifesto aprovado, CA-05 (spec 002, RN-20)", () => {
  it("ca_05 com outro SHA-256 no mesmo nome de objeto, reprova o manifesto novo, sem rede", () => {
    const changed: Manifest = { photos: [photo("TI-0001", 111, "approved", { sha256: sha256(new Uint8Array([1])) })] };

    expect(check(file("novo.json", changed), file("aprovado.json", approved))).toEqual({
      ok: false,
      lines: [
        "O manifesto novo.json não passou na conferência:",
        "  - a foto aprovada TI-0001-111.jpg difere da entrada do manifesto aprovado, em sha256 (RN-20)",
      ],
    });
  });

  it("ca_05 lista todos os campos que mudaram", () => {
    const changed: Manifest = {
      photos: [photo("TI-0001", 111, "approved", { sourceUrl: "https://pixabay.com/get/outra_1280.jpg", downloadedAt: "2026-11-17" })],
    };

    expect(check(file("novo.json", changed), file("aprovado.json", approved)).lines).toContain(
      "  - a foto aprovada TI-0001-111.jpg difere da entrada do manifesto aprovado, em downloadedAt, sourceUrl (RN-20)",
    );
  });

  it("ca_05 a foto antes reprovada e agora aprovada não conta como mudança: ela vai para o envio", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0001", 112, "rejected")] };
    const next: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 112)] };

    expect(check(file("novo.json", next), file("aprovado.json", before)).lines).toEqual(
      expect.arrayContaining(["Objetos a enviar (1):", "  TI-0001-112.jpg", "Objetos a apagar (1):", "  TI-0001-111.jpg"]),
    );
  });

  it("ca_05 a mesma foto com as chaves em outra ordem não conta como mudança", () => {
    const original = photo("TI-0001", 111);
    const reordered = Object.fromEntries(Object.entries(original).reverse()) as Photo;
    reordered.license = { url: original.license.url, name: original.license.name };

    expect(check(file("novo.json", { photos: [reordered] }), file("aprovado.json", approved)).ok).toBe(true);
  });
});

describe("checkFiles, a conferência dos arquivos e da origem, CA-05 (spec 002, RN-03 e RN-20)", () => {
  const URL_111 = "https://pixabay.com/get/ficticia111_1280.jpg";
  const URL_222 = "https://pixabay.com/get/ficticia222_1280.jpg";
  let source111: Uint8Array;
  let local111: Uint8Array;
  let other: Uint8Array;

  beforeAll(async () => {
    source111 = await fakeJpeg({ width: 1280, height: 853, orientation: 6, shade: 11 });
    other = await fakeJpeg({ width: 1280, height: 853, shade: 99 });
    const result = await crop(source111);
    if (!result.ok) throw new Error(result.reason);
    local111 = result.bytes;
  });

  // O manifesto da rodada, com a foto 111 do TI-0001 gravada como o download a gravaria.
  const round = (overrides: Partial<Photo> = {}): Manifest => ({
    photos: [photo("TI-0001", 111, "approved", { sourceUrl: URL_111, sha256: sha256(local111), ...overrides })],
  });
  const first = { path: "/repo/prisma/data/equipment-images.json", bytes: null };
  const files = (entries: Record<string, Uint8Array>): ReadFile => (name) => entries[name] ?? null;

  // Um fetch de mentira, por URL; a URL sem resposta falha como uma URL que expirou.
  function origin(byUrl: Record<string, Uint8Array>) {
    const urls: string[] = [];
    const fetch: Fetch = async (url) => {
      urls.push(url.href);
      const bytes = byUrl[url.href];
      return bytes ? new Response(new Uint8Array(bytes)) : new Response("", { status: 403 });
    };
    return { urls, fetch };
  }

  it("ca_05 o arquivo igual ao recorte da origem baixada de novo vai para a lista de envio", async () => {
    const { urls, fetch } = origin({ [URL_111]: source111 });

    const result = await checkFiles(file("novo.json", round()), first, {
      readFile: files({ "TI-0001-111.jpg": local111 }),
      origin: true,
      fetch,
    });

    expect(result.ok).toBe(true);
    expect(result.lines).toContain("  TI-0001-111.jpg");
    expect(urls).toEqual([URL_111]);
  });

  it("ca_05 recusa o arquivo de 800×601, que sai da lista de envio", async () => {
    const tall = await fakeJpeg({ width: 800, height: 601 });

    const result = await checkFiles(file("novo.json", round({ sha256: sha256(tall) })), first, {
      readFile: files({ "TI-0001-111.jpg": tall }),
    });

    expect(result).toEqual({
      ok: false,
      lines: [
        "Manifesto novo.json: 1 foto, 1 aprovada.",
        "Sem manifesto aprovado em /repo/prisma/data/equipment-images.json: tudo o que o manifesto novo aprova vai para a lista de envio.",
        "Objetos a enviar (0):",
        "  nenhum",
        "Objetos a apagar (0):",
        "  nenhum",
        "Arquivos recusados, fora da lista de envio (1):",
        "  - TI-0001-111.jpg: tamanho 800×601, e não 800×600 (RN-03)",
      ],
    });
  });

  it("ca_05 recusa o arquivo com orientação EXIF 6", async () => {
    const turned = await fakeJpeg({ width: 800, height: 600, orientation: 6 });

    const result = await checkFiles(file("novo.json", round({ sha256: sha256(turned) })), first, {
      readFile: files({ "TI-0001-111.jpg": turned }),
    });

    expect(result.lines).toContain("  - TI-0001-111.jpg: orientação EXIF 6, e não 1 (RN-03)");
    expect(result.ok).toBe(false);
  });

  it("ca_05 recusa o arquivo cujo SHA-256 difere do gravado no manifesto", async () => {
    const result = await checkFiles(file("novo.json", round({ sha256: sha256(new Uint8Array([7])) })), first, {
      readFile: files({ "TI-0001-111.jpg": local111 }),
    });

    expect(result.lines).toContain("  - TI-0001-111.jpg: o SHA-256 do arquivo não é o do manifesto");
  });

  it("ca_05 recusa o arquivo que não está na pasta", async () => {
    const result = await checkFiles(file("novo.json", round()), first, { readFile: files({}) });

    expect(result.lines).toContain("  - TI-0001-111.jpg: o arquivo não está na pasta");
  });

  it("ca_05 recusa o arquivo cujo SHA-256 difere do recorte da origem baixada de novo", async () => {
    const { fetch } = origin({ [URL_111]: other });

    const result = await checkFiles(file("novo.json", round()), first, {
      readFile: files({ "TI-0001-111.jpg": local111 }),
      origin: true,
      fetch,
    });

    expect(result.ok).toBe(false);
    expect(result.lines).toContain(
      `  - TI-0001-111.jpg: o recorte da origem baixada de novo de ${URL_111} difere do arquivo do manifesto (RN-20)`,
    );
  });

  it("ca_05 recusa o arquivo cuja origem não baixa de novo, como uma URL do Pixabay que expirou", async () => {
    const { fetch } = origin({});

    const result = await checkFiles(file("novo.json", round()), first, {
      readFile: files({ "TI-0001-111.jpg": local111 }),
      origin: true,
      fetch,
    });

    expect(result.lines).toContain(
      "  - TI-0001-111.jpg: não deu para baixar de novo a origem: download do Pixabay: o Pixabay respondeu 403. A URL do Pixabay pode ter expirado: escolha outro candidato ou, depois do prazo de 24 h da busca guardada, busque de novo (RN-18).",
    );
  });

  it("ca_05 a foto que vem igual do manifesto aprovado, com a URL expirada, não é baixada de novo", async () => {
    // O aprovado tem o TI-0001 e o TI-0002; o novo mantém o TI-0001 e só troca a foto do TI-0002.
    const before: Manifest = { photos: [...round().photos, photo("TI-0002", 222, "approved", { sourceUrl: URL_222 })] };
    const source333 = await fakeJpeg({ width: 1280, height: 853, shade: 33 });
    const cropped333 = await crop(source333);
    if (!cropped333.ok) throw new Error(cropped333.reason);
    const local333 = cropped333.bytes;
    const URL_333 = "https://pixabay.com/get/ficticia333_1280.jpg";
    const next: Manifest = {
      photos: [
        ...round().photos,
        photo("TI-0002", 222, "rejected", { sourceUrl: URL_222 }),
        photo("TI-0002", 333, "approved", { sourceUrl: URL_333, sha256: sha256(local333) }),
      ],
    };
    const { urls, fetch } = origin({ [URL_333]: source333 });

    const result = await checkFiles(file("novo.json", next), file("aprovado.json", before), {
      readFile: files({ "TI-0002-333.jpg": local333 }),
      origin: true,
      fetch,
    });

    expect(result.ok).toBe(true);
    expect(urls).toEqual([URL_333]);
    expect(result.lines).toEqual(
      expect.arrayContaining(["Objetos a enviar (1):", "  TI-0002-333.jpg", "Objetos a apagar (1):", "  TI-0002-222.jpg"]),
    );
  });
});

describe("main, a linha de comando da conferência", () => {
  const dir = tempDir("manifest-check-");
  const write = (name: string, manifest: Manifest) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(manifest));
    return path;
  };
  const output = () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" "));
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ca_09 lê os dois arquivos, imprime as listas e sai com 0", async () => {
    const lines = output();

    expect(await main([write("novo.json", swapped), "--approved", write("aprovado.json", approved)])).toBe(0);
    expect(lines()).toEqual(expect.arrayContaining(["  TI-0001-222.jpg", "  TI-0001-111.jpg"]));
  });

  it("ca_03 sai com 1 quando o manifesto não passa na conferência", async () => {
    const lines = output();
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(await main([write("reprovado.json", unapproved), "--approved", write("aprovado.json", approved)])).toBe(1);
    expect(lines()).toContain("  - o patrimônio TI-0001 não tem foto aprovada");
  });

  it("ca_12 com --approved apontando um arquivo que não existe, sai com 2 sem listar nada", async () => {
    const lines = output();
    const missing = join(dir, "nao-existe.json");

    expect(await main([write("novo.json", swapped), "--approved", missing])).toBe(2);
    expect(lines()).toEqual([`O manifesto aprovado ${missing} não existe.`]);
  });

  it("ca_12 com --approved apontando uma pasta, sai com 2 sem listar nada", async () => {
    const lines = output();

    expect(await main([write("novo.json", swapped), "--approved", dir])).toBe(2);
    expect(lines()).toEqual([`O manifesto aprovado ${dir} não é um arquivo.`]);
  });

  it("ca_05 com --files, recusa o arquivo que falta na pasta e sai com 1", async () => {
    const lines = output();
    const folder = join(dir, "arquivos");
    mkdirSync(folder, { recursive: true });

    expect(await main([write("novo.json", swapped), "--approved", write("aprovado.json", approved), "--files", folder])).toBe(1);
    expect(lines()).toContain("  - TI-0001-222.jpg: o arquivo não está na pasta");
  });

  it.each([
    ["a origem certa", "certa", 0, "  TI-0001-111.jpg"],
    ["outra origem", "outra", 1, "  - TI-0001-111.jpg: o recorte da origem baixada de novo de https://pixabay.com/get/linha111_1280.jpg difere do arquivo do manifesto (RN-20)"],
    ["uma origem que expirou", "expirada", 1, "  - TI-0001-111.jpg: não deu para baixar de novo a origem:"],
  ] as const)("ca_05 com --files e --origin e %s, baixa de novo e sai com %i", async (_, kind, code, expected) => {
    const lines = output();
    const url = "https://pixabay.com/get/linha111_1280.jpg";
    const source = await fakeJpeg({ width: 1280, height: 853, shade: 21 });
    const result = await crop(source);
    if (!result.ok) throw new Error(result.reason);
    const folder = tempDir("origin-files-");
    writeFileSync(join(folder, "TI-0001-111.jpg"), result.bytes);
    // O aprovado é de outro patrimônio, para a foto do TI-0001 ir para a lista de envio.
    const before: Manifest = { photos: [photo("TI-0002", 222)] };
    const next: Manifest = {
      photos: [photo("TI-0002", 222), photo("TI-0001", 111, "approved", { sourceUrl: url, sha256: sha256(result.bytes) })],
    };
    const replies = { certa: source, outra: await fakeJpeg({ width: 1280, height: 853, shade: 77 }), expirada: null };
    const urls: string[] = [];
    const fetch: Fetch = async (requested) => {
      urls.push(requested.href);
      const bytes = replies[kind];
      return bytes ? new Response(new Uint8Array(bytes)) : new Response("", { status: 403 });
    };

    expect(
      await main([write("novo-origem.json", next), "--approved", write("aprovado-origem.json", before), "--files", folder, "--origin"], {
        fetch,
      }),
    ).toBe(code);
    expect(urls).toEqual([url]);
    expect(lines().some((line) => line.startsWith(expected))).toBe(true);
  });

  it("ca_05 o --origin sem --files sai com 2", async () => {
    const lines = output();

    expect(await main([write("novo.json", swapped), "--origin"])).toBe(2);
    expect(lines()).toEqual(["Uso: check.ts <manifesto novo> [--approved <manifesto aprovado>] [--files <pasta> [--origin]]"]);
  });

  it("ca_05 com --files apontando um arquivo, e não uma pasta, sai com 2", async () => {
    const lines = output();
    const notDir = write("nao-pasta.json", approved);

    expect(await main([write("novo.json", swapped), "--approved", write("aprovado.json", approved), "--files", notDir])).toBe(2);
    expect(lines()).toEqual([`O diretório dos arquivos ${notDir} não é uma pasta.`]);
  });
});
