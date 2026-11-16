// Fotos de mentira para os testes do manifesto: ids, autores e SHA-256 fictícios (RN-11).
import { LICENSE, type Manifest, type Photo, type Verdict } from "./manifest";

// Um SHA-256 diferente por id, só com dígitos hexadecimais.
export const sha = (id: number) => id.toString(16).padStart(64, "0");

export function photo(assetTag: string, pixabayId: number, verdict: Verdict = "approved", overrides: Partial<Photo> = {}): Photo {
  return {
    assetTag,
    pixabayId,
    objectName: `${assetTag}-${pixabayId}.jpg`,
    photoUrl: `https://pixabay.com/photos/foto-ficticia-${pixabayId}/`,
    photographer: `Autora Fictícia ${pixabayId}`,
    photographerUrl: `https://pixabay.com/users/autora-ficticia-${pixabayId}-${pixabayId + 9000}/`,
    license: { ...LICENSE },
    sourceUrl: `https://pixabay.com/get/ficticia${pixabayId}_1280.jpg`,
    sha256: sha(pixabayId),
    downloadedAt: "2026-11-12T10:00:00Z",
    review: {
      verdict,
      reason: verdict === "approved" ? "só o equipamento, sem pessoa, marca nem texto" : "tela com interface legível",
    },
    ...overrides,
  };
}

// Três patrimônios, cada um com uma foto aprovada, e uma foto reprovada no TI-0001.
export const complete = (): Manifest => ({
  photos: [
    photo("TI-0001", 111),
    photo("TI-0001", 112, "rejected"),
    photo("TI-0002", 222),
    photo("TI-0003", 333),
  ],
});
