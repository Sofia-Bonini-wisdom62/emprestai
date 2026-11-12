import type { Metadata } from "next";

export const metadata: Metadata = { title: "Empréstimos em aberto · emprestai" };

// Página provisória, só com o header, até a spec da tela de Operações (spec 001, contrato).
export default function OperationsLoansPage() {
  return (
    <>
      <h1 className="text-[28px]/9 font-semibold">Empréstimos em aberto</h1>
      <p className="text-secondary-text">Esta tela chega com a spec da tela de Operações.</p>
    </>
  );
}
