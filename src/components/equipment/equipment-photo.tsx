import { cn } from "cn";
import { Cable, Camera, Laptop, Monitor, Package, Projector } from "lucide-react";

// Os ícones das cinco categorias iniciais (docs/layout.md, seção 5.1). A categoria criada por
// Operações usa o da marca.
const categoryIcons: Record<string, typeof Package> = {
  Notebooks: Laptop,
  Monitores: Monitor,
  Câmeras: Camera,
  Cabos: Cable,
  Projetores: Projector,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = categoryIcons[category] ?? Package;
  return <Icon aria-hidden="true" className={className} />;
}

// A foto em 4:3 (spec 004, RN-12 e RN-26): um <img> comum, porque o next/image escreve style, que
// o ADR-002 proíbe. O tamanho de 800×600 vai nos atributos, e a classe só a encaixa na área. Sem
// a base das fotos, o ícone da categoria fica no lugar (RN-24; resposta 46).
export function EquipmentPhoto({
  imageUrl,
  category,
  className,
}: {
  imageUrl: string | null;
  category: string;
  className?: string;
}) {
  return (
    <div className={cn("flex aspect-[4/3] w-full items-center justify-center bg-surface-sunken", className)}>
      {imageUrl ? (
        // O texto alternativo fica vazio: o nome do equipamento está logo abaixo, e a foto não diz
        // nada a mais (docs/layout.md, seção 8).
        <img
          src={imageUrl}
          alt=""
          width={800}
          height={600}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <CategoryIcon category={category} className="size-12 text-muted-foreground" />
      )}
    </div>
  );
}
