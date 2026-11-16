import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseEquipment } from "../../.claude/skills/imagens-equipamentos/scripts/search";
import { planEquipmentData } from "../equipment-data";

// A lista dos 12 equipamentos da prática (spec 002, RN-10 e CA-08), copiada sem mudança da
// seção 03 do enunciado. A situação de cada item é assunto da spec 003, que lê este arquivo.
const list: unknown = JSON.parse(readFileSync(new URL("./equipment.json", import.meta.url), "utf8"));

const FIELDS = ["patrimonio", "nome", "categoria", "situacao", "busca"];
const items = () => list as Array<Record<string, unknown>>;

describe("prisma/data/equipment.json, CA-08 (spec 002, RN-10)", () => {
  it("ca_08 tem os 12 equipamentos da prática", () => {
    expect(Array.isArray(list)).toBe(true);
    expect(items()).toHaveLength(12);
  });

  it("ca_08 os patrimônios vão de TI-0001 a TI-0012, sem repetir", () => {
    const expected = Array.from({ length: 12 }, (_, n) => `TI-${String(n + 1).padStart(4, "0")}`);

    expect(items().map((item) => item.patrimonio)).toEqual(expected);
    expect(new Set(items().map((item) => item.patrimonio)).size).toBe(12);
  });

  it("ca_08 cada item tem exatamente os campos da prática, na ordem dela, todos com texto", () => {
    for (const item of items()) {
      expect(Object.keys(item)).toEqual(FIELDS);
      for (const field of FIELDS) {
        expect(typeof item[field]).toBe("string");
        expect(String(item[field]).trim()).not.toBe("");
      }
    }
  });

  it("ca_08 a busca da skill lê o patrimônio e o termo de cada um dos 12", () => {
    const equipment = parseEquipment(list);

    expect(equipment).toHaveLength(12);
    expect(equipment[0]).toEqual({ assetTag: "TI-0001", query: "laptop on white desk" });
  });

  it("ca_08 a lista passa no carregamento dos dados iniciais da spec 003, sem manifesto", () => {
    const plan = planEquipmentData(list, null);

    expect(plan.ok).toBe(true);
    expect(plan.ok && plan.items.filter((item) => item.status === "maintenance").map((item) => item.assetTag)).toEqual([
      "TI-0004",
      "TI-0007",
      "TI-0010",
    ]);
  });
});
