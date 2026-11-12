// Leitura do cabeçalho JPEG sem decodificar a imagem e sem biblioteca (spec 002, RN-03 e
// RN-12 a RN-15).
// Lê os marcadores até o início dos dados (SOS): o SOF dá a largura e a altura, e o APP1
// com EXIF dá a orientação. Qualquer coisa fora do esperado é recusa, nunca palpite.

const EXPECTED_SIZE = { width: 800, height: 600 };

export type JpegInfo = {
  width: number;
  height: number;
  progressive: boolean;
  // A tag 0x0112 do EXIF, ou null quando o arquivo não tem EXIF ou não tem a tag.
  orientation: number | null;
};

export type JpegCheck =
  | { ok: true; info: JpegInfo }
  | { ok: false; reason: string };

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const APP1 = 0xe1;
// Baseline, sequencial estendido e progressivo, todos com Huffman; o valor diz se é
// progressivo. Sem perda, hierárquico e aritmético ficam de fora.
const ACCEPTED_SOF = new Map([
  [0xc0, false],
  [0xc1, false],
  [0xc2, true],
]);
// O que mais um codificador comum grava antes dos dados: tabelas de quantização (DQT) e de
// Huffman (DHT), intervalo de reinício (DRI) e comentário (COM), além de APP0 a APP15.
// Qualquer outro marcador, inclusive o FF00 e os reservados, é recusa.
const OTHER_SEGMENTS = new Set([0xdb, 0xc4, 0xdd, 0xfe]);
const isApp = (marker: number) => marker >= 0xe0 && marker <= 0xef;

// "Exif\0"; a norma manda mais um byte 0 antes do cabeçalho TIFF.
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00];
const ORIENTATION_TAG = 0x0112;

class JpegError extends Error {}

function isExif(segment: Uint8Array) {
  return (
    segment.length >= EXIF_SIGNATURE.length &&
    EXIF_SIGNATURE.every((byte, i) => segment[i] === byte)
  );
}

function readExifOrientation(segment: Uint8Array): number | null {
  if (segment.length < 6 || segment[5] !== 0) throw new JpegError("EXIF com cabeçalho inválido");

  // O cabeçalho TIFF: ordem dos bytes, 42 e o deslocamento da IFD0.
  const tiff = new DataView(segment.buffer, segment.byteOffset + 6, segment.length - 6);
  if (tiff.byteLength < 8) throw new JpegError("EXIF truncado");

  const order = tiff.getUint16(0);
  if (order !== 0x4949 && order !== 0x4d4d) throw new JpegError("EXIF com ordem de bytes inválida");
  const little = order === 0x4949;
  if (tiff.getUint16(2, little) !== 42) throw new JpegError("EXIF sem a marca 42 do TIFF");

  const ifd = tiff.getUint32(4, little);
  if (ifd + 2 > tiff.byteLength) throw new JpegError("EXIF com IFD0 fora do segmento");
  const entries = tiff.getUint16(ifd, little);
  // A IFD tem a contagem, 12 bytes por entrada e o ponteiro de 4 bytes da próxima IFD.
  if (ifd + 2 + entries * 12 + 4 > tiff.byteLength) throw new JpegError("EXIF com IFD0 truncada");

  let orientation: number | null = null;
  for (let n = 0; n < entries; n++) {
    const entry = ifd + 2 + n * 12;
    if (tiff.getUint16(entry, little) !== ORIENTATION_TAG) continue;
    if (orientation !== null) throw new JpegError("orientação EXIF repetida");
    // SHORT (tipo 3), um valor, guardado nos 2 primeiros bytes do campo de valor.
    if (tiff.getUint16(entry + 2, little) !== 3) throw new JpegError("EXIF com orientação de tipo inválido");
    orientation = tiff.getUint16(entry + 8, little);
  }
  return orientation;
}

// O SOF: precisão, altura, largura, número de componentes e 3 bytes por componente.
function readFrame(payload: Uint8Array, progressive: boolean) {
  if (payload.length < 6) throw new JpegError("SOF com tamanho inválido");
  const components = payload[5];
  if (components === 0) throw new JpegError("SOF sem componentes");
  if (payload.length !== 6 + 3 * components) throw new JpegError("SOF com tamanho inválido");
  if (payload[0] !== 8) throw new JpegError(`SOF com precisão de ${payload[0]} bits, e não 8`);
  return {
    height: (payload[1] << 8) | payload[2],
    width: (payload[3] << 8) | payload[4],
    progressive,
  };
}

function readJpegHeader(bytes: Uint8Array): JpegInfo {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== SOI) {
    throw new JpegError("não é um JPEG");
  }
  // O leitor para no SOS e não percorre os dados da imagem: sem o EOI nos dois últimos
  // bytes, o arquivo foi cortado ou traz bytes depois do fim, e os dois são recusa.
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== EOI) {
    throw new JpegError("o arquivo não termina no fim da imagem (EOI): truncado ou com bytes a mais");
  }

  let size: Omit<JpegInfo, "orientation"> | null = null;
  let orientation: number | null = null;
  let exifSeen = false;
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new JpegError(`byte inesperado na posição ${offset}`);
    // Bytes 0xFF de preenchimento podem vir antes do marcador.
    while (bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) throw new JpegError("arquivo truncado num marcador");
    const marker = bytes[offset];
    offset++;

    if (marker === EOI) break;
    if (marker !== SOS && !ACCEPTED_SOF.has(marker) && !OTHER_SEGMENTS.has(marker) && !isApp(marker)) {
      const hex = marker.toString(16).padStart(2, "0");
      throw new JpegError(`marcador 0x${hex} não aceito antes dos dados da imagem`);
    }

    if (offset + 2 > bytes.length) throw new JpegError("arquivo truncado no tamanho de um segmento");
    // O tamanho conta os 2 bytes dele mesmo.
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2) throw new JpegError("segmento com tamanho inválido");
    if (offset + length > bytes.length) throw new JpegError("arquivo truncado num segmento");
    const payload = bytes.subarray(offset + 2, offset + length);

    if (marker === SOS) {
      if (!size) throw new JpegError("os dados da imagem começam antes do SOF");
      return { ...size, orientation };
    }
    if (ACCEPTED_SOF.has(marker)) {
      if (size) throw new JpegError("SOF repetido");
      size = readFrame(payload, ACCEPTED_SOF.get(marker) === true);
    } else if (marker === APP1 && isExif(payload)) {
      // Os decodificadores leem o primeiro EXIF; com dois, a orientação seria um palpite.
      if (exifSeen) throw new JpegError("EXIF repetido");
      exifSeen = true;
      orientation = readExifOrientation(payload);
    }

    offset += length;
  }

  throw new JpegError("arquivo sem os dados da imagem (SOS)");
}

// O portão do RN-03: JPEG, exatamente 800×600 e sem orientação EXIF diferente de 1.
export function checkJpeg(bytes: Uint8Array): JpegCheck {
  let info: JpegInfo;
  try {
    info = readJpegHeader(bytes);
  } catch (error) {
    if (error instanceof JpegError) return { ok: false, reason: error.message };
    return { ok: false, reason: "cabeçalho JPEG ilegível" };
  }

  const { width, height } = EXPECTED_SIZE;
  if (info.width !== width || info.height !== height) {
    return { ok: false, reason: `tamanho ${info.width}×${info.height}, e não ${width}×${height}` };
  }
  if (info.orientation !== null && info.orientation !== 1) {
    return { ok: false, reason: `orientação EXIF ${info.orientation}, e não 1` };
  }
  return { ok: true, info };
}
