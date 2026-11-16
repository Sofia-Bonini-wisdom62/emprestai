// O card, a foto e o crédito sem a base das fotos (spec 004, T-09; CA-18). O E2E sobe sempre o
// servidor de fotos, então a tela sem foto se prova montando os componentes com o react-dom/server,
// que já é dependência, sem biblioteca de teste nova.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { EquipmentView } from "@/server/services/equipment";

import { EquipmentCard } from "./equipment-card";
import { EquipmentPhoto } from "./equipment-photo";
import { PhotoCredit, showsPhotoCredit } from "./photo-credit";

const BASE = "https://imagens.example.com/storage/v1/object/public/equipment-images";

function equipment(imageUrl: string | null): EquipmentView {
  return {
    id: "6f1c1f8e-2b7a-4f3c-9d1e-111111111111",
    assetTag: "TI-0005",
    name: "Monitor 24 polegadas",
    category: "Monitores",
    status: "available",
    imageUrl,
    borrower: null,
  };
}

const card = (imageUrl: string | null) =>
  renderToStaticMarkup(createElement(EquipmentCard, { equipment: equipment(imageUrl) }));

describe("sem a base das fotos", () => {
  it("ca_18 o card mostra o ícone da categoria, sem <img> e sem endereço do bucket", () => {
    const html = card(null);

    expect(html).not.toContain("<img");
    expect(html).not.toContain("equipment-images");
    // O ícone de Monitores, em 48px (docs/layout.md, seção 5.1).
    expect(html).toContain("lucide-monitor");
    expect(html).toContain("size-12");
    expect(html).toContain("Monitor 24 polegadas");
  });

  it("ca_18 a área da foto do detalhe também mostra só o ícone", () => {
    const html = renderToStaticMarkup(
      createElement(EquipmentPhoto, { imageUrl: null, category: "Monitores" }),
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("lucide-monitor");
    expect(html).toContain("aspect-[4/3]");
  });

  it("ca_18 sem nenhuma foto na página, o crédito não aparece", () => {
    expect(showsPhotoCredit([equipment(null), equipment(null)])).toBe(false);
    expect(showsPhotoCredit([])).toBe(false);
  });
});

describe("com a base das fotos", () => {
  it("ca_18 o card mostra a <img> de 800×600 e não o ícone", () => {
    const html = card(`${BASE}/TI-0005-111.jpg`);

    expect(html).toContain(`src="${BASE}/TI-0005-111.jpg"`);
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
    expect(html).not.toContain("lucide-monitor");
  });

  it("ca_18 com uma foto na página, o crédito aparece, com o link do Pixabay", () => {
    expect(showsPhotoCredit([equipment(null), equipment(`${BASE}/TI-0005-111.jpg`)])).toBe(true);
    expect(renderToStaticMarkup(createElement(PhotoCredit))).toContain('href="https://pixabay.com"');
  });
});
