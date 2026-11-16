import { Ban } from "lucide-react";

// O quadro de regras na variante de bloqueio (docs/layout.md, seção 5): aparece quando a pessoa tem
// item em atraso, no catálogo e no detalhe (spec 004, RN-06 e CA-04). A variante informativa fica
// para a próxima spec do catálogo.
export function BlockedNotice() {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-[14px] border border-status-overdue-border bg-card p-4"
    >
      <Ban aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-status-overdue" />
      <div className="flex flex-col gap-1">
        <p className="text-[15px]/5 font-semibold text-foreground">Você tem um item em atraso</p>
        <p className="text-sm/5 text-secondary-text">
          Você tem um item em atraso. Devolva-o para pedir outro.
        </p>
      </div>
    </div>
  );
}
