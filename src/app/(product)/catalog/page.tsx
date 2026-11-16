import type { Metadata } from "next";

import { BlockedNotice } from "@/components/equipment/blocked-notice";
import { PhotoCredit } from "@/components/equipment/photo-credit";

import { currentLoans } from "../current-loans";
import { CatalogGrid } from "./catalog-grid";

export const metadata: Metadata = { title: "Catálogo · emprestai" };

// O catálogo da spec 004 (RN-12 a RN-14): os equipamentos da área, em cards, e o crédito das fotos.
// A busca, os filtros e o quadro de regras ficam para a próxima spec do catálogo (spec 004, Fora de
// escopo).
// Com item em atraso, o quadro de bloqueio aparece acima do grid (RN-06; CA-04).
export default async function CatalogPage() {
  const loans = await currentLoans();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[28px]/9 font-semibold">Catálogo</h1>
      {loans?.hasOverdue ? <BlockedNotice /> : null}
      <CatalogGrid />
      <PhotoCredit />
    </div>
  );
}
