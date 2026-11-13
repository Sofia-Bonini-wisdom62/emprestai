// As datas da tela (docs/layout.md, seção 9; spec 004, RN-20). A data prevista chega do servidor
// como dia do calendário de São Paulo, em AAAA-MM-DD; formatá-la em UTC mantém o mesmo dia em
// qualquer fuso do navegador.
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
});
const fullDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const asUtcDay = (date: string) => new Date(`${date}T00:00:00Z`);

// "26/11", para card, lista e tabela.
export function formatDayMonth(date: string): string {
  return dayMonth.format(asUtcDay(date));
}

// "26/11/2026", para o detalhe, o diálogo e o aviso de resultado.
export function formatFullDate(date: string): string {
  return fullDate.format(asUtcDay(date));
}
