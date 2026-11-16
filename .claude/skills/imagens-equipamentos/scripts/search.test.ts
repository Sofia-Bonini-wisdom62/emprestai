import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { ApiKey } from "./lib/api-key";
import type { Manifest } from "./lib/manifest";
import { photo } from "./lib/manifest.fixtures";
import type { Fetch } from "./lib/pixabay";
import {
  authorUrl,
  type Equipment,
  main,
  parseCandidates,
  parseEquipment,
  pendingEquipment,
  SearchError,
  searchCandidates,
} from "./search";

// Chave fictícia, com caracteres que a URL codifica, e lista fictícia: 12 patrimônios, cada um
// com o seu termo de busca.
const KEY = "chave+ficticia/de=teste-0123456789";
const ENCODED = "chave%2Bficticia%2Fde%3Dteste-0123456789";
const key = () => new ApiKey(KEY);
const equipment: Equipment[] = Array.from({ length: 12 }, (_, n) => ({
  assetTag: `TI-${String(n + 1).padStart(4, "0")}`,
  query: `termo ${n + 1}`,
}));

// Um manifesto aprovado com três patrimônios e uma foto reprovada no TI-0001, cujo id não conta
// como usado (RN-04).
const approved: Manifest = {
  photos: [photo("TI-0001", 111), photo("TI-0001", 444, "rejected"), photo("TI-0002", 222), photo("TI-0003", 333)],
};

// Um resultado da API, com autor e ids fictícios.
const hit = (id: number) => ({
  id,
  pageURL: `https://pixabay.com/photos/foto-ficticia-${id}/`,
  type: "photo",
  tags: `notebook, mesa, ${id}`,
  previewURL: `https://cdn.pixabay.com/photo/2026/11/16/10/00/ficticia-${id}_150.jpg`,
  largeImageURL: `https://pixabay.com/get/ficticia${id}_1280.jpg`,
  user_id: id + 9000,
  user: `Autora Fictícia ${id}`,
});

// O Pixabay de mentira: toda busca devolve os resultados 111, 222, 444 e um próprio do termo.
function fakeSearch() {
  const urls: URL[] = [];
  const fetch: Fetch = async (url) => {
    urls.push(url);
    const query = url.searchParams.get("q") ?? "";
    const own = 900 + Number(query.replace("termo ", ""));
    return Response.json({ total: 4, totalHits: 4, hits: [111, 222, 444, own].map(hit) });
  };
  return { urls, queries: () => urls.map((url) => url.searchParams.get("q")), fetch };
}

const dirs: string[] = [];
const tempDir = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

const NOW = new Date("2026-11-16T10:00:00Z");
const later = (ms: number) => new Date(NOW.getTime() + ms);
const HOUR = 60 * 60 * 1000;

describe("searchCandidates, CA-04 (spec 002, RN-04)", () => {
  it("ca_04 com 3 patrimônios aprovados, a busca só procura os outros 9", async () => {
    const { queries, fetch } = fakeSearch();

    const searches = await searchCandidates({ equipment, approved, key, cacheDir: tempDir("cache-"), now: NOW, fetch });

    expect(queries()).toEqual(Array.from({ length: 9 }, (_, n) => `termo ${n + 4}`));
    expect(searches.map((search) => search.assetTag)).toEqual(equipment.slice(3).map((item) => item.assetTag));
  });

  it("ca_04 deixa de fora os ids já usados, que são os das fotos aprovadas", async () => {
    const { fetch } = fakeSearch();

    const [first] = await searchCandidates({ equipment, approved, key, cacheDir: tempDir("cache-"), now: NOW, fetch });

    // O 444 só foi reprovado, e por isso continua candidato; o 111 e o 222 estão aprovados.
    expect(first.candidates.map((candidate) => candidate.pixabayId)).toEqual([444, 904]);
  });

  it("ca_04 sem manifesto aprovado, procura os 12", () => {
    expect(pendingEquipment(equipment, { photos: [] })).toHaveLength(12);
  });

  it("ca_04 lê da lista da prática o patrimonio e a busca, e recusa o item sem eles", () => {
    expect(parseEquipment([{ patrimonio: "TI-0001", nome: "Notebook", busca: "laptop on white desk" }])).toEqual([
      { assetTag: "TI-0001", query: "laptop on white desk" },
    ]);
    expect(() => parseEquipment([{ patrimonio: "TI-0001" }])).toThrow(
      "o item 1 da lista dos equipamentos não tem patrimonio e busca",
    );
  });
});

describe("a busca no Pixabay e a busca guardada, CA-14 (spec 002, RN-01 e RN-18)", () => {
  it("ca_14 a busca pede só fotos, na horizontal", async () => {
    const { urls, fetch } = fakeSearch();

    await searchCandidates({ equipment, approved, key, cacheDir: tempDir("cache-"), now: NOW, fetch });

    expect(urls[0].searchParams.get("image_type")).toBe("photo");
    expect(urls[0].searchParams.get("orientation")).toBe("horizontal");
  });

  it("ca_14 guarda de cada candidato o id, a página, o autor, o user_id, as tags e o largeImageURL", () => {
    expect(parseCandidates({ hits: [{ ...hit(4242), user: "Ana Lima", user_id: 123 }] })).toEqual([
      {
        pixabayId: 4242,
        pageUrl: "https://pixabay.com/photos/foto-ficticia-4242/",
        user: "Ana Lima",
        userId: 123,
        tags: "notebook, mesa, 4242",
        largeImageUrl: "https://pixabay.com/get/ficticia4242_1280.jpg",
      },
    ]);
  });

  it("ca_14 a página do autor é a que a documentação monta, com o user codificado", () => {
    expect(authorUrl("Ana Lima", 123)).toBe("https://pixabay.com/users/Ana%20Lima-123/");
  });

  it.each([
    ["sem a lista hits", { photos: [] }, "a resposta da busca não tem a lista de resultados (hits)"],
    ["com um resultado sem largeImageURL", { hits: [{ ...hit(1), largeImageURL: undefined }] }, null],
    ["com um largeImageURL em http", { hits: [{ ...hit(1), largeImageURL: "http://pixabay.com/get/x.jpg" }] }, null],
    ["com um id que não é inteiro positivo", { hits: [{ ...hit(1), id: 0 }] }, null],
    ["com um resultado sem user_id", { hits: [{ ...hit(1), user_id: undefined }] }, null],
  ])("ca_14 a resposta %s é recusada", (_, data, expected) => {
    expect(() => parseCandidates(data)).toThrow(SearchError);
    expect(() => parseCandidates(data)).toThrow(
      expected ?? "o resultado 1 da resposta da busca não tem id, pageURL, user, user_id, tags ou largeImageURL válidos",
    );
  });

  it("ca_14 a mesma busca dentro de 24 h lê a resposta guardada, sem chamar o fetch", async () => {
    const cacheDir = tempDir("cache-");
    const { queries, fetch } = fakeSearch();

    const first = await searchCandidates({ equipment, approved, key, cacheDir, now: NOW, fetch });
    const second = await searchCandidates({ equipment, approved, key, cacheDir, now: later(24 * HOUR - 1), fetch });

    expect(queries()).toHaveLength(9);
    expect(second).toEqual(first);
  });

  it("ca_14 depois de 24 h, a mesma busca chama de novo e guarda a resposta nova", async () => {
    const cacheDir = tempDir("cache-");
    const { queries, fetch } = fakeSearch();

    await searchCandidates({ equipment, approved, key, cacheDir, now: NOW, fetch });
    // Com exatamente 24 h, a resposta guardada já venceu.
    await searchCandidates({ equipment, approved, key, cacheDir, now: later(24 * HOUR), fetch });
    expect(queries()).toHaveLength(18);

    // A resposta nova vale a partir de agora: 1 ms depois, a busca lê a guardada.
    await searchCandidates({ equipment, approved, key, cacheDir, now: later(24 * HOUR + 1), fetch });
    expect(queries()).toHaveLength(18);
  });

  it("ca_14 a busca guardada traz o termo, os parâmetros, a data e a resposta, nunca a chave nem a URL da busca", async () => {
    const cacheDir = tempDir("cache-");
    const { fetch } = fakeSearch();

    await searchCandidates({ equipment: equipment.slice(11), approved: { photos: [] }, key, cacheDir, now: NOW, fetch });

    const files = readdirSync(cacheDir);
    expect(files).toHaveLength(1);
    const text = readFileSync(join(cacheDir, files[0]), "utf8");
    expect(JSON.parse(text)).toEqual({
      query: "termo 12",
      params: { image_type: "photo", orientation: "horizontal", page: "1", per_page: "20" },
      fetchedAt: "2026-11-16T10:00:00.000Z",
      response: { total: 4, totalHits: 4, hits: [111, 222, 444, 912].map(hit) },
    });
    for (const secret of [KEY, ENCODED, "pixabay.com/api", "key"]) expect(text).not.toContain(secret);
  });

  it("ca_14 com todas as buscas guardadas, a chave nem é lida", async () => {
    const cacheDir = tempDir("cache-");
    const { fetch } = fakeSearch();
    await searchCandidates({ equipment, approved, key, cacheDir, now: NOW, fetch });

    const noKey = () => {
      throw new Error("a chave não devia ser lida");
    };

    await expect(
      searchCandidates({ equipment, approved, key: noKey, cacheDir, now: later(HOUR), fetch }),
    ).resolves.toHaveLength(9);
  });

  it("ca_14 uma busca guardada de outro termo, no mesmo arquivo, conta como ausente", async () => {
    const cacheDir = tempDir("cache-");
    const { queries, fetch } = fakeSearch();
    const one = { equipment: equipment.slice(11), approved: { photos: [] }, key, cacheDir, fetch };
    await searchCandidates({ ...one, now: NOW });
    const path = join(cacheDir, readdirSync(cacheDir)[0]);
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), query: "outro termo" }));

    await searchCandidates({ ...one, now: later(HOUR) });

    expect(queries()).toEqual(["termo 12", "termo 12"]);
  });

  it("ca_14 uma busca guardada estragada conta como ausente, e a busca chama de novo", async () => {
    const cacheDir = tempDir("cache-");
    const { queries, fetch } = fakeSearch();
    const one = { equipment: equipment.slice(11), approved: { photos: [] }, key, cacheDir, fetch };
    await searchCandidates({ ...one, now: NOW });
    writeFileSync(join(cacheDir, readdirSync(cacheDir)[0]), "{ não é json");

    await searchCandidates({ ...one, now: later(HOUR) });

    expect(queries()).toEqual(["termo 12", "termo 12"]);
  });
});

describe("main, a linha de comando da busca", () => {
  const output = () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" "));
  };
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = () => {
    const dir = tempDir("search-");
    const list = join(dir, "equipment.json");
    // A lista no formato da prática, com as chaves em português.
    writeFileSync(
      list,
      JSON.stringify(equipment.map((item) => ({ patrimonio: item.assetTag, nome: `Item ${item.assetTag}`, busca: item.query }))),
    );
    const approvedPath = join(dir, "aprovado.json");
    writeFileSync(approvedPath, JSON.stringify(approved));
    return { dir, list, approvedPath, work: join(dir, "work") };
  };

  it("ca_04 grava os candidatos dos 9 patrimônios pendentes e sai com 0", async () => {
    const lines = output();
    const { list, approvedPath, work } = setup();
    const { fetch } = fakeSearch();

    expect(await main(["--equipment", list, "--approved", approvedPath, "--work", work], { key, fetch, now: NOW })).toBe(0);

    const candidates = JSON.parse(readFileSync(join(work, "candidates.json"), "utf8")) as Array<{ assetTag: string }>;
    expect(candidates.map((search) => search.assetTag)).toEqual(equipment.slice(3).map((item) => item.assetTag));
    expect(lines()).toContain('  TI-0004 ("termo 4"): 2 candidatos');
  });

  it("ca_14 a falha da busca sai com 1, com a mensagem do Pixabay e sem a chave", async () => {
    const lines = output();
    const { list, approvedPath, work } = setup();
    const fetch: Fetch = async () => new Response(`erro ${KEY}`, { status: 429 });

    expect(await main(["--equipment", list, "--approved", approvedPath, "--work", work], { key, fetch, now: NOW })).toBe(1);

    expect(lines()).toEqual([expect.stringContaining("o limite de pedidos do Pixabay acabou (429)")]);
    expect(lines().join("\n")).not.toContain(KEY);
  });

  it("ca_04 sem a lista dos equipamentos, sai com 1", async () => {
    const lines = output();
    const { dir, approvedPath, work } = setup();
    const missing = join(dir, "nao-existe.json");

    expect(await main(["--equipment", missing, "--approved", approvedPath, "--work", work], { key, now: NOW })).toBe(1);
    expect(lines()).toEqual([`A lista dos equipamentos ${missing} não existe.`]);
  });

  it("ca_04 com um argumento desconhecido, sai com 2", async () => {
    const lines = output();

    expect(await main(["--qualquer"], { key, now: NOW })).toBe(2);
    expect(lines()).toEqual(["Uso: search.ts [--approved <manifesto aprovado>] [--equipment <lista>] [--work <pasta>]"]);
  });
});
