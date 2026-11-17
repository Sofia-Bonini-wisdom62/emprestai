import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { contactSheet, main } from "./contact-sheet";
import type { Manifest } from "./lib/manifest";
import { photo } from "./lib/manifest.fixtures";

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

const noFiles = () => false;
const filesOf = (names: string[]) => (name: string) => names.includes(name);

// Quantas fotos a folha mostra pelo arquivo local.
const images = (html: string) => [...html.matchAll(/<img src="([^"]+)"/g)].map((match) => match[1]);

describe("contactSheet, a folha de contato, CA-14 (spec 002, RN-09)", () => {
  it("ca_14 mostra cada foto da rodada pelo arquivo local, com o veredito, o motivo, o autor com link e a página no Pixabay", () => {
    const next: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0001", 112, "rejected")] };

    const sheet = contactSheet({ next, approved: { photos: [] }, toUpload: ["TI-0001-111.jpg"], hasFile: filesOf(["TI-0001-111.jpg", "TI-0001-112.jpg"]) });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(images(sheet.html)).toEqual(["TI-0001-111.jpg", "TI-0001-112.jpg"]);
    expect(sheet.html).toContain("<strong>Aprovada</strong>: só o equipamento, sem pessoa, marca nem texto");
    expect(sheet.html).toContain("<strong>Reprovada</strong>: tela com interface legível");
    expect(sheet.html).toContain(
      'Foto de <a href="https://pixabay.com/users/autora-ficticia-111-9111/">Autora Fictícia 111</a> no <a href="https://pixabay.com/photos/foto-ficticia-111/">Pixabay</a>, Pixabay Content License',
    );
    expect(sheet.html).toContain('Fotos do <a href="https://pixabay.com">Pixabay</a>');
  });

  it("ca_14 todo texto que vem da API ou do agente entra escapado", () => {
    const next: Manifest = {
      photos: [
        photo("TI-0001", 111, "approved", {
          photographer: 'Ana <b>"Lima"</b> & cia',
          review: { verdict: "approved", reason: "<script>alert(1)</script>" },
        }),
      ],
    };

    const sheet = contactSheet({ next, approved: { photos: [] }, toUpload: ["TI-0001-111.jpg"], hasFile: filesOf(["TI-0001-111.jpg"]) });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(sheet.html).not.toContain("<script>");
    expect(sheet.html).not.toContain("<b>");
    expect(sheet.html).toContain("Ana &lt;b&gt;&quot;Lima&quot;&lt;/b&gt; &amp; cia");
    expect(sheet.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("ca_14 as 3 fotos que vêm do manifesto aprovado aparecem só em texto, e a nova pelo arquivo", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0002", 222), photo("TI-0003", 333)] };
    const next: Manifest = { photos: [...before.photos, photo("TI-0004", 444)] };

    const sheet = contactSheet({ next, approved: before, toUpload: ["TI-0004-444.jpg"], hasFile: filesOf(["TI-0004-444.jpg"]) });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(images(sheet.html)).toEqual(["TI-0004-444.jpg"]);
    for (const name of ["TI-0001-111.jpg", "TI-0002-222.jpg", "TI-0003-333.jpg"]) {
      expect(sheet.html).toContain(`<strong>Vinda do manifesto aprovado</strong>, sem imagem: <code>${name}</code>. Aprovada:`);
    }
    expect(sheet.html).toContain(
      'Foto de <a href="https://pixabay.com/users/autora-ficticia-222-9222/">Autora Fictícia 222</a> no <a href="https://pixabay.com/photos/foto-ficticia-222/">Pixabay</a>, Pixabay Content License',
    );
  });

  it("ca_14 os links, o src, o alt, o título e as entradas herdadas também entram escapados", () => {
    const hostile = '"><script>x</script>';
    const evil = (id: number, verdict: "approved" | "rejected" = "approved") =>
      photo("TI-0001", id, verdict, {
        assetTag: `TI-0001${hostile}`,
        objectName: `TI-0001-${id}${hostile}.jpg`,
        photographerUrl: `https://pixabay.com/users/x/${hostile}`,
        photoUrl: `https://pixabay.com/photos/x/${hostile}`,
        review: { verdict, reason: hostile },
      });
    const before: Manifest = { photos: [evil(111)] };
    const next: Manifest = { photos: [evil(111), evil(222)] };

    const sheet = contactSheet({
      next,
      approved: before,
      toUpload: [`TI-0001-222${hostile}.jpg`],
      names: new Map([[`TI-0001${hostile}`, hostile]]),
      hasFile: () => true,
    });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(sheet.html).not.toContain("<script>");
    expect(sheet.html).not.toContain('"><script');
    expect(sheet.html.match(/&quot;&gt;&lt;script&gt;x&lt;\/script&gt;/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it("ca_14 uma foto da rodada sem arquivo local faz a folha falhar, com o nome do objeto", () => {
    const next: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0001", 112, "rejected")] };

    expect(contactSheet({ next, approved: { photos: [] }, toUpload: ["TI-0001-111.jpg"], hasFile: filesOf(["TI-0001-111.jpg"]) })).toEqual({
      ok: false,
      missing: ["TI-0001-112.jpg"],
    });
  });

  it("ca_14 na troca de foto, mostra a nova pelo arquivo e a antiga só em texto, com o veredito de antes e o de agora", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111)] };
    const next: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 222)] };

    const sheet = contactSheet({ next, approved: before, toUpload: ["TI-0001-222.jpg"], hasFile: filesOf(["TI-0001-222.jpg"]) });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(images(sheet.html)).toEqual(["TI-0001-222.jpg"]);
    expect(sheet.html).toContain("<code>TI-0001-111.jpg</code>. Reprovada agora, aprovada antes: tela com interface legível.");
  });

  it("ca_14 a foto antes reprovada e agora aprovada é da rodada, e aparece pelo arquivo", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0001", 112, "rejected")] };
    const next: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 112)] };

    const sheet = contactSheet({ next, approved: before, toUpload: ["TI-0001-112.jpg"], hasFile: filesOf(["TI-0001-112.jpg"]) });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(images(sheet.html)).toEqual(["TI-0001-112.jpg"]);
  });

  it("ca_14 sem nenhuma foto da rodada, a folha sai só com o texto das que vêm do aprovado", () => {
    const before: Manifest = { photos: [photo("TI-0001", 111)] };

    const sheet = contactSheet({ next: before, approved: before, toUpload: [], hasFile: noFiles });

    if (!sheet.ok) throw new Error("a folha devia sair");
    expect(images(sheet.html)).toEqual([]);
    expect(sheet.html).toContain("0 fotos nesta rodada, 0 aprovadas pelo agente.");
  });
});

describe("main, a linha de comando da folha de contato", () => {
  const output = () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" "));
  };
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (manifest: Manifest, files: string[] = [], before?: Manifest) => {
    const work = mkdtempSync(join(tmpdir(), "contact-sheet-"));
    dirs.push(work);
    writeFileSync(join(work, "manifest.json"), JSON.stringify(manifest));
    for (const name of files) writeFileSync(join(work, name), "jpeg de mentira");
    const approved = join(work, "aprovado.json");
    writeFileSync(approved, JSON.stringify(before ?? { photos: [] }));
    const list = join(work, "equipment.json");
    writeFileSync(list, JSON.stringify([{ patrimonio: "TI-0001", nome: "Notebook de teste" }]));
    return { work, approved, list };
  };

  it("ca_14 grava a folha na pasta de trabalho, com o nome do equipamento, e sai com 0", () => {
    const lines = output();
    const { work, approved, list } = setup({ photos: [photo("TI-0001", 111)] }, ["TI-0001-111.jpg"]);

    expect(main(["--work", work, "--approved", approved], { equipmentList: list })).toBe(0);

    const html = readFileSync(join(work, "folha-de-contato.html"), "utf8");
    expect(html).toContain("<h2>TI-0001, Notebook de teste</h2>");
    expect(lines()).toEqual([
      `Folha de contato em ${join(work, "folha-de-contato.html")}. Abra no navegador e aprove antes de qualquer envio (RN-09).`,
    ]);
  });

  it("ca_14 a folha só sai de um manifesto que passa na conferência: sem veredito, sai com 1 e não grava", () => {
    const lines = output();
    const unreviewed = { photos: [{ ...photo("TI-0001", 111), review: undefined }] } as unknown as Manifest;
    const { work, approved, list } = setup(unreviewed, ["TI-0001-111.jpg"]);

    expect(main(["--work", work, "--approved", approved], { equipmentList: list })).toBe(1);

    expect(existsSync(join(work, "folha-de-contato.html"))).toBe(false);
    expect(lines()).toEqual(
      expect.arrayContaining(["  - foto 1 (TI-0001, 111): foto sem veredito (review.verdict)", "A folha de contato não foi gerada."]),
    );
  });

  it("ca_14 a folha também reprova o manifesto que muda uma foto aprovada antes (RN-20)", () => {
    const lines = output();
    const before: Manifest = { photos: [photo("TI-0001", 111)] };
    const changed: Manifest = { photos: [photo("TI-0001", 111, "approved", { downloadedAt: "2026-11-17" })] };
    const { work, approved, list } = setup(changed, [], before);

    expect(main(["--work", work, "--approved", approved], { equipmentList: list })).toBe(1);
    expect(lines()).toContain("  - a foto aprovada TI-0001-111.jpg difere da entrada do manifesto aprovado, em downloadedAt (RN-20)");
  });

  it("ca_14 sem o arquivo de uma foto da rodada, sai com 1 e diz qual falta", () => {
    const lines = output();
    const { work, approved, list } = setup({ photos: [photo("TI-0001", 111)] });

    expect(main(["--work", work, "--approved", approved], { equipmentList: list })).toBe(1);

    expect(existsSync(join(work, "folha-de-contato.html"))).toBe(false);
    expect(lines()).toEqual([
      `Faltam em ${work} os arquivos destas fotos da rodada, e a folha de contato não foi gerada:`,
      "  - TI-0001-111.jpg",
    ]);
  });

  it("ca_14 com um --approved que não existe, sai com 2", () => {
    const lines = output();
    const { work, list } = setup({ photos: [photo("TI-0001", 111)] }, ["TI-0001-111.jpg"]);
    const missing = join(work, "nao-existe.json");

    expect(main(["--work", work, "--approved", missing], { equipmentList: list })).toBe(2);
    expect(lines()).toEqual([`O manifesto aprovado ${missing} não existe ou não é um arquivo.`]);
  });
});
