import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { downloadCandidate, DownloadError, main, withDraft } from "./download";
import { fakeJpeg } from "./lib/image.fixtures";
import { checkJpeg } from "./lib/jpeg";
import { LICENSE } from "./lib/manifest";
import type { Fetch } from "./lib/pixabay";
import { sha256 } from "./lib/sha256";
import type { Candidate, Search } from "./search";

// Um candidato de autor fictício (RN-11), com um user que a URL precisa codificar.
const candidate: Candidate = {
  pixabayId: 4242,
  pageUrl: "https://pixabay.com/photos/notebook-ficticio-4242/",
  user: "Ana Lima",
  userId: 123,
  tags: "notebook, mesa",
  largeImageUrl: "https://pixabay.com/get/ficticia4242_1280.jpg",
};

const NOW = new Date("2026-11-16T10:00:00Z");

let source: Uint8Array;
let small: Uint8Array;
beforeAll(async () => {
  source = await fakeJpeg({ width: 1280, height: 853, orientation: 6, shade: 3 });
  small = await fakeJpeg({ width: 1280, height: 512 });
});

// Um fetch de mentira que guarda as URLs pedidas e devolve os bytes dados.
function fakeFetch(bytes: () => Uint8Array, status = 200) {
  const urls: string[] = [];
  const fetch: Fetch = async (url) => {
    urls.push(url.href);
    return new Response(new Uint8Array(bytes()), { status });
  };
  return { urls, fetch };
}

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("downloadCandidate, CA-14 (spec 002, RN-03 e RN-05)", () => {
  it("ca_14 baixa o largeImageURL e registra a foto com os campos do RN-05 e o SHA-256 do arquivo de 800×600", async () => {
    const { urls, fetch } = fakeFetch(() => source);

    const { photo, bytes } = await downloadCandidate("TI-0001", candidate, { fetch, now: NOW });

    expect(urls).toEqual(["https://pixabay.com/get/ficticia4242_1280.jpg"]);
    expect(checkJpeg(bytes)).toMatchObject({ ok: true, info: { width: 800, height: 600, orientation: null } });
    expect(photo).toEqual({
      assetTag: "TI-0001",
      pixabayId: 4242,
      objectName: "TI-0001-4242.jpg",
      photoUrl: "https://pixabay.com/photos/notebook-ficticio-4242/",
      photographer: "Ana Lima",
      photographerUrl: "https://pixabay.com/users/Ana%20Lima-123/",
      license: LICENSE,
      sourceUrl: "https://pixabay.com/get/ficticia4242_1280.jpg",
      sha256: sha256(bytes),
      downloadedAt: "2026-11-16T10:00:00.000Z",
    });
    expect(photo.sha256).not.toBe(sha256(source));
  });

  it("ca_14 uma origem menor que 800×600 é recusada", async () => {
    const { fetch } = fakeFetch(() => small);

    await expect(downloadCandidate("TI-0001", candidate, { fetch, now: NOW })).rejects.toThrow(
      new DownloadError("A foto 4242 do TI-0001 foi recusada: a origem tem 1280×512, menor que 800×600 (RN-03)."),
    );
  });

  it("ca_14 baixar de novo a mesma foto troca a entrada dela no manifesto da rodada", () => {
    const old = { objectName: "TI-0001-4242.jpg", review: { verdict: "approved", reason: "antes" } };
    const other = { objectName: "TI-0002-5.jpg" };
    const draft = { assetTag: "TI-0001", objectName: "TI-0001-4242.jpg" } as Parameters<typeof withDraft>[1];

    expect(withDraft({ photos: [old, other] }, draft)).toEqual({ photos: [other, draft] });
  });
});

describe("main, a linha de comando do download", () => {
  const output = () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" "));
  };
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Uma pasta de trabalho com os candidatos que a busca gravaria.
  const workDir = () => {
    const dir = mkdtempSync(join(tmpdir(), "download-"));
    dirs.push(dir);
    const searches: Search[] = [{ assetTag: "TI-0001", query: "laptop on white desk", candidates: [candidate] }];
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "candidates.json"), JSON.stringify(searches));
    return dir;
  };

  it("ca_14 grava o arquivo e a entrada sem veredito no manifesto da rodada, e sai com 0", async () => {
    const lines = output();
    const work = workDir();
    const { fetch } = fakeFetch(() => source);

    expect(await main(["TI-0001", "4242", "--work", work], { fetch, now: NOW })).toBe(0);

    const bytes = readFileSync(join(work, "TI-0001-4242.jpg"));
    const draft = JSON.parse(readFileSync(join(work, "manifest.json"), "utf8")) as { photos: Array<Record<string, unknown>> };
    expect(draft.photos).toHaveLength(1);
    expect(draft.photos[0]).toMatchObject({ objectName: "TI-0001-4242.jpg", sha256: sha256(bytes) });
    expect(draft.photos[0]).not.toHaveProperty("review");
    expect(lines()).toEqual([`TI-0001-4242.jpg gravado em ${work}, ainda sem veredito.`]);
  });

  it("ca_14 com um manifesto da rodada já gravado, com BOM, mantém as outras entradas e acrescenta a nova", async () => {
    output();
    const work = workDir();
    const other = { objectName: "TI-0002-5.jpg", assetTag: "TI-0002" };
    writeFileSync(join(work, "manifest.json"), `\uFEFF${JSON.stringify({ photos: [other] })}`);
    const { fetch } = fakeFetch(() => source);

    expect(await main(["TI-0001", "4242", "--work", work], { fetch, now: NOW })).toBe(0);

    const draft = JSON.parse(readFileSync(join(work, "manifest.json"), "utf8")) as { photos: Array<{ objectName: string }> };
    expect(draft.photos.map((entry) => entry.objectName)).toEqual(["TI-0002-5.jpg", "TI-0001-4242.jpg"]);
  });

  it.each([
    ["que não é JSON", "{ não é json", "não é um JSON válido."],
    ["sem a lista de fotos", JSON.stringify({ fotos: [] }), "não tem a lista de fotos (photos)."],
  ])("ca_14 com um manifesto da rodada %s, sai com 1 sem baixar nada", async (_, text, ending) => {
    const lines = output();
    const work = workDir();
    writeFileSync(join(work, "manifest.json"), text);
    const { urls, fetch } = fakeFetch(() => source);

    expect(await main(["TI-0001", "4242", "--work", work], { fetch, now: NOW })).toBe(1);

    expect(urls).toEqual([]);
    expect(lines()).toEqual([`O manifesto da rodada ${join(work, "manifest.json")} ${ending}`]);
    expect(existsSync(join(work, "TI-0001-4242.jpg"))).toBe(false);
  });

  it("ca_14 a origem recusada não grava arquivo nem entrada no manifesto da rodada, e sai com 1", async () => {
    const lines = output();
    const work = workDir();
    const { fetch } = fakeFetch(() => small);

    expect(await main(["TI-0001", "4242", "--work", work], { fetch, now: NOW })).toBe(1);

    expect(existsSync(join(work, "TI-0001-4242.jpg"))).toBe(false);
    expect(existsSync(join(work, "manifest.json"))).toBe(false);
    expect(lines()).toEqual(["A foto 4242 do TI-0001 foi recusada: a origem tem 1280×512, menor que 800×600 (RN-03)."]);
  });

  it("ca_14 o download que falha sai com 1 e diz que a URL do Pixabay pode ter expirado", async () => {
    const lines = output();
    const work = workDir();
    const { fetch } = fakeFetch(() => new Uint8Array(), 403);

    expect(await main(["TI-0001", "4242", "--work", work], { fetch, now: NOW })).toBe(1);

    expect(lines()).toEqual([expect.stringContaining("o Pixabay respondeu 403. A URL do Pixabay pode ter expirado")]);
    expect(existsSync(join(work, "manifest.json"))).toBe(false);
  });

  it("ca_14 uma foto que não está entre os candidatos sai com 1, sem baixar nada", async () => {
    const lines = output();
    const work = workDir();
    const { urls, fetch } = fakeFetch(() => source);

    expect(await main(["TI-0001", "999", "--work", work], { fetch, now: NOW })).toBe(1);

    expect(urls).toEqual([]);
    expect(lines()).toEqual(["A foto 999 não está entre os candidatos do TI-0001."]);
  });

  it.each([[[]], [["TI-0001"]], [["TI-0001", "abc"]], [["TI-0001", "0"]], [["TI-0001", "1.5"]], [["TI-0001", "1e3"]], [["TI-0001", "0x10"]], [["TI-0001", " 12"]], [["TI-0001", "1", "a-mais"]]])(
    "ca_14 com os argumentos %j, sai com 2",
    async (argv) => {
      const lines = output();

      expect(await main(argv, { now: NOW })).toBe(2);
      expect(lines()).toEqual(["Uso: download.ts <patrimônio> <id do Pixabay> [--work <pasta>]"]);
    },
  );
});
