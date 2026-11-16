// Carregamento das categorias e dos equipamentos iniciais (spec 003, T-02; ADR-013 e ADR-014). O
// seed do dev (T-04) e o passo de produção (T-03) leem os dois arquivos de prisma/data/ e chamam
// este módulo, que não lê o ambiente nem o disco: recebe o conteúdo já lido.
import type { EquipmentStatus, PrismaClient } from "../src/generated/prisma/client";
import { checkManifest, type Manifest } from "../.claude/skills/imagens-equipamentos/scripts/lib/manifest";
import { DEFAULT_TENANT } from "./default-tenant";

// As cinco categorias que nascem (RN-05), na ordem da resposta 12, e a chave da lista que liga
// cada uma; Projetores nasce vazia.
export const CATEGORY_NAMES = ["Notebooks", "Monitores", "Câmeras", "Cabos", "Projetores"] as const;
const CATEGORY_BY_KEY: Record<string, (typeof CATEGORY_NAMES)[number]> = {
  notebook: "Notebooks",
  monitor: "Monitores",
  cabo: "Cabos",
  camera: "Câmeras",
};

// A situação da lista com a chave do glossário (RN-03).
const STATUS_BY_KEY: Record<string, EquipmentStatus> = {
  disponivel: "available",
  manutencao: "maintenance",
};

// Um item como a lista da prática o escreve (enunciado, seção 03; spec 002, RN-10).
type ListItem = { patrimonio: string; nome: string; categoria: string; situacao: string };

export type PlannedEquipment = {
  assetTag: string;
  name: string;
  categoryName: (typeof CATEGORY_NAMES)[number];
  status: EquipmentStatus;
  // O objectName da foto aprovada no manifesto, ou nulo sem foto (RN-17; ADR-014).
  imageObject: string | null;
};

export type EquipmentPlan =
  | { ok: true; items: PlannedEquipment[] }
  | { ok: false; problems: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFilled = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

// O mapeamento explícito entre os dois nomes do mesmo dado (decisão da pessoa de 2026-11-12): o
// manifesto da spec 002 chama de objectName o que o equipamento guarda em imageObject. Só a foto
// aprovada conta.
export function imageObjectFor(manifest: Manifest | null, assetTag: string): string | null {
  const approved = manifest?.photos.find(
    (photo) => photo.assetTag === assetTag && photo.review.verdict === "approved",
  );
  return approved ? approved.objectName : null;
}

// Confere o conjunto inteiro antes de qualquer gravação (RN-08). O manifesto é opcional (RN-17):
// sem ele, a imagem fica nula; com ele, passa pela conferência da spec 002.
export function planEquipmentData(list: unknown, manifest: unknown): EquipmentPlan {
  if (!Array.isArray(list)) {
    return { ok: false, problems: ["a lista de equipamentos não é uma lista"] };
  }

  const problems: string[] = [];
  const seen = new Set<string>();
  const items: ListItem[] = [];

  list.forEach((entry: unknown, index) => {
    const label = `item ${index + 1}`;
    if (!isRecord(entry)) {
      problems.push(`${label}: não é um objeto`);
      return;
    }
    const { patrimonio, nome, categoria, situacao } = entry;
    if (!isFilled(patrimonio)) problems.push(`${label}: falta o patrimônio (patrimonio)`);
    if (!isFilled(nome)) problems.push(`${label}: falta o nome (nome)`);
    if (!isFilled(categoria) || !(categoria in CATEGORY_BY_KEY)) {
      problems.push(`${label}: a categoria (categoria) não é notebook, monitor, cabo nem camera`);
    }
    if (!isFilled(situacao) || !(situacao in STATUS_BY_KEY)) {
      problems.push(`${label}: a situação (situacao) não é disponivel nem manutencao`);
    }
    if (isFilled(patrimonio)) {
      if (seen.has(patrimonio)) problems.push(`${label}: o patrimônio ${patrimonio} se repete`);
      seen.add(patrimonio);
    }
    if (isFilled(patrimonio) && isFilled(nome) && isFilled(categoria) && isFilled(situacao)) {
      items.push({ patrimonio, nome, categoria, situacao });
    }
  });

  let checked: Manifest | null = null;
  if (manifest !== null && manifest !== undefined) {
    const result = checkManifest(manifest);
    if (result.ok) checked = result.manifest;
    else problems.push(...result.problems.map((problem) => `manifesto: ${problem}`));
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    items: items.map((item) => ({
      assetTag: item.patrimonio,
      name: item.nome,
      categoryName: CATEGORY_BY_KEY[item.categoria],
      status: STATUS_BY_KEY[item.situacao],
      imageObject: imageObjectFor(checked, item.patrimonio),
    })),
  };
}

export type LoadResult = { created: number; imageUpdated: number; withoutImage: number };

// Sem parameter property: o Node só apaga tipos, e o passo de produção roda este arquivo direto.
export class EquipmentDataError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Dados iniciais recusados, nada foi gravado:\n- ${problems.join("\n- ")}`);
    this.problems = problems;
  }
}

// Grava as categorias e os equipamentos na área (RN-06 e RN-07), numa transação só. Cria o que
// falta; no que já existe, só troca a imagem, e só quando o manifesto traz uma foto. Nunca muda a
// situação, o nome nem a categoria, e a imagem nunca volta a nula. A área é a default; os testes
// passam outra, porque o first-admin.test.ts cria e apaga a default no mesmo banco.
export async function loadEquipmentData(
  db: PrismaClient,
  list: unknown,
  manifest: unknown,
  tenantSlug: string = DEFAULT_TENANT.slug,
): Promise<LoadResult> {
  const plan = planEquipmentData(list, manifest);
  if (!plan.ok) throw new EquipmentDataError(plan.problems);

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new EquipmentDataError([`a área ${tenantSlug} não existe; o passo do ADR-009 ou o seed a cria antes`]);
    }

    const categoryIds = new Map<string, string>();
    const categoryIdOf = (name: string) => {
      const id = categoryIds.get(name);
      if (!id) throw new Error(`categoria ${name} sem id`);
      return id;
    };
    for (const name of CATEGORY_NAMES) {
      const category = await tx.equipmentCategory.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        update: {},
        create: { tenantId: tenant.id, name },
      });
      categoryIds.set(name, category.id);
    }

    const result: LoadResult = { created: 0, imageUpdated: 0, withoutImage: 0 };
    for (const item of plan.items) {
      const existing = await tx.equipment.findUnique({
        where: { tenantId_assetTag: { tenantId: tenant.id, assetTag: item.assetTag } },
        select: { id: true, imageObject: true },
      });

      if (!existing) {
        await tx.equipment.create({
          data: {
            tenantId: tenant.id,
            assetTag: item.assetTag,
            name: item.name,
            categoryId: categoryIdOf(item.categoryName),
            status: item.status,
            imageObject: item.imageObject,
          },
        });
        result.created++;
        if (item.imageObject === null) result.withoutImage++;
        continue;
      }

      if (item.imageObject !== null && item.imageObject !== existing.imageObject) {
        await tx.equipment.update({ where: { id: existing.id }, data: { imageObject: item.imageObject } });
        result.imageUpdated++;
      } else if (existing.imageObject === null && item.imageObject === null) {
        result.withoutImage++;
      }
    }
    return result;
  });
}
