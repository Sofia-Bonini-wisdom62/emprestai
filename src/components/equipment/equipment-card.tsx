import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDayMonth } from "@/lib/dates";
import type { EquipmentView } from "@/server/services/equipment";

import { EquipmentPhoto } from "./equipment-photo";

const badgeOf = {
  available: "available",
  loaned: "loaned",
  maintenance: "maintenance",
  out_of_service: "out-of-service",
} as const;

// O card do catálogo (docs/layout.md, seção 5; spec 004, RN-12 e RN-13): o card inteiro leva ao
// detalhe, com a foto em 4:3 no topo, o nome, "categoria · patrimônio", a pill e a última linha,
// que muda com a situação.
export function EquipmentCard({ equipment }: { equipment: EquipmentView }) {
  return (
    <Link
      href={`/catalog/${equipment.id}`}
      className="group rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full transition-colors duration-150 ease-out group-hover:border-border-strong">
        <EquipmentPhoto imageUrl={equipment.imageUrl} category={equipment.category} />
        <CardContent className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-[17px]/6 font-semibold text-foreground">{equipment.name}</h3>
              <p className="text-sm/5 text-muted-foreground">
                {equipment.category} · {equipment.assetTag}
              </p>
            </div>
            <Badge variant={badgeOf[equipment.status]} />
          </div>
          <CardFooterLine equipment={equipment} />
        </CardContent>
      </Card>
    </Link>
  );
}

function CardFooterLine({ equipment }: { equipment: EquipmentView }) {
  if (equipment.status === "available") {
    return (
      <p className="mt-auto flex items-center gap-1.5 text-[15px]/5 text-indigo-400">
        Ver e solicitar
        <ArrowRight aria-hidden="true" className="size-4" />
      </p>
    );
  }

  if (equipment.status === "loaned" && equipment.borrower) {
    return (
      <div className="mt-auto flex flex-col">
        <p className="text-sm/5 text-secondary-text">Com {equipment.borrower.name}</p>
        <p className="text-sm/5 text-muted-foreground tabular-nums">
          Volta até {formatDayMonth(equipment.borrower.dueOn)}
        </p>
      </div>
    );
  }

  if (equipment.status === "maintenance") {
    return <p className="mt-auto text-sm/5 text-secondary-text">Em manutenção</p>;
  }

  // Fora de uso: o caso fica fora da spec 004 (pergunta 9b).
  return null;
}
