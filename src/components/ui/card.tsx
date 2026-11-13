import { cn } from "cn";
import type * as React from "react";

// O Card de docs/layout.md, seção 5: fundo --card, borda --border e raio de 14px. Escrito à mão no
// formato do Card do shadcn/ui, sem atributo style (seção 11).
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col overflow-hidden rounded-[14px] border border-border bg-card", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex flex-col gap-3 p-5", className)} {...props} />;
}
