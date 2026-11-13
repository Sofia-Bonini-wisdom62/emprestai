import { Package } from "lucide-react";
import Link from "next/link";

import { UserMenu } from "./user-menu";

// O header da moldura (docs/layout.md, seções 4 e 5): 72px de altura, padding lateral de 32px e o
// menu do usuário à direita. À esquerda, a marca como no painel do login, no lugar do título ou
// breadcrumb da seção 5, enquanto não há a navegação lateral (spec 001, fora de escopo); a pessoa
// aceitou em 2026-11-11, na T-11. Ao lado da marca, os links "Catálogo" e "Meus empréstimos", para
// todo papel: é por eles que quem é de Operações chega ao catálogo (spec 004, RN-19). A busca e o
// slot de ação chegam com as specs que os usam.
export function AppHeader({
  name,
  email,
  loans,
}: {
  name: string;
  email: string | null;
  loans: { count: number; limit: number } | null;
}) {
  return (
    <header className="flex h-18 shrink-0 items-center justify-between gap-4 border-b border-border px-8">
      <div className="flex min-w-0 items-center gap-6">
        <div className="flex shrink-0 items-center gap-3">
          <Package aria-hidden="true" className="size-6 text-indigo-300" />
          <span className="text-[17px]/6 font-semibold text-foreground">emprestai</span>
        </div>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <HeaderLink href="/catalog">Catálogo</HeaderLink>
          <HeaderLink href="/my-loans">Meus empréstimos</HeaderLink>
        </nav>
      </div>
      <div className="flex min-w-0 items-center gap-4">
        {loans ? <LoanCounter count={loans.count} limit={loans.limit} /> : null}
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center rounded-md px-3 text-[15px]/5 text-secondary-text hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </Link>
  );
}

// O contador com o indicador de limite compacto (docs/layout.md, seção 5): uma barra por item,
// preenchida em indigo 400 para cada empréstimo em aberto (spec 004, RN-19). No limite, o texto
// ganha "Limite atingido", como no layout.
function LoanCounter({ count, limit }: { count: number; limit: number }) {
  const text =
    count >= limit
      ? `Você está com ${count} de ${limit} itens. Limite atingido.`
      : `Você está com ${count} de ${limit} itens`;

  return (
    <p className="flex shrink-0 items-center gap-3 text-sm/5 text-secondary-text">
      <span aria-hidden="true" className="flex gap-2">
        {Array.from({ length: limit }, (_, index) => (
          <span
            key={index}
            className={
              index < count
                ? "h-2 w-5 rounded-full bg-indigo-400"
                : "h-2 w-5 rounded-full border border-border-strong"
            }
          />
        ))}
      </span>
      <span>{text}</span>
    </p>
  );
}
