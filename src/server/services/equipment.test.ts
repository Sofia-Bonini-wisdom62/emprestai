// imageUrlFor (spec 004, RN-24; spec 003, RN-17 e ADR-014, na T-05 da 003): sem a base ou sem foto
// aprovada, não há URL.
import { describe, expect, it } from "vitest";

import { imageUrlFor } from "@/server/services/equipment";

const BASE = "https://imagens.example.com/storage/v1/object/public/equipment-images";

describe("imageUrlFor", () => {
  it("ca_01 sem foto aprovada, a imagem nula não vira URL", () => {
    expect(imageUrlFor(BASE, null)).toBeNull();
  });

  it("ca_01 com a base e a foto, monta a URL pública do objeto", () => {
    expect(imageUrlFor(BASE, "TI-0001-111.jpg")).toBe(`${BASE}/TI-0001-111.jpg`);
  });

  it("ca_01 sem a base, nem a foto vira URL", () => {
    expect(imageUrlFor(null, "TI-0001-111.jpg")).toBeNull();
  });
});
