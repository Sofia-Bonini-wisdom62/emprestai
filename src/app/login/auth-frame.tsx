import type { ReactNode } from "react";

import { BrandPanel } from "./brand-panel";

// A moldura do login, que Definir senha, Esqueci minha senha e o "Continuar" do link também usam
// (docs/layout.md, seção 6, telas 1, 7 e 8): duas colunas (5/12 e 7/12) a partir de 1024px e uma
// abaixo disso (RN-29), com o painel da marca à esquerda (RN-58).
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-12">
      <BrandPanel className="lg:col-span-5" />
      <section className="flex items-center px-5 py-10 md:px-8 lg:col-span-7 lg:justify-center">
        {children}
      </section>
    </main>
  );
}
