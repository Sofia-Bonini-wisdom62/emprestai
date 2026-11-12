import { Package } from "lucide-react";

import { UserMenu } from "./user-menu";

// O header da moldura (docs/layout.md, seções 4 e 5): 72px de altura, padding lateral de 32px e o
// menu do usuário à direita. À esquerda, a marca como no painel do login, no lugar do título ou
// breadcrumb da seção 5, enquanto não há a navegação lateral (spec 001, fora de escopo); a pessoa
// aceitou em 2026-11-11, na T-11. Contador, busca e slot de ação chegam com as specs que os usam.
export function AppHeader({ name, email }: { name: string; email: string | null }) {
  return (
    <header className="flex h-18 shrink-0 items-center justify-between gap-4 border-b border-border px-8">
      <div className="flex shrink-0 items-center gap-3">
        <Package aria-hidden="true" className="size-6 text-indigo-300" />
        <span className="text-[17px]/6 font-semibold text-foreground">emprestai</span>
      </div>
      <UserMenu name={name} email={email} />
    </header>
  );
}
