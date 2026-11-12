import { describe, expect, it } from "vitest";

import { checkJpeg } from "./jpeg";

// JPEG montados em bytes: APP0, as tabelas (DQT e DHT), o SOF e um SOS com alguns bytes de
// dados e o EOI, como grava um codificador comum. Nenhum arquivo de imagem real entra no
// repositório.

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
  // O tipo TIFF da entrada; a orientação é SHORT (3).
  type?: number;
  // Quantas entradas a IFD0 diz ter; por padrão, as que existem.
  count?: number;
  // Se a IFD0 termina no ponteiro de 4 bytes da próxima IFD, como manda o TIFF.
  next?: boolean;
};

function exif({
  orientations,
  order = "MM",
  pad = 0,
  type = 3,
  count = orientations.length,
  next = true,
}: Exif) {
  const u16 = (n: number) => (order === "II" ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) =>
    order === "II"
      ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]
      : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  // Orientação: tag 0x0112, um valor do tipo dado.
  const entries = orientations.flatMap((value) => [
    ...u16(0x0112),
    ...u16(type),
    ...u32(1),
    ...u16(value),
    0,
    0,
  ]);
  const tiff = [
    ...(order === "II" ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(count),
    ...entries,
    ...(next ? u32(0) : []),
  ];
  return segment(0xe1, [...text("Exif\0"), pad, ...tiff]);
}

// O EXIF com orientação 6 e alguns bytes trocados. As posições contam do FF do APP1: 4 bytes
// de marcador e tamanho, 6 de "Exif\0\0", e o TIFF (MM) começa no 10, com a ordem dos bytes
// em 10-11, o 42 em 12-13 e o deslocamento da IFD0 em 14-17.
function patchedExif(patch: Record<number, number>) {
  const bytes = exif({ orientations: [6] });
  for (const [at, value] of Object.entries(patch)) bytes[Number(at)] = value;
  return bytes;
}

type Frame = {
  sof?: number;
  width?: number;
  height?: number;
  precision?: number;
  // O número de componentes que o SOF declara.
  components?: number;
  // De quantos componentes o SOF traz os 3 bytes; por padrão, dos que declara.
  componentBytes?: number;
};

function frame({
  sof = 0xc0,
  width = 800,
  height = 600,
  precision = 8,
  components = 1,
  componentBytes = components,
}: Frame = {}) {
  const data = Array.from({ length: componentBytes }, (_, i) => [i + 1, 0x11, 0]).flat();
  return segment(sof, [precision, height >> 8, height & 0xff, width >> 8, width & 0xff, components, ...data]);
}

const APP0 = segment(0xe0, [...text("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const DQT = segment(0xdb, Array.from({ length: 65 }, () => 1));
const DHT = segment(0xc4, [0x00, 1, ...Array.from({ length: 15 }, () => 0), 0x00]);
const SOS = [...segment(0xda, [1, 1, 0, 0, 0x3f, 0]), 0x12, 0x34, 0x56];
const EOI = [0xff, 0xd9];

type Build = Frame & {
  // Bytes a mais entre o APP0 e as tabelas: EXIF, outros segmentos, preenchimento.
  extra?: number[];
};

function jpeg({ extra = [], ...sof }: Build = {}) {
  return new Uint8Array([0xff, 0xd8, ...APP0, ...extra, ...DQT, ...frame(sof), ...DHT, ...SOS, ...EOI]);
}

const marker = (hex: string) => `marcador 0x${hex} não aceito antes dos dados da imagem`;

describe("checkJpeg, CA-02 (spec 002, RN-03)", () => {
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
      "cortado no meio do SOF, mesmo com o EOI no fim",
      (bytes: Uint8Array) => {
        const sof = bytes.findIndex((byte, i) => byte === 0xff && bytes[i + 1] === 0xc0);
        return new Uint8Array([...bytes.subarray(0, sof + 6), ...EOI]);
      },
      "arquivo truncado num segmento",
    ],
  ])("ca_02 um arquivo truncado é recusado: %s", (_, cut, reason) => {
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
});

describe("checkJpeg, RN-12: os marcadores antes dos dados da imagem", () => {
  it("ca_11 passam DQT, DHT, DRI, comentário, XMP, ICC, APP14, APP15 e bytes 0xFF de preenchimento", () => {
    const extra = [
      0xff,
      0xff,
      0xff,
      ...segment(0xdd, [0, 0]),
      ...segment(0xe1, text("http://ns.adobe.com/xap/1.0/\0<x/>")),
      ...segment(0xe2, [...text("ICC_PROFILE\0"), 1, 1]),
      ...segment(0xee, [...text("Adobe"), 0, 100, 0, 0, 0, 0, 1]),
      ...segment(0xef, text("teste")),
      ...segment(0xfe, text("teste")),
    ];

    expect(checkJpeg(jpeg({ extra }))).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: false, orientation: null },
    });
  });

  it("ca_11 um SOF1 de 8 bits passa", () => {
    expect(checkJpeg(jpeg({ sof: 0xc1 }))).toEqual({
      ok: true,
      info: { width: 800, height: 600, progressive: false, orientation: null },
    });
  });

  const head = [0xff, 0xd8, ...APP0];

  it.each([
    ["um JPEG sem perda (SOF3)", jpeg({ sof: 0xc3 }), marker("c3")],
    ["um JPEG aritmético (SOF9)", jpeg({ sof: 0xc9 }), marker("c9")],
    ["um JPEG hierárquico (DHP)", jpeg({ extra: segment(0xde, [8, 2, 0x58, 3, 0x20, 1]) }), marker("de")],
    ["um FF00 antes do SOF", jpeg({ extra: [0xff, 0x00, 0x00, 0x05] }), marker("00")],
    ["o JPG0 (0xF0), logo depois do APP15", jpeg({ extra: segment(0xf0, [0, 0]) }), marker("f0")],
    [
      "um byte que não é marcador onde um marcador deveria vir",
      jpeg({ extra: [0x12] }),
      `byte inesperado na posição ${head.length}`,
    ],
    ["um segmento de tamanho menor que 2", jpeg({ extra: [0xff, 0xfe, 0x00, 0x01] }), "segmento com tamanho inválido"],
    ["um segundo SOF", jpeg({ extra: frame() }), "SOF repetido"],
    [
      "o SOS antes do SOF",
      new Uint8Array([...head, ...DQT, ...DHT, ...SOS, ...EOI]),
      "os dados da imagem começam antes do SOF",
    ],
    ["o fim da imagem antes do SOS", new Uint8Array([...head, ...DQT, ...frame(), ...EOI]), "arquivo sem os dados da imagem (SOS)"],
  ])("ca_11 é recusado: %s", (_, bytes, reason) => {
    expect(checkJpeg(bytes)).toEqual({ ok: false, reason });
  });
});

describe("checkJpeg, RN-13: o SOF", () => {
  it.each([
    ["um SOF1 de 12 bits", { sof: 0xc1, precision: 12 }, "SOF com precisão de 12 bits, e não 8"],
    ["um SOF2 de 12 bits", { sof: 0xc2, precision: 12 }, "SOF com precisão de 12 bits, e não 8"],
    ["um SOF sem componentes", { components: 0 }, "SOF sem componentes"],
    ["um SOF com menos bytes que os componentes que declara", { components: 3, componentBytes: 1 }, "SOF com tamanho inválido"],
    ["um SOF com mais bytes que os componentes que declara", { components: 1, componentBytes: 2 }, "SOF com tamanho inválido"],
  ])("ca_11 é recusado: %s", (_, build, reason) => {
    expect(checkJpeg(jpeg(build))).toEqual({ ok: false, reason });
  });
});

describe("checkJpeg, RN-14: o EXIF", () => {
  it.each([
    ["um segundo EXIF, com o primeiro dizendo 6", [...exif({ orientations: [6] }), ...exif({ orientations: [1] })], "EXIF repetido"],
    ["a orientação duas vezes na IFD0", exif({ orientations: [1, 6] }), "orientação EXIF repetida"],
    ["a orientação com tipo LONG, e não SHORT", exif({ orientations: [6], type: 4 }), "EXIF com orientação de tipo inválido"],
    ["o byte depois de Exif\\0 diferente de 0", exif({ orientations: [6], pad: 0xff }), "EXIF com cabeçalho inválido"],
    ["só Exif\\0, sem o byte seguinte", segment(0xe1, text("Exif\0")), "EXIF com cabeçalho inválido"],
    ["o TIFF com menos de 8 bytes", segment(0xe1, [...text("Exif\0"), 0, 0x4d, 0x4d, 0, 42]), "EXIF truncado"],
    ["a ordem de bytes que não é II nem MM", patchedExif({ 10: 0x58, 11: 0x58 }), "EXIF com ordem de bytes inválida"],
    ["o TIFF sem a marca 42", patchedExif({ 13: 43 }), "EXIF sem a marca 42 do TIFF"],
    ["a IFD0 fora do segmento", patchedExif({ 16: 0x10 }), "EXIF com IFD0 fora do segmento"],
    ["a IFD0 com mais entradas do que traz", exif({ orientations: [6], count: 5 }), "EXIF com IFD0 truncada"],
    ["a IFD0 sem o ponteiro da próxima IFD", exif({ orientations: [6], next: false }), "EXIF com IFD0 truncada"],
  ])("ca_11 é recusado: %s", (_, extra, reason) => {
    expect(checkJpeg(jpeg({ extra }))).toEqual({ ok: false, reason });
  });
});

describe("checkJpeg, RN-15: o fim do arquivo", () => {
  it.each([
    ["cortado nos dados da imagem", (bytes: Uint8Array) => bytes.subarray(0, bytes.length - 4)],
    ["com bytes depois do fim da imagem", (bytes: Uint8Array) => new Uint8Array([...bytes, 0, 0])],
  ])("ca_11 é recusado o arquivo que não termina em FF D9: %s", (_, change) => {
    expect(checkJpeg(change(jpeg()))).toEqual({
      ok: false,
      reason: "o arquivo não termina no fim da imagem (EOI): truncado ou com bytes a mais",
    });
  });
});
