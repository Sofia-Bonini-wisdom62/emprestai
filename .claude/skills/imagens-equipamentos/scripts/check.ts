// A conferência do manifesto (spec 002, CA-03, CA-09 e CA-12). Confere o manifesto novo e o
// aprovado e imprime os objetos que a pessoa envia e apaga no bucket equipment-images, pelo
// painel. A linha de comando está no plan.md, passo 3.
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/check.ts \
//     <manifesto novo> [--approved <manifesto aprovado>]
// Sem --approved, compara com o prisma/data/equipment-images.json da raiz do repositório, de
// onde quer que o script rode; sem esse arquivo, tudo o que o manifesto novo aprova vai para a
// lista de envio.
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  checkManifestBytes,
  type Manifest,
  type ManifestCheck,
  missingAssetTags,
  objectLists,
} from "./lib/manifest";

// Resolvido a partir deste arquivo, e não da pasta atual: rodado de outra pasta, um caminho
// relativo cairia na primeira rodada e pularia o RN-16 sem aviso.
export const APPROVED_MANIFEST = fileURLToPath(new URL("../../../../prisma/data/equipment-images.json", import.meta.url));

export type ManifestFile = { path: string; bytes: Uint8Array };
// O manifesto aprovado que ainda não existe, na primeira rodada: só o caminho procurado.
export type MissingFile = { path: string; bytes: null };

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
  const nextCheck = checkManifestBytes(next.bytes);
  const approvedCheck = approved.bytes === null ? EMPTY : checkManifestBytes(approved.bytes);

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
    approved.bytes === null
      ? `Sem manifesto aprovado em ${approved.path}: tudo o que o manifesto novo aprova vai para a lista de envio.`
      : `Manifesto aprovado ${approved.path}: ${summary(approvedCheck.manifest)}.`,
    ...list("Objetos a enviar", toUpload),
    ...list("Objetos a apagar", toDelete),
  );
  return { ok: true, lines };
}

const USAGE = "Uso: check.ts <manifesto novo> [--approved <manifesto aprovado>]";

// Os bytes, sem decodificar: quem confere o UTF-8 é o checkManifestBytes (RN-17).
const readManifest = (path: string): ManifestFile => ({ path, bytes: readFileSync(path) });

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
  const approved = firstRound ? { path: approvedPath, bytes: null } : readManifest(approvedPath);

  const result = check(readManifest(nextPath), approved);
  for (const line of result.lines) console.log(line);
  return result.ok ? 0 : 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
