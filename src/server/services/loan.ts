import { Prisma, type PrismaClient } from "@/generated/prisma/client";

// Solicitar empréstimo (spec 004). Toda a regra do pedido mora aqui, numa transação só
// (RN-03 a RN-09 e RN-22); o router só traduz o resultado.

export const LOAN_LIMIT = 3; // RN-03; resposta 40
export const LOAN_DAYS = 14; // RN-04; respostas 4, 4b e 41
const TIME_ZONE = "America/Sao_Paulo"; // RN-04, RN-05 e RN-20

export type LoanRefusalReason = "EQUIPMENT_UNAVAILABLE" | "LOAN_LIMIT_REACHED" | "LOAN_OVERDUE";

// O texto que a pessoa vê em cada recusa (RN-10).
export const loanRefusalMessages: Record<LoanRefusalReason, string> = {
  EQUIPMENT_UNAVAILABLE: "Este equipamento não está disponível.",
  LOAN_LIMIT_REACHED: `Você já está com ${LOAN_LIMIT} itens. Devolva um para pedir outro.`,
  LOAN_OVERDUE: "Você tem um item em atraso. Devolva-o para pedir outro.",
};

export type CreatedLoan = { id: string; equipmentId: string; dueOn: string };

export type CreateLoanResult =
  | { ok: true; loan: CreatedLoan }
  | { ok: false; reason: LoanRefusalReason | "NOT_FOUND" };

// A data do calendário de São Paulo no instante dado, em AAAA-MM-DD. A Vercel roda em UTC, e um
// pedido às 22h30 de São Paulo já é o dia seguinte em UTC.
export function calendarDateInSaoPaulo(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

// AAAA-MM-DD mais n dias corridos, sem fuso: só o calendário.
export function addCalendarDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

// A confirmação mais 14 dias corridos, sem ajuste (RN-04).
export function dueOnFor(confirmedAt: Date): string {
  return addCalendarDays(calendarDateInSaoPaulo(confirmedAt), LOAN_DAYS);
}

// O @db.Date do Prisma lê e grava a meia-noite UTC do dia.
const asDbDate = (date: string) => new Date(`${date}T00:00:00Z`);

class Refused extends Error {
  constructor(readonly reason: LoanRefusalReason | "NOT_FOUND") {
    super(reason);
  }
}

function isOpenLoanUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createLoan(
  db: PrismaClient,
  input: { tenantId: string; userId: string; equipmentId: string; now: Date },
): Promise<CreateLoanResult> {
  const { tenantId, userId, equipmentId, now } = input;
  const dueOn = dueOnFor(now);
  const today = calendarDateInSaoPaulo(now);

  try {
    const loan = await db.$transaction(async (tx) => {
      // 1. Enfileira os pedidos da mesma pessoa: o segundo só conta depois que o primeiro
      // confirmou (RN-09; CA-06). Sem vínculo na área, não há o que pedir.
      const membership = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM memberships
        WHERE tenant_id = ${tenantId}::uuid AND user_id = ${userId}::uuid
        FOR UPDATE`;
      if (membership.length === 0) throw new Refused("NOT_FOUND");

      // O equipamento tem de ser desta área; o de outra é NOT_FOUND, sem dizer que existe (CA-15).
      const equipment = await tx.equipment.findFirst({
        where: { id: equipmentId, tenantId },
        select: { id: true },
      });
      if (!equipment) throw new Refused("NOT_FOUND");

      // 2. O atraso e o limite, só com os empréstimos em aberto desta área (RN-03, RN-05, RN-06).
      const overdue = await tx.loan.count({
        where: { tenantId, userId, returnedAt: null, dueOn: { lt: asDbDate(today) } },
      });
      if (overdue > 0) throw new Refused("LOAN_OVERDUE");

      const open = await tx.loan.count({ where: { tenantId, userId, returnedAt: null } });
      if (open >= LOAN_LIMIT) throw new Refused("LOAN_LIMIT_REACHED");

      // 3. Só passa a loaned quem ainda estava available; o segundo de dois pedidos simultâneos
      // ao mesmo equipamento espera a trava da linha e não acha mais nada (RN-07 a RN-09; CA-05).
      const taken = await tx.equipment.updateMany({
        where: { id: equipmentId, tenantId, status: "available" },
        data: { status: "loaned" },
      });
      if (taken.count === 0) throw new Refused("EQUIPMENT_UNAVAILABLE");

      // O índice único parcial é a defesa se outro caminho tiver gravado um empréstimo em aberto.
      const created = await tx.loan.create({
        data: { tenantId, equipmentId, userId, dueOn: asDbDate(dueOn) },
        select: { id: true, equipmentId: true },
      });

      // 4. A auditoria, na mesma transação (RN-22).
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorUserId: userId,
          action: "loan.create",
          resourceType: "loan",
          resourceId: created.id,
        },
      });

      return { ...created, dueOn };
    });

    return { ok: true, loan };
  } catch (error) {
    if (error instanceof Refused) return { ok: false, reason: error.reason };
    if (isOpenLoanUniqueViolation(error)) return { ok: false, reason: "EQUIPMENT_UNAVAILABLE" };
    throw error;
  }
}

export type MyOpenLoan = {
  id: string;
  equipmentId: string;
  assetTag: string;
  name: string;
  dueOn: string;
  overdue: boolean;
};

export type MyOpenLoans = {
  items: MyOpenLoan[];
  count: number;
  limit: number;
  hasOverdue: boolean;
};

// Os empréstimos em aberto da pessoa nesta área, do vencimento mais próximo ao mais distante. Sem
// paginação: o RN-03 os limita a 3 (RN-25). O header, o detalhe e Meus empréstimos leem daqui a
// contagem, o limite e o atraso (RN-16, RN-18 e RN-19).
export async function listMyOpenLoans(
  db: PrismaClient,
  input: { tenantId: string; userId: string; now: Date },
): Promise<MyOpenLoans> {
  const today = calendarDateInSaoPaulo(input.now);
  const loans = await db.loan.findMany({
    where: { tenantId: input.tenantId, userId: input.userId, returnedAt: null },
    select: {
      id: true,
      equipmentId: true,
      dueOn: true,
      equipment: { select: { assetTag: true, name: true } },
    },
    orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
  });

  const items = loans.map((loan) => {
    const dueOn = loan.dueOn.toISOString().slice(0, 10);
    return {
      id: loan.id,
      equipmentId: loan.equipmentId,
      assetTag: loan.equipment.assetTag,
      name: loan.equipment.name,
      dueOn,
      // Em atraso a partir do dia seguinte à data prevista (RN-05).
      overdue: dueOn < today,
    };
  });

  return {
    items,
    count: items.length,
    limit: LOAN_LIMIT,
    hasOverdue: items.some((item) => item.overdue),
  };
}
