// O crédito das fotos na tela que as mostra (spec 004, RN-14). A fonte é o Pixabay desde a decisão
// da pessoa de 2026-11-13 ("Confirmo a troca"); o crédito fica, contra o item 9 do briefing da
// Entrega 4, pela decisão de 2026-11-11.
export function PhotoCredit() {
  return (
    <p className="text-sm/5 text-muted-foreground">
      Fotos:{" "}
      <a
        href="https://pixabay.com"
        className="text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Pixabay
      </a>
    </p>
  );
}
