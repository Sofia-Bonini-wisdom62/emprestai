import * as React from "react"
import { cn } from "cn"

// Ajustado a docs/layout.md, seções 2.4, 4 e 5 (Input): 44px de altura, padding lateral de 14px,
// fundo --surface-sunken, borda --input, hover --border-strong e inválido com a borda de atraso.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-surface-sunken px-3.5 text-[15px]/6 text-foreground transition-colors placeholder:text-muted-foreground hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-text-disabled aria-invalid:border-status-overdue-border",
        className
      )}
      {...props}
    />
  )
}

export { Input }
