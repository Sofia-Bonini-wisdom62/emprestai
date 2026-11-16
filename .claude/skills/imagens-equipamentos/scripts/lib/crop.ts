// O recorte do RN-03 (spec 002; ADR-011, seção 1.3): do largeImageURL baixado, um JPEG de
// exatamente 800×600. O sharp aplica a orientação EXIF, reduz e recorta pelo centro, sem ampliar,
// e grava um JPEG baseline com qualidade 80, sem metadados. Quem gera não é quem confere: o
// arquivo ainda passa pelo leitor de JPEG da T-02, que não usa o sharp.
import sharp from "sharp";

export const WIDTH = 800;
export const HEIGHT = 600;
export const QUALITY = 80;

export type CropResult = { ok: true; bytes: Uint8Array } | { ok: false; reason: string };

// As orientações EXIF de 5 a 8 giram a foto em 90 graus: a largura vira a altura.
const turned = (orientation: number | undefined) => orientation !== undefined && orientation >= 5 && orientation <= 8;

// O recorte, ou o motivo da recusa. A origem é medida depois de aplicar a orientação EXIF.
export async function crop(source: Uint8Array): Promise<CropResult> {
  let width: number | undefined;
  let height: number | undefined;
  try {
    const metadata = await sharp(source).metadata();
    [width, height] = turned(metadata.orientation) ? [metadata.height, metadata.width] : [metadata.width, metadata.height];
  } catch {
    return { ok: false, reason: "a origem não é uma imagem que o sharp abra" };
  }
  if (!width || !height) return { ok: false, reason: "a origem não diz o próprio tamanho" };
  if (width < WIDTH || height < HEIGHT) {
    return { ok: false, reason: `a origem tem ${width}×${height}, menor que ${WIDTH}×${HEIGHT} (RN-03)` };
  }

  try {
    // Sem withMetadata nem keep*: o sharp grava sem EXIF, ICC, XMP nem IPTC.
    const bytes = await sharp(source)
      .autoOrient()
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, progressive: false })
      .toBuffer();
    return { ok: true, bytes: new Uint8Array(bytes) };
  } catch {
    return { ok: false, reason: "o sharp não conseguiu recortar a origem" };
  }
}
