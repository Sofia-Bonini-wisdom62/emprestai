import { cn } from "cn";
import { Package } from "lucide-react";

// O painel da marca, à esquerda do login, de Definir senha e de Esqueci minha senha
// (docs/layout.md, seção 6, telas 1, 7 e 8). Os textos são os do RN-50 da spec 001.
export function BrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex flex-col justify-between gap-10 bg-indigo-950 px-5 py-8 md:px-8 lg:px-12 lg:py-12",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Package aria-hidden="true" className="size-6 text-indigo-300" />
        <span className="text-[17px]/6 font-semibold text-foreground">emprestai</span>
      </div>

      <div className="flex flex-col gap-8">
        <p className="max-w-[20ch] text-[28px]/9 font-semibold text-foreground lg:text-[36px]/[44px]">
          Saiba o que está disponível e com quem está cada item.
        </p>
        <dl className="flex gap-10">
          <div className="flex flex-col-reverse">
            <dt className="text-sm/5 text-secondary-text">itens por pessoa</dt>
            <dd className="text-[28px]/9 font-semibold tabular-nums text-foreground">3</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm/5 text-secondary-text">dias de prazo</dt>
            <dd className="text-[28px]/9 font-semibold tabular-nums text-foreground">14</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
