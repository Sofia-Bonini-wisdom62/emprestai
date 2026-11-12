import type { Metadata } from "next";

export const metadata: Metadata = { title: "Catálogo · emprestai" };

// Página provisória, só com o header, até a spec do catálogo (spec 001, contrato).
export default function CatalogPage() {
  return (
    <>
      <h1 className="text-[28px]/9 font-semibold">Catálogo</h1>
      <p className="text-secondary-text">Esta tela chega com a spec do catálogo.</p>
    </>
  );
}
