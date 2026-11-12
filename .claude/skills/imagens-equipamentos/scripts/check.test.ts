import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { check, main } from "./check";
import type { Manifest } from "./lib/manifest";
import { complete, photo } from "./lib/manifest.fixtures";

const file = (path: string, manifest: Manifest) => ({ path, text: JSON.stringify(manifest) });

const approved: Manifest = { photos: [photo("TI-0001", 111)] };
const swapped: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 222)] };

describe("check, a conferência dos dois manifestos (CA-03 e CA-09)", () => {
  it("ca_09 imprime o objeto antigo entre os a apagar e o novo entre os a enviar", () => {
    expect(check(file("novo.json", swapped), file("aprovado.json", approved))).toEqual({
      ok: true,
      lines: [
        "Manifesto novo.json: 2 fotos, 1 aprovada.",
        "Manifesto aprovado aprovado.json: 1 foto, 1 aprovada.",
        "Objetos a enviar (1):",
        "  TI-0001-222.jpg",
        "Objetos a apagar (1):",
        "  TI-0001-111.jpg",
      ],
    });
  });

  it("ca_09 com os dois manifestos iguais, as duas listas saem vazias", () => {
    expect(check(file("novo.json", approved), file("aprovado.json", approved)).lines.slice(2)).toEqual([
      "Objetos a enviar (0):",
      "  nenhum",
      "Objetos a apagar (0):",
      "  nenhum",
    ]);
  });

  it("rn_06 sem manifesto aprovado, tudo o que o manifesto novo aprova vai para o envio", () => {
    const missing = { path: "/repo/prisma/data/equipment-images.json", text: null };

    expect(check(file("novo.json", complete()), missing).lines).toEqual([
      "Manifesto novo.json: 4 fotos, 3 aprovadas.",
      "Sem manifesto aprovado em /repo/prisma/data/equipment-images.json: tudo o que o manifesto novo aprova vai para a lista de envio.",
      "Objetos a enviar (3):",
      "  TI-0001-111.jpg",
      "  TI-0002-222.jpg",
      "  TI-0003-333.jpg",
      "Objetos a apagar (0):",
      "  nenhum",
    ]);
  });

  it("ca_03 com o manifesto novo reprovado, mostra os problemas e não lista objeto nenhum", () => {
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(check(file("novo.json", unapproved), file("aprovado.json", approved))).toEqual({
      ok: false,
      lines: ["O manifesto novo.json não passou na conferência:", "  - o patrimônio TI-0001 não tem foto aprovada"],
    });
  });

  it("ca_03 com o manifesto aprovado reprovado, também não lista objeto nenhum", () => {
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(check(file("novo.json", approved), file("aprovado.json", unapproved))).toEqual({
      ok: false,
      lines: [
        "O manifesto aprovado aprovado.json não passou na conferência:",
        "  - o patrimônio TI-0001 não tem foto aprovada",
      ],
    });
  });
});

describe("main, a linha de comando da conferência", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-check-"));
  const write = (name: string, manifest: Manifest) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(manifest));
    return path;
  };
  const output = () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.join(" "));
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("ca_09 lê os dois arquivos, imprime as listas e sai com 0", () => {
    const lines = output();

    expect(main([write("novo.json", swapped), "--approved", write("aprovado.json", approved)])).toBe(0);
    expect(lines()).toEqual(expect.arrayContaining(["  TI-0001-222.jpg", "  TI-0001-111.jpg"]));
  });

  it("ca_03 sai com 1 quando o manifesto não passa na conferência", () => {
    const lines = output();
    const unapproved: Manifest = { photos: [photo("TI-0001", 111, "rejected")] };

    expect(main([write("reprovado.json", unapproved), "--approved", write("aprovado.json", approved)])).toBe(1);
    expect(lines()).toContain("  - o patrimônio TI-0001 não tem foto aprovada");
  });

  it("ca_09 com --approved apontando um arquivo que não existe, sai com 2 sem listar nada", () => {
    const lines = output();
    const missing = join(dir, "nao-existe.json");

    expect(main([write("novo.json", swapped), "--approved", missing])).toBe(2);
    expect(lines()).toEqual([`O manifesto aprovado ${missing} não existe.`]);
  });

  it("ca_09 com --approved apontando uma pasta, sai com 2 sem listar nada", () => {
    const lines = output();

    expect(main([write("novo.json", swapped), "--approved", dir])).toBe(2);
    expect(lines()).toEqual([`O manifesto aprovado ${dir} não é um arquivo.`]);
  });
});
