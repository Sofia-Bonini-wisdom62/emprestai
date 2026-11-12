// Fotos de mentira para os testes do manifesto: ids, fotógrafos e SHA-256 fictícios (RN-11).
import { LICENSE, type Manifest, type Photo, type Verdict } from "./manifest";

// Um SHA-256 diferente por id, só com dígitos hexadecimais.
export const sha = (id: number) => id.toString(16).padStart(64, "0");

export function photo(assetTag: string, pexelsId: number, verdict: Verdict = "approved", overrides: Partial<Photo> = {}): Photo {
  return {
    assetTag,
    pexelsId,
    objectName: `${assetTag}-${pexelsId}.jpg`,
    photoUrl: `https://www.pexels.com/photo/${pexelsId}/`,
    photographer: `Fotógrafa Fictícia ${pexelsId}`,
    photographerUrl: `https://www.pexels.com/@fotografa-ficticia-${pexelsId}`,
    license: { ...LICENSE },
    sourceUrl: `https://images.pexels.com/photos/${pexelsId}/pexels-photo-${pexelsId}.jpeg?fit=crop&w=800&h=600`,
    sha256: sha(pexelsId),
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
