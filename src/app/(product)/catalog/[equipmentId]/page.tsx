import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BlockedNotice } from "@/components/equipment/blocked-notice";
import { EquipmentPhoto } from "@/components/equipment/equipment-photo";
import { PhotoCredit } from "@/components/equipment/photo-credit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFullDate } from "@/lib/dates";
import type { EquipmentView } from "@/server/services/equipment";
import { dueOnFor, loanRefusalMessages, type MyOpenLoans } from "@/server/services/loan";
import { serverCaller } from "@/trpc/server";

import { currentLoans } from "../../current-loans";
import { RequestLoan } from "./request-loan";

export const metadata: Metadata = { title: "Equipamento · emprestai" };

const badgeOf = {
  available: "available",
  loaned: "loaned",
  maintenance: "maintenance",
  out_of_service: "out-of-service",
} as const;

async function findEquipment(equipmentId: string): Promise<EquipmentView | null> {
  if (!z.uuid().safeParse(equipmentId).success) return null;
  try {
    const caller = await serverCaller();
    return await caller.equipment.byId({ equipmentId });
  } catch {
    // NOT_FOUND, de outra área ou inexistente (CA-15), e qualquer outra falha: a página não existe.
    return null;
  }
}

// O detalhe do equipamento (docs/layout.md, seção 6, tela 3; spec 004, RN-15 e RN-16): a foto, a
// ficha e, na lateral, o card "Solicitar empréstimo". O histórico fica para a próxima spec do
// catálogo (spec 004, Fora de escopo).
export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;
  const [equipment, loans] = await Promise.all([findEquipment(equipmentId), currentLoans()]);
  if (!equipment) notFound();

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Trilha" className="flex items-center gap-2 text-[15px]/5">
        <Link
          href="/catalog"
          className="text-indigo-400 hover:text-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Catálogo
        </Link>
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-secondary-text">{equipment.category}</span>
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        <span aria-current="page" className="text-foreground">
          {equipment.name}
        </span>
      </nav>

      {loans?.hasOverdue ? <BlockedNotice /> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-[14px] border border-border">
            <EquipmentPhoto imageUrl={equipment.imageUrl} category={equipment.category} />
          </div>
          <PhotoCredit />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px]/9 font-semibold">{equipment.name}</h1>
            <Badge variant={badgeOf[equipment.status]} />
          </div>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-sm/5 text-muted-foreground">Categoria</dt>
              <dd className="text-[15px]/5 text-foreground">{equipment.category}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm/5 text-muted-foreground">Patrimônio</dt>
              <dd className="text-[15px]/5 text-foreground">{equipment.assetTag}</dd>
            </div>
          </dl>
        </section>

        <aside className="flex h-fit flex-col gap-4 rounded-[14px] border border-border bg-card p-6">
          <h2 className="text-[17px]/6 font-semibold">Solicitar empréstimo</h2>
          <RequestCard equipment={equipment} loans={loans} />
        </aside>
      </div>
    </div>
  );
}

function RequestCard({
  equipment,
  loans,
}: {
  equipment: EquipmentView;
  loans: MyOpenLoans | null;
}) {
  if (equipment.status === "loaned" && equipment.borrower) {
    return (
      <p className="text-[15px]/6 text-secondary-text">
        Com {equipment.borrower.name} · volta até {formatFullDate(equipment.borrower.dueOn)}
      </p>
    );
  }
  if (equipment.status === "maintenance") {
    return (
      <p className="text-[15px]/6 text-secondary-text">Em manutenção. Não pode ser pedido agora.</p>
    );
  }
  if (equipment.status !== "available") {
    return <p className="text-[15px]/6 text-secondary-text">Este equipamento não está disponível.</p>;
  }

  // A data que o pedido teria se fosse confirmado agora; o servidor recalcula ao confirmar (RN-04).
  const dueOn = dueOnFor(new Date());
  const count = loans?.count ?? 0;
  const limit = loans?.limit ?? 3;
  const blockedBy = loans?.hasOverdue
    ? loanRefusalMessages.LOAN_OVERDUE
    : count >= limit
      ? loanRefusalMessages.LOAN_LIMIT_REACHED
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm/5 text-muted-foreground">Prazo padrão de 14 dias corridos</p>
        <p className="text-[15px]/6 text-foreground">
          Devolver até <span className="font-semibold">{formatFullDate(dueOn)}</span>
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm/5 font-semibold text-foreground">Retirada</p>
        <p className="text-[15px]/6 text-secondary-text">Retire no balcão de Operações</p>
        <p className="text-sm/5 text-muted-foreground">
          O prazo conta a partir da confirmação, não da retirada.
        </p>
      </div>
      {blockedBy ? (
        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full" disabled>
            Solicitar empréstimo
          </Button>
          <p className="text-sm/5 text-secondary-text">{blockedBy}</p>
        </div>
      ) : (
        <RequestLoan
          equipmentId={equipment.id}
          dueOn={dueOn}
          countAfter={count + 1}
          limit={limit}
        />
      )}
    </div>
  );
}
