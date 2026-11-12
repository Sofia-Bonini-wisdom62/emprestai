// A conferência do manifesto (spec 002, CA-03, CA-09 e CA-12). Confere o manifesto novo e o
// aprovado e imprime os objetos que a pessoa envia e apaga no bucket equipment-images, pelo
// painel. A linha de comando está no plan.md, passo 3.
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/check.ts \
//     <manifesto novo> [--approved <manifesto aprovado>]
// Sem --approved, compara com prisma/data/equipment-images.json; sem esse arquivo, tudo o que o
// manifesto novo aprova vai para a lista de envio.
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  checkManifestText,
  type Manifest,
  type ManifestCheck,
  missingAssetTags,
  objectLists,
} from "./lib/manifest";

export const APPROVED_MANIFEST = "prisma/data/equipment-images.json";

export type ManifestFile = { path: string; text: string };
// O manifesto aprovado que ainda não existe, na primeira rodada: só o caminho procurado.
export type MissingFile = { path: string; text: null };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const summary = (manifest: Manifest) => {
  const approved = manifest.photos.filter((photo) => photo.review.verdict === "approved").length;
  return `${count(manifest.photos.length, "foto", "fotos")}, ${count(approved, "aprovada", "aprovadas")}`;
};

const list = (title: string, names: string[]) => [
  `${title} (${names.length}):`,
  ...(names.length > 0 ? names.map((name) => `  ${name}`) : ["  nenhum"]),
];

const EMPTY: ManifestCheck = { ok: true, manifest: { photos: [] } };

// Sem o manifesto aprovado, a comparação é com um manifesto vazio.
export function check(next: ManifestFile, approved: ManifestFile | MissingFile): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  const nextCheck = checkManifestText(next.text);
  const approvedCheck = approved.text === null ? EMPTY : checkManifestText(approved.text);

  if (!nextCheck.ok) {
    lines.push(`O manifesto ${next.path} não passou na conferência:`, ...nextCheck.problems.map((p) => `  - ${p}`));
  }
  if (!approvedCheck.ok) {
    lines.push(
      `O manifesto aprovado ${approved.path} não passou na conferência:`,
      ...approvedCheck.problems.map((p) => `  - ${p}`),
    );
  }
  if (!nextCheck.ok || !approvedCheck.ok) return { ok: false, lines };

  const missing = missingAssetTags(approvedCheck.manifest, nextCheck.manifest);
  if (missing.length > 0) {
    lines.push(`O manifesto ${next.path} não passou na conferência:`, ...missing.map((p) => `  - ${p}`));
    return { ok: false, lines };
  }

  const { toUpload, toDelete } = objectLists(approvedCheck.manifest, nextCheck.manifest);
  lines.push(
    `Manifesto ${next.path}: ${summary(nextCheck.manifest)}.`,
    approved.text === null
      ? `Sem manifesto aprovado em ${approved.path}: tudo o que o manifesto novo aprova vai para a lista de envio.`
      : `Manifesto aprovado ${approved.path}: ${summary(approvedCheck.manifest)}.`,
    ...list("Objetos a enviar", toUpload),
    ...list("Objetos a apagar", toDelete),
  );
  return { ok: true, lines };
}

const USAGE = "Uso: check.ts <manifesto novo> [--approved <manifesto aprovado>]";

const readManifest = (path: string): ManifestFile => ({ path, text: readFileSync(path, "utf8") });

// O que está errado com o caminho, ou null quando ele é um arquivo.
function fileProblem(path: string, description: string): string | null {
  if (!existsSync(path)) return `O ${description} ${path} não existe.`;
  if (!statSync(path).isFile()) return `O ${description} ${path} não é um arquivo.`;
  return null;
}

// A linha de comando: 0 quando os manifestos passam, 1 quando não passam e 2 quando os
// argumentos ou os arquivos estão errados.
export function main(argv: string[]): number {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: { approved: { type: "string" } }, allowPositionals: true });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const [nextPath, ...rest] = parsed.positionals;
  if (!nextPath || rest.length > 0) {
    console.error(USAGE);
    return 2;
  }

  // O --approved aponta um arquivo que precisa existir; o padrão pode faltar, na primeira rodada.
  const approvedPath = parsed.values.approved ?? APPROVED_MANIFEST;
  const firstRound = parsed.values.approved === undefined && !existsSync(approvedPath);
  const problem =
    fileProblem(nextPath, "manifesto") ?? (firstRound ? null : fileProblem(approvedPath, "manifesto aprovado"));
  if (problem) {
    console.error(problem);
    return 2;
  }
  const approved = firstRound ? { path: resolve(approvedPath), text: null } : readManifest(approvedPath);

  const result = check(readManifest(nextPath), approved);
  for (const line of result.lines) console.log(line);
  return result.ok ? 0 : 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
