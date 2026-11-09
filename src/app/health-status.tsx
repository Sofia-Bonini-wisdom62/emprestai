"use client";

import { trpc } from "@/trpc/client";

// Variantes da pill de saúde: reaproveitam as cores de estado do layout, sem
// serem estado de equipamento.
const pillVariants = {
  checking: "border-status-loaned-border bg-status-loaned-bg text-status-loaned",
  ok: "border-status-available-border bg-status-available-bg text-status-available",
  failed: "border-status-overdue-border bg-status-overdue-bg text-status-overdue",
};

export function HealthStatus() {
  const health = trpc.health.check.useQuery(undefined, { retry: false });

  let label: string;
  let variant: keyof typeof pillVariants;

  if (health.isPending) {
    label = "Verificando o banco de dados";
    variant = "checking";
  } else if (health.isError) {
    // Sem error.message: o texto do erro não é escrito para quem usa a tela.
    label = "Servidor indisponível. Recarregue a página.";
    variant = "failed";
  } else if (health.data.status === "ok") {
    label = "Banco de dados ok";
    variant = "ok";
  } else {
    label = health.data.message;
    variant = "failed";
  }

  // Um span só, nunca desmontado: o leitor de tela anuncia a troca do texto.
  return (
    <span
      role="status"
      aria-live="polite"
      className={`rounded-full border px-2.5 py-0.5 text-[13px]/[18px] font-medium ${pillVariants[variant]}`}
    >
      {label}
    </span>
  );
}
