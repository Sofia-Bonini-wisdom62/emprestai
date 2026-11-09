import { HealthStatus } from "@/app/health-status";

type EquipmentStatus = "available" | "loaned" | "maintenance";

const statusPill: Record<EquipmentStatus, { label: string; className: string }> = {
  available: {
    label: "Disponível",
    className:
      "border-status-available-border bg-status-available-bg text-status-available",
  },
  loaned: {
    label: "Emprestado",
    className: "border-status-loaned-border bg-status-loaned-bg text-status-loaned",
  },
  maintenance: {
    label: "Manutenção",
    className:
      "border-status-maintenance-border bg-status-maintenance-bg text-status-maintenance",
  },
};

// Dados fictícios de docs/layout.md, seção 10.
const sampleEquipment: {
  name: string;
  assetTag: string;
  category: string;
  status: EquipmentStatus;
  note: string;
}[] = [
  {
    name: "Notebook 14 pol.",
    assetTag: "EQ-0108",
    category: "Notebooks",
    status: "available",
    note: "Pronto para pedir",
  },
  {
    name: "Monitor 27 pol.",
    assetTag: "EQ-0213",
    category: "Monitores",
    status: "loaned",
    note: "Com Denise Araújo · volta até 19/11/2026",
  },
  {
    name: "Monitor 24 pol.",
    assetTag: "EQ-0214",
    category: "Monitores",
    status: "maintenance",
    note: "Não pode ser pedido agora",
  },
];

const audiences = [
  {
    title: "Para quem usa",
    items: [
      "Vê o catálogo e a situação de cada item",
      "Pede um item disponível",
      "Devolve e acompanha os próprios empréstimos",
    ],
  },
  {
    title: "Para Operações",
    items: [
      "Cadastra os equipamentos",
      "Vê quem está com o quê",
      "Registra a devolução no balcão",
    ],
  },
];

const rules = [
  { title: "Até 3 itens", detail: "por pessoa, ao mesmo tempo." },
  { title: "14 dias", detail: "é o prazo padrão de devolução." },
  { title: "Atraso bloqueia", detail: "quem está com item em atraso não pega outro." },
  { title: "Manutenção", detail: "item em manutenção não aparece como disponível." },
];

function BrandMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-900 text-indigo-100">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
        <path d="m3 8 9 5 9-5" />
        <path d="M12 13v8" />
      </svg>
    </span>
  );
}

function EquipmentCard({
  name,
  assetTag,
  category,
  status,
  note,
}: (typeof sampleEquipment)[number]) {
  const pill = statusPill[status];

  return (
    <article className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px]/6 font-semibold">{name}</h3>
          <p className="text-sm/5 text-muted-foreground">
            {category} · {assetTag}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[13px]/[18px] font-medium ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>
      <p className="text-sm/5 text-secondary-text">{note}</p>
    </article>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-16 px-5 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-[17px]/6 font-semibold">emprestai</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-[13px]/[18px] font-medium text-secondary-text">
            Primeira versão em construção
          </span>
          <HealthStatus />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-16">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-[36px]/[44px] font-semibold md:text-[44px]/[52px]">
              Saiba o que está disponível e com quem está cada item.
            </h1>
            <p className="max-w-[56ch] text-secondary-text">
              O emprestai substitui a planilha de equipamentos: notebooks,
              monitores, cabos e câmeras, do pedido à devolução.
            </p>
            <dl className="flex gap-10 border-t border-border pt-6">
              <div className="flex flex-col-reverse">
                <dt className="text-sm/5 text-muted-foreground">
                  itens por pessoa
                </dt>
                <dd className="text-[28px]/9 font-semibold tabular-nums">3</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-sm/5 text-muted-foreground">
                  dias de prazo
                </dt>
                <dd className="text-[28px]/9 font-semibold tabular-nums">14</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-4 rounded-[14px] bg-indigo-950 p-4 md:p-6">
            <p className="text-sm/5 text-secondary-text">
              Exemplo do catálogo, com dados fictícios
            </p>
            {sampleEquipment.map((equipment) => (
              <EquipmentCard key={equipment.assetTag} {...equipment} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="flex flex-col gap-4 rounded-[10px] border border-border bg-card p-6"
            >
              <h2 className="text-xl/7 font-semibold">{audience.title}</h2>
              <ul className="flex flex-col gap-2 text-secondary-text">
                {audience.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="text-indigo-400">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-xl/7 font-semibold">As regras do empréstimo</h2>
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {rules.map((rule) => (
              <div key={rule.title} className="border-t border-border pt-4">
                <dt className="font-semibold">{rule.title}</dt>
                <dd className="text-sm/5 text-muted-foreground">{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-border pt-6 text-sm/5 text-muted-foreground">
        Projeto de disciplina · turma B
      </footer>
    </div>
  );
}
