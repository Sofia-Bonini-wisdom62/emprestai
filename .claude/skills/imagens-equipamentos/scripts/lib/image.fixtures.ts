// Fotos de mentira para os testes da T-05, geradas pelo sharp: um retângulo de uma cor só, nunca
// uma foto real (RN-11). O tom muda os bytes, para as fotos de cada caso serem diferentes.
import sharp from "sharp";

export type FakePhoto = {
  width: number;
  height: number;
  orientation?: number;
  icc?: boolean;
  xmp?: boolean;
  shade?: number;
};

export async function fakeJpeg({ width, height, orientation, icc = false, xmp = false, shade = 0 }: FakePhoto): Promise<Uint8Array> {
  let image = sharp({ create: { width, height, channels: 3, background: { r: (40 + shade) % 256, g: 90, b: 140 } } }).jpeg();
  if (orientation !== undefined) image = image.withMetadata({ orientation });
  if (icc) image = image.withIccProfile("srgb");
  if (xmp) image = image.withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta>');
  return new Uint8Array(await image.toBuffer());
}

// Uma imagem em três faixas, vermelha, verde e azul, com a verde no meio: o recorte pelo centro
// só pega o verde. Na horizontal, 1600×600 em colunas; na vertical, 800×1800 em linhas.
export async function stripedJpeg(direction: "horizontal" | "vertical" = "horizontal"): Promise<Uint8Array> {
  const horizontal = direction === "horizontal";
  const [width, height] = horizontal ? [1600, 600] : [800, 1800];
  const side = horizontal ? { width: 400, height: 600 } : { width: 800, height: 600 };
  const band = (background: string) => ({ create: { ...side, channels: 3 as const, background } });
  const end = horizontal ? { left: 1200, top: 0 } : { left: 0, top: 1200 };
  const image = sharp({ create: { width, height, channels: 3, background: "#00ff00" } })
    .composite([
      { input: band("#ff0000"), left: 0, top: 0 },
      { input: band("#0000ff"), ...end },
    ])
    .jpeg();
  return new Uint8Array(await image.toBuffer());
}

// Os cabeçalhos dos segmentos de metadados que a origem traz: o EXIF e o XMP no APP1 e o ICC no
// APP2, lidos nos bytes, sem o sharp que gera a imagem.
export function metadataKinds(bytes: Uint8Array): string[] {
  const kinds: string[] = [];
  let at = 2;
  const startsWith = (offset: number, text: string) =>
    new TextDecoder("latin1").decode(bytes.subarray(offset, offset + text.length)) === text;
  while (at + 3 < bytes.length) {
    const marker = bytes[at + 1];
    if (marker === 0xda) break;
    const body = at + 4;
    if (marker === 0xe1 && startsWith(body, "Exif\0")) kinds.push("EXIF");
    if (marker === 0xe1 && startsWith(body, "http://ns.adobe.com/xap/1.0/\0")) kinds.push("XMP");
    if (marker === 0xe2 && startsWith(body, "ICC_PROFILE\0")) kinds.push("ICC");
    at += 2 + ((bytes[at + 2] << 8) | bytes[at + 3]);
  }
  return kinds;
}

// A cor de um ponto da imagem, em RGB.
export async function pixel(bytes: Uint8Array, x: number, y: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * info.channels;
  return [data[at], data[at + 1], data[at + 2]];
}

// A tabela de quantização de luminância do anexo K do JPEG, em ordem natural, e a ordem
// zigue-zague em que ela vai no arquivo. Escalada como o libjpeg faz, ela diz a qualidade.
const LUMINANCE = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80,
  62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98,
  112, 100, 103, 99,
];
const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42,
  49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

export function luminanceTableFor(quality: number): number[] {
  const scale = quality < 50 ? Math.floor(5000 / quality) : 200 - quality * 2;
  return ZIGZAG.map((index) => Math.min(255, Math.max(1, Math.floor((LUMINANCE[index] * scale + 50) / 100))));
}

// A primeira tabela de quantização gravada no arquivo, a de luminância.
export function firstQuantizationTable(bytes: Uint8Array): number[] | null {
  let at = 2;
  while (at + 3 < bytes.length) {
    const marker = bytes[at + 1];
    if (marker === 0xda) return null;
    if (marker === 0xdb) return [...bytes.subarray(at + 5, at + 5 + 64)];
    at += 2 + ((bytes[at + 2] << 8) | bytes[at + 3]);
  }
  return null;
}

// Os marcadores antes do SOS, como APP0, APP1 ou COM, para conferir que o recorte sai sem
// metadados (RN-03). Lê só os tamanhos dos segmentos, como o leitor da T-02.
export function segmentsBeforeScan(bytes: Uint8Array): string[] {
  const names: string[] = [];
  let at = 2;
  while (at + 3 < bytes.length) {
    const marker = bytes[at + 1];
    if (marker === 0xda) break;
    names.push(marker >= 0xe0 && marker <= 0xef ? `APP${marker - 0xe0}` : marker === 0xfe ? "COM" : `FF${marker.toString(16).toUpperCase()}`);
    at += 2 + ((bytes[at + 2] << 8) | bytes[at + 3]);
  }
  return names;
}
