"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";

// O menu do usuário, único lugar com "Sair" (docs/layout.md, seção 5; RN-30).
export function UserMenu({ name, email }: { name: string; email: string | null }) {
  const router = useRouter();
  const signOut = trpc.auth.signOut.useMutation();
  const [leaving, setLeaving] = useState(false);

  // O servidor apaga o cookie mesmo com o Auth fora do ar e devolve /login (RN-54). Se nem ele
  // responder, a ida a /login confere a sessão de novo e mostra a tela certa.
  async function leave() {
    setLeaving(true);
    let destination = "/login";
    try {
      destination = (await signOut.mutateAsync()).redirectTo;
    } catch {
      // Segue para /login.
    }
    router.replace(destination);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* O nome tem até 80 caracteres (RN-20): encolhe com reticências, e o nome acessível fica inteiro. */}
        <Button variant="ghost" size="sm" className="min-w-0 shrink">
          <span className="truncate">{name}</span>
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-[15px]/5 font-medium text-foreground">{name}</span>
          {email ? <span className="text-sm/5 text-muted-foreground">{email}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={leaving}
          onSelect={(event) => {
            event.preventDefault();
            void leave();
          }}
        >
          <LogOut aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
