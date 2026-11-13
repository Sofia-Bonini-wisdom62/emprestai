import type { EquipmentStatus, PrismaClient } from "@/generated/prisma/client";

// O catálogo e o detalhe (spec 004, RN-12 a RN-16 e RN-24 a RN-25). Toda leitura filtra pela
// área da sessão, que o router passa; nada aqui confia em id vindo do input sem ela.

export const EQUIPMENT_PAGE_SIZE = 24;

export type EquipmentView = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  // null quando a base pública das fotos não está configurada (RN-24).
  imageUrl: string | null;
  // Quem está com o item e até quando, só para o item com empréstimo em aberto (RN-13, resposta 14).
  // dueOn é a data no calendário de America/Sao_Paulo, em AAAA-MM-DD (RN-04).
  borrower: { name: string; dueOn: string } | null;
};

export type EquipmentPage = { items: EquipmentView[]; nextCursor: string | null };

const equipmentSelect = (tenantId: string) =>
  ({
    id: true,
    assetTag: true,
    name: true,
    status: true,
    imageObject: true,
    category: { select: { name: true } },
    loans: {
      where: { tenantId, returnedAt: null },
      select: { userId: true, dueOn: true },
      take: 1,
    },
  }) as const;

type EquipmentRow = {
  id: string;
  assetTag: string;
  name: string;
  status: EquipmentStatus;
  imageObject: string;
  category: { name: string };
  loans: { userId: string; dueOn: Date }[];
};

export function imageUrlFor(baseUrl: string | null, imageObject: string): string | null {
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(imageObject)}`;
}

// O @db.Date chega como meia-noite UTC do dia gravado; o dia é o que vale.
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function toViews(
  db: PrismaClient,
  rows: EquipmentRow[],
  imagesBaseUrl: string | null,
): Promise<EquipmentView[]> {
  const borrowerIds = [...new Set(rows.flatMap((row) => row.loans.map((loan) => loan.userId)))];
  const profiles = borrowerIds.length
    ? await db.profile.findMany({
        where: { id: { in: borrowerIds } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return rows.map((row) => {
    const loan = row.loans[0];
    return {
      id: row.id,
      assetTag: row.assetTag,
      name: row.name,
      category: row.category.name,
      status: row.status,
      imageUrl: imageUrlFor(imagesBaseUrl, row.imageObject),
      borrower: loan
        ? { name: names.get(loan.userId) ?? "", dueOn: dateOnly(loan.dueOn) }
        : null,
    };
  });
}

// Por cursor, na ordem do patrimônio (ADR-001, 2.3; RN-25). O cursor é o id do último item da
// página anterior; um cursor de outra área não acha nada e devolve a página vazia.
export async function listEquipment(
  db: PrismaClient,
  tenantId: string,
  page: { cursor?: string; limit?: number },
  imagesBaseUrl: string | null,
): Promise<EquipmentPage> {
  const limit = page.limit ?? EQUIPMENT_PAGE_SIZE;

  if (page.cursor) {
    const cursorInArea = await db.equipment.count({ where: { id: page.cursor, tenantId } });
    if (!cursorInArea) return { items: [], nextCursor: null };
  }

  const rows = await db.equipment.findMany({
    where: { tenantId },
    select: equipmentSelect(tenantId),
    orderBy: [{ assetTag: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: await toViews(db, pageRows, imagesBaseUrl),
    nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
  };
}

// null quando o equipamento não existe ou é de outra área: o router responde NOT_FOUND nos dois.
export async function getEquipment(
  db: PrismaClient,
  tenantId: string,
  equipmentId: string,
  imagesBaseUrl: string | null,
): Promise<EquipmentView | null> {
  const row = await db.equipment.findFirst({
    where: { id: equipmentId, tenantId },
    select: equipmentSelect(tenantId),
  });
  if (!row) return null;

  const [view] = await toViews(db, [row], imagesBaseUrl);
  return view ?? null;
}
