import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { crop } from "./crop";
import {
  fakeJpeg,
  firstQuantizationTable,
  luminanceTableFor,
  metadataKinds,
  pixel,
  segmentsBeforeScan,
  stripedJpeg,
} from "./image.fixtures";
import { checkJpeg } from "./jpeg";
import { sha256 } from "./sha256";

// O recorte só serve se o leitor da T-02, que não usa o sharp, aprovar o arquivo.
async function cropped(source: Uint8Array) {
  const result = await crop(source);
  if (!result.ok) throw new Error(`o recorte deveria ter passado: ${result.reason}`);
  return result.bytes;
}

describe("crop, o recorte do RN-03 pelo sharp, CA-14 (spec 002)", () => {
  it("ca_14 uma origem de 1280×853 com orientação 6, ICC e XMP sai em 800×600 baseline, sem metadados, e o leitor aprova", async () => {
    const source = await fakeJpeg({ width: 1280, height: 853, orientation: 6, icc: true, xmp: true });
    expect(metadataKinds(source)).toEqual(expect.arrayContaining(["EXIF", "XMP", "ICC"]));

    const bytes = await cropped(source);

    expect(checkJpeg(bytes)).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: false, orientation: null },
    });
    expect(segmentsBeforeScan(bytes).filter((name) => /^APP([1-9]|1[0-5])$|^COM$/.test(name))).toEqual([]);
  });

  it.each([
    ["na horizontal", "horizontal" as const, [5, 400, 794].map((x) => [x, 300])],
    ["na vertical", "vertical" as const, [5, 300, 594].map((y) => [400, y])],
  ])("ca_14 recorta pelo centro %s: das faixas vermelha, verde e azul, só o verde fica", async (_, direction, points) => {
    const bytes = await cropped(await stripedJpeg(direction));

    for (const [x, y] of points) {
      const [red, green, blue] = await pixel(bytes, x, y);
      expect(green).toBeGreaterThan(200);
      expect(red).toBeLessThan(60);
      expect(blue).toBeLessThan(60);
    }
  });

  it.each([
    [800, 600],
    [800, 700],
  ])("ca_14 uma origem de %i×%i, no limite da largura, passa", async (width, height) => {
    expect(checkJpeg(await cropped(await fakeJpeg({ width, height })))).toMatchObject({ ok: true, info: { width: 800, height: 600 } });
  });

  it("ca_14 grava com a qualidade 80: a tabela de luminância é a do anexo K escalada para 80", async () => {
    const table = firstQuantizationTable(await cropped(await fakeJpeg({ width: 1280, height: 853 })));

    expect(table).toEqual(luminanceTableFor(80));
    expect(table).not.toEqual(luminanceTableFor(81));
  });

  it("ca_14 os mesmos bytes de origem dão o mesmo arquivo, com o mesmo SHA-256", async () => {
    const source = await fakeJpeg({ width: 1280, height: 853, orientation: 6, shade: 7 });

    expect(sha256(await cropped(source))).toBe(sha256(await cropped(source)));
  });

  it("ca_14 a origem é medida depois da orientação: 900×600 com orientação 6 fica 600×900 e é recusada", async () => {
    expect(await crop(await fakeJpeg({ width: 900, height: 600, orientation: 6 }))).toEqual({
      ok: false,
      reason: "a origem tem 600×900, menor que 800×600 (RN-03)",
    });
  });

  it.each([5, 6, 7, 8])("ca_14 com a orientação %i, que gira a foto, 900×600 fica 600×900 e é recusada", async (orientation) => {
    expect(await crop(await fakeJpeg({ width: 900, height: 600, orientation }))).toEqual({
      ok: false,
      reason: "a origem tem 600×900, menor que 800×600 (RN-03)",
    });
  });

  it.each([1, 2, 3, 4])("ca_14 com a orientação %i, que não gira a foto, 900×600 continua 900×600 e passa", async (orientation) => {
    const bytes = await cropped(await fakeJpeg({ width: 900, height: 600, orientation }));

    expect(checkJpeg(bytes)).toMatchObject({ ok: true, info: { width: 800, height: 600, orientation: null } });
  });

  it("ca_14 a origem é medida depois da orientação: 600×900 com orientação 6 fica 900×600 e passa", async () => {
    const bytes = await cropped(await fakeJpeg({ width: 600, height: 900, orientation: 6 }));

    expect(checkJpeg(bytes)).toMatchObject({ ok: true, info: { width: 800, height: 600 } });
  });

  it.each([
    ["mais estreita", 799, 600],
    ["mais baixa", 1280, 599],
    ["panorâmica", 1280, 512],
  ])("ca_14 uma origem %s que 800×600 é recusada, sem ampliar", async (_, width, height) => {
    expect(await crop(await fakeJpeg({ width, height }))).toEqual({
      ok: false,
      reason: `a origem tem ${width}×${height}, menor que 800×600 (RN-03)`,
    });
  });

  it("ca_14 bytes que não são imagem são recusados", async () => {
    expect(await crop(new TextEncoder().encode("<html>não é foto</html>"))).toEqual({
      ok: false,
      reason: "a origem não é uma imagem que o sharp abra",
    });
  });

  it("ca_14 o package.json traz o sharp só em devDependencies, na versão exata 0.35.5 (RN-08)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Record<string, Record<string, string> | undefined>;

    expect(pkg.devDependencies?.sharp).toBe("0.35.5");
    for (const group of ["dependencies", "optionalDependencies", "peerDependencies"]) {
      expect(pkg[group]?.sharp).toBeUndefined();
    }
  });
});
