import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDayMonth, formatFullDate } from "@/lib/dates";

import { currentLoans } from "../current-loans";

export const metadata: Metadata = { title: "Meus empréstimos · emprestai" };

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Meus empréstimos (docs/layout.md, seção 6, tela 4; spec 004, RN-17 e RN-18): os empréstimos em
// aberto da pessoa, sem "Devolver" e sem "Já devolvidos", que são da spec de devolução. Depois de
// confirmar um pedido, o detalhe traz a pessoa para cá com a data prevista na URL, e o aviso de
// resultado aparece abaixo do header; na navegação seguinte, ele some.
export default async function MyLoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { confirmado } = await searchParams;
  const loans = await currentLoans();
  const items = loans?.items ?? [];
  // O aviso só confirma o que existe: um empréstimo em aberto da pessoa com a data da URL (RN-17;
  // CA-16). Uma data qualquer na URL não mostra nada.
  const confirmedOn =
    isDate(confirmado) && items.some((loan) => loan.dueOn === confirmado) ? confirmado : null;

  return (
    <div className="flex flex-col gap-8">
      {confirmedOn ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3 text-[15px]/6 text-foreground"
        >
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-status-available" />
          Empréstimo confirmado. Retire o item no balcão de Operações e devolva até{" "}
          {formatFullDate(confirmedOn)}.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px]/9 font-semibold">Meus empréstimos</h1>
          {loans ? (
            <p className="text-[15px]/6 text-secondary-text">
              Você está com {loans.count} de {loans.limit} itens.
            </p>
          ) : null}
        </div>
        <Link
          href="/catalog"
          className="inline-flex h-11 items-center rounded-md border border-input px-5 text-[15px]/5 font-medium text-foreground hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Ver catálogo
        </Link>
      </div>

      <section aria-labelledby="itens-com-voce" className="flex flex-col gap-4">
        <h2 id="itens-com-voce" className="text-[20px]/7 font-semibold">
          Itens com você
        </h2>
        {items.length === 0 ? (
          <p className="text-secondary-text">
            Você não está com nenhum item.{" "}
            <Link
              href="/catalog"
              className="text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Ver o catálogo
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[14px] border border-border bg-card">
            {items.map((loan) => (
              <li key={loan.id} className="flex min-h-22 items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/catalog/${loan.equipmentId}`}
                    className="text-[17px]/6 font-semibold text-foreground hover:text-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {loan.name}
                  </Link>
                  <p className="text-sm/5 text-muted-foreground">{loan.assetTag}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {loan.overdue ? <Badge variant="overdue" /> : null}
                  <p className="text-[15px]/5 text-secondary-text tabular-nums">
                    Devolver até {formatDayMonth(loan.dueOn)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
