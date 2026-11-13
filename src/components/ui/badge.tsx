import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { CircleAlert, CircleCheck, CircleMinus, Clock, Wrench } from "lucide-react";
import type * as React from "react";

// A pill de situação de docs/layout.md, seção 5: 28px de altura, padding 0 12px, ícone de 14px à
// esquerda e sempre com texto, porque estado nunca é só cor (seção 8). Não é clicável. Escrito à
// mão no formato do Badge do shadcn/ui, sem atributo style (seção 11).
const badgeVariants = cva(
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm/5 font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        available:
          "border-status-available-border bg-status-available-bg text-status-available",
        loaned: "border-status-loaned-border bg-status-loaned-bg text-status-loaned",
        maintenance:
          "border-status-maintenance-border bg-status-maintenance-bg text-status-maintenance",
        overdue: "border-status-overdue-border bg-status-overdue-bg text-status-overdue",
        // Sem fundo e com borda tracejada de 1px (seção 2.3).
        "out-of-service": "border-dashed border-border-strong text-secondary-text",
      },
    },
  },
);

const content = {
  available: { label: "Disponível", Icon: CircleCheck },
  loaned: { label: "Emprestado", Icon: Clock },
  maintenance: { label: "Manutenção", Icon: Wrench },
  overdue: { label: "Em atraso", Icon: CircleAlert },
  "out-of-service": { label: "Fora de uso", Icon: CircleMinus },
} as const;

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({
  variant,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { variant: BadgeVariant }) {
  const { label, Icon } = content[variant];
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
}
