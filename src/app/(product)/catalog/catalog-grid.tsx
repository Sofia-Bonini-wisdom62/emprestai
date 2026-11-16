"use client";

import { LoaderCircle } from "lucide-react";

import { EquipmentCard } from "@/components/equipment/equipment-card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

// O grid do catálogo (docs/layout.md, seção 6, tela 2): 3 colunas a partir de 1280px, 2 a partir de
// 768px e 1 abaixo. As páginas vêm por cursor, 24 por vez (spec 004, RN-25).
export function CatalogGrid() {
  const query = trpc.equipment.list.useInfiniteQuery(
    {},
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );

  if (query.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-secondary-text">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
        Carregando equipamentos
      </p>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-secondary-text">
        Não foi possível carregar o catálogo. Recarregue a página.
      </p>
    );
  }

  const items = query.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return <p className="text-secondary-text">Nenhum equipamento cadastrado.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((equipment) => (
          <li key={equipment.id} className="flex flex-col [&>a]:flex-1">
            <EquipmentCard equipment={equipment} />
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : null}
          Mostrar mais equipamentos
        </Button>
      ) : null}
    </div>
  );
}
