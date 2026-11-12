import { describe, expect, it } from "vitest";

import { checkJpeg } from "./jpeg";

// JPEG montados em bytes: só os segmentos que o leitor olha, mais um SOS com alguns bytes
// de dados e o EOI. Nenhum arquivo de imagem real entra no repositório.

function segment(marker: number, payload: number[]) {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

const text = (value: string) => Array.from(new TextEncoder().encode(value));

type Exif = {
  // Um valor por entrada 0x0112 na IFD0.
  orientations: number[];
  order?: "II" | "MM";
  // O byte depois de "Exif\0", que a norma manda ser 0.
  pad?: number;
};

function exif({ orientations, order = "MM", pad = 0 }: Exif) {
  const u16 = (n: number) => (order === "II" ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) =>
    order === "II"
      ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]
      : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  // Orientação: tag 0x0112, SHORT, um valor.
  const entries = orientations.flatMap((value) => [
    ...u16(0x0112),
    ...u16(3),
    ...u32(1),
    ...u16(value),
    0,
    0,
  ]);
  const tiff = [
    ...(order === "II" ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(orientations.length),
    ...entries,
    ...u32(0),
  ];
  return segment(0xe1, [...text("Exif\0"), pad, ...tiff]);
}

type Build = {
  sof?: number;
  width?: number;
  height?: number;
  precision?: number;
  // Bytes a mais entre o APP0 e as tabelas: EXIF, outros segmentos, preenchimento.
  extra?: number[];
};

function jpeg({ sof = 0xc0, width = 800, height = 600, precision = 8, extra = [] }: Build = {}) {
  return new Uint8Array([
    0xff,
    0xd8,
    ...segment(0xe0, [...text("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...extra,
    ...segment(0xdb, Array.from({ length: 65 }, () => 1)),
    ...segment(sof, [precision, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]),
    ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12,
    0x34,
    0x56,
    0xff,
    0xd9,
  ]);
}

describe("checkJpeg (spec 002, RN-03)", () => {
  it("ca_02 um 800×600 baseline passa", () => {
    expect(checkJpeg(jpeg())).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: false, orientation: null },
    });
  });

  it("ca_02 um 800×600 progressivo passa", () => {
    expect(checkJpeg(jpeg({ sof: 0xc2 }))).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: true, orientation: null },
    });
  });

  it.each([
    [800, 601],
    [801, 600],
  ])("ca_02 um %i×%i é recusado", (width, height) => {
    expect(checkJpeg(jpeg({ width, height }))).toEqual({
      ok: false,
      reason: `tamanho ${width}×${height}, e não 800×600`,
    });
  });

  it("ca_02 um PNG é recusado", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

    expect(checkJpeg(png)).toEqual({ ok: false, reason: "não é um JPEG" });
  });

  it.each([
    [
      "cortado nos dados da imagem",
      (bytes: Uint8Array) => bytes.subarray(0, bytes.length - 4),
      "o arquivo não termina no fim da imagem (EOI): truncado ou com bytes a mais",
    ],
    [
      "com bytes depois do fim da imagem",
      (bytes: Uint8Array) => new Uint8Array([...bytes, 0, 0]),
      "o arquivo não termina no fim da imagem (EOI): truncado ou com bytes a mais",
    ],
    [
      "cortado no meio do SOF, mesmo com o EOI no fim",
      (bytes: Uint8Array) => {
        const sof = bytes.findIndex((byte, i) => byte === 0xff && bytes[i + 1] === 0xc0);
        return new Uint8Array([...bytes.subarray(0, sof + 6), 0xff, 0xd9]);
      },
      "arquivo truncado num segmento",
    ],
  ])("ca_02 um arquivo %s é recusado", (_, cut, reason) => {
    expect(checkJpeg(cut(jpeg()))).toEqual({ ok: false, reason });
  });

  it.each(["II", "MM"] as const)(
    "ca_02 um JPEG com orientação EXIF 6 é recusado (TIFF %s)",
    (order) => {
      expect(checkJpeg(jpeg({ extra: exif({ orientations: [6], order }) }))).toEqual({
        ok: false,
        reason: "orientação EXIF 6, e não 1",
      });
    },
  );

  it("ca_02 orientação EXIF 1 passa", () => {
    expect(checkJpeg(jpeg({ extra: exif({ orientations: [1] }) }))).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: false, orientation: 1 },
    });
  });

  it.each([
    ["dois EXIF, o primeiro com 6", [...exif({ orientations: [6] }), ...exif({ orientations: [1] })], "EXIF repetido"],
    ["a orientação duas vezes na IFD0", exif({ orientations: [1, 6] }), "orientação EXIF repetida"],
    ["o byte depois de Exif\\0 diferente de 0", exif({ orientations: [6], pad: 0xff }), "EXIF com cabeçalho inválido"],
  ])("ca_02 um EXIF ambíguo é recusado: %s", (_, extra, reason) => {
    expect(checkJpeg(jpeg({ extra }))).toEqual({ ok: false, reason });
  });

  it("ca_02 bytes 0xFF de preenchimento, XMP, ICC e comentário antes do SOF não atrapalham", () => {
    const extra = [
      0xff,
      0xff,
      0xff,
      ...segment(0xe1, text("http://ns.adobe.com/xap/1.0/\0<x/>")),
      ...segment(0xe2, [...text("ICC_PROFILE\0"), 1, 1]),
      ...segment(0xfe, text("teste")),
    ];

    expect(checkJpeg(jpeg({ extra }))).toMatchObject({ ok: true });
  });

  it.each([
    ["sem perda (SOF3)", { sof: 0xc3 }, "marcador 0xc3 não aceito antes dos dados da imagem"],
    ["aritmético (SOF9)", { sof: 0xc9 }, "marcador 0xc9 não aceito antes dos dados da imagem"],
    ["hierárquico (DHP)", { extra: segment(0xde, [8, 2, 0x58, 3, 0x20, 0]) }, "marcador 0xde não aceito antes dos dados da imagem"],
    ["com FF00 antes do SOF", { extra: [0xff, 0x00, 0x00, 0x05] }, "marcador 0x00 não aceito antes dos dados da imagem"],
    ["de 12 bits", { sof: 0xc1, precision: 12 }, "SOF com precisão de 12 bits, e não 8"],
  ])("ca_02 um JPEG %s é recusado", (_, build, reason) => {
    expect(checkJpeg(jpeg(build))).toEqual({ ok: false, reason });
  });

  it("ca_02 os dados da imagem antes do SOF são recusados", () => {
    const bytes = new Uint8Array([
      0xff, 0xd8, ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]), 0x12, 0xff, 0xd9,
    ]);

    expect(checkJpeg(bytes)).toEqual({
      ok: false,
      reason: "os dados da imagem começam antes do SOF",
    });
  });
});
