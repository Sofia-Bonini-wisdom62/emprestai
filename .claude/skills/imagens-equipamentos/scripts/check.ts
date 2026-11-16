// A conferência do manifesto (spec 002, CA-03, CA-05, CA-09 e CA-12; RN-20). Confere o manifesto
// novo e o aprovado e imprime os objetos que a pessoa envia e apaga no bucket equipment-images,
// pelo painel. A linha de comando está no plan.md, passos 3 e 5.
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/check.ts \
//     <manifesto novo> [--approved <manifesto aprovado>] [--files <pasta> [--origin]]
// Sem --approved, compara com o prisma/data/equipment-images.json da raiz do repositório, de
// onde quer que o script rode; sem esse arquivo, tudo o que o manifesto novo aprova vai para a
// lista de envio. Com --files, confere também o arquivo de cada objeto a enviar, nessa pasta, e,
// com --origin, baixa cada um de novo da URL do manifesto e recorta de novo pelo sharp (RN-20).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { crop } from "./lib/crop";
import { checkJpeg } from "./lib/jpeg";
import {
  changedApproved,
  checkManifestBytes,
  type Manifest,
  type ManifestCheck,
  missingAssetTags,
  objectLists,
  type Photo,
} from "./lib/manifest";
import { APPROVED_MANIFEST } from "./lib/paths";
import { downloadFile, type Fetch } from "./lib/pixabay";
import { sha256 } from "./lib/sha256";

// Resolvido a partir do arquivo, e não da pasta atual: rodado de outra pasta, um caminho
// relativo cairia na primeira rodada e pularia o RN-16 sem aviso.
export { APPROVED_MANIFEST };

export type ManifestFile = { path: string; bytes: Uint8Array };
// O manifesto aprovado que ainda não existe, na primeira rodada: só o caminho procurado.
export type MissingFile = { path: string; bytes: null };

// Os arquivos locais, pelo nome do objeto; null quando o arquivo não está lá.
export type ReadFile = (objectName: string) => Uint8Array | null;

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

export type Comparison =
  | { ok: false; lines: string[] }
  | { ok: true; header: string[]; next: Manifest; approved: Manifest; toUpload: string[]; toDelete: string[] };

// A comparação dos dois manifestos, sem olhar os arquivos; sem o aprovado, é com um manifesto
// vazio. A folha de contato usa a mesma comparação.
export function compareManifests(next: ManifestFile, approved: ManifestFile | MissingFile): Comparison {
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

  // RN-16 e RN-20: o manifesto novo não deixa de fora patrimônio aprovado nem muda foto aprovada.
  const problems = [
    ...missingAssetTags(approvedCheck.manifest, nextCheck.manifest),
    ...changedApproved(approvedCheck.manifest, nextCheck.manifest),
  ];
  if (problems.length > 0) {
    lines.push(`O manifesto ${next.path} não passou na conferência:`, ...problems.map((p) => `  - ${p}`));
    return { ok: false, lines };
  }

  const { toUpload, toDelete } = objectLists(approvedCheck.manifest, nextCheck.manifest);
  const header = [
    `Manifesto ${next.path}: ${summary(nextCheck.manifest)}.`,
    approved.bytes === null
      ? `Sem manifesto aprovado em ${approved.path}: tudo o que o manifesto novo aprova vai para a lista de envio.`
      : `Manifesto aprovado ${approved.path}: ${summary(approvedCheck.manifest)}.`,
  ];
  return { ok: true, header, next: nextCheck.manifest, approved: approvedCheck.manifest, toUpload, toDelete };
}

// A conferência dos dois manifestos, sem olhar os arquivos.
export function check(next: ManifestFile, approved: ManifestFile | MissingFile): { ok: boolean; lines: string[] } {
  const comparison = compareManifests(next, approved);
  if (!comparison.ok) return comparison;
  return {
    ok: true,
    lines: [...comparison.header, ...list("Objetos a enviar", comparison.toUpload), ...list("Objetos a apagar", comparison.toDelete)],
  };
}

export type FileOptions = { readFile: ReadFile; origin?: boolean; fetch?: Fetch };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// CA-05 e RN-20: por que o arquivo local de uma foto da lista de envio não pode ir ao bucket, ou
// null quando pode. Com a origem, o recorte refeito do arquivo baixado de novo também tem de dar
// o SHA-256 do manifesto.
export async function fileProblem(photo: Photo, { readFile, origin = false, fetch }: FileOptions): Promise<string | null> {
  const bytes = readFile(photo.objectName);
  if (!bytes) return "o arquivo não está na pasta";
  const jpeg = checkJpeg(bytes);
  if (!jpeg.ok) return `${jpeg.reason} (RN-03)`;
  if (sha256(bytes) !== photo.sha256) return "o SHA-256 do arquivo não é o do manifesto";
  if (!origin) return null;

  let source: Uint8Array;
  try {
    source = await downloadFile(photo.sourceUrl, { fetch });
  } catch (error) {
    return `não deu para baixar de novo a origem: ${message(error)}`;
  }
  const cropped = await crop(source);
  if (!cropped.ok) return `a origem baixada de novo foi recusada: ${cropped.reason}`;
  return sha256(cropped.bytes) === photo.sha256
    ? null
    : `o recorte da origem baixada de novo de ${photo.sourceUrl} difere do arquivo do manifesto (RN-20)`;
}

// A conferência com os arquivos: só as fotos da lista de envio são conferidas, e a recusada sai
// da lista (CA-05). Uma foto que vem igual do manifesto aprovado não é baixada de novo (RN-20).
export async function checkFiles(
  next: ManifestFile,
  approved: ManifestFile | MissingFile,
  options: FileOptions,
): Promise<{ ok: boolean; lines: string[] }> {
  const comparison = compareManifests(next, approved);
  if (!comparison.ok) return comparison;

  const byName = new Map(
    comparison.next.photos.filter((photo) => photo.review.verdict === "approved").map((photo) => [photo.objectName, photo]),
  );
  const refused: string[] = [];
  const toUpload: string[] = [];
  for (const name of comparison.toUpload) {
    const photo = byName.get(name);
    const problem = photo ? await fileProblem(photo, options) : "a foto não está aprovada no manifesto novo";
    if (problem) refused.push(`  - ${name}: ${problem}`);
    else toUpload.push(name);
  }

  const lines = [...comparison.header, ...list("Objetos a enviar", toUpload), ...list("Objetos a apagar", comparison.toDelete)];
  if (refused.length > 0) lines.push(`Arquivos recusados, fora da lista de envio (${refused.length}):`, ...refused);
  return { ok: refused.length === 0, lines };
}

const USAGE = "Uso: check.ts <manifesto novo> [--approved <manifesto aprovado>] [--files <pasta> [--origin]]";

// Os bytes, sem decodificar: quem confere o UTF-8 é o checkManifestBytes (RN-17).
const readManifest = (path: string): ManifestFile => ({ path, bytes: readFileSync(path) });

// O que está errado com o caminho, ou null quando ele é do tipo esperado.
function pathProblem(path: string, description: string, kind: "file" | "dir" = "file"): string | null {
  if (!existsSync(path)) return `O ${description} ${path} não existe.`;
  const stats = statSync(path);
  if (kind === "file" && !stats.isFile()) return `O ${description} ${path} não é um arquivo.`;
  if (kind === "dir" && !stats.isDirectory()) return `O ${description} ${path} não é uma pasta.`;
  return null;
}

// Os arquivos de uma pasta, pelo nome do objeto.
export const folderReader =
  (dir: string): ReadFile =>
  (name) => {
    const path = join(dir, name);
    return existsSync(path) && statSync(path).isFile() ? readFileSync(path) : null;
  };

// A linha de comando: 0 quando os manifestos e os arquivos passam, 1 quando não passam e 2
// quando os argumentos ou os caminhos estão errados. O fetch da origem entra como dependência.
export async function main(argv: string[], { fetch }: { fetch?: Fetch } = {}): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { approved: { type: "string" }, files: { type: "string" }, origin: { type: "boolean" } },
      allowPositionals: true,
    });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const [nextPath, ...rest] = parsed.positionals;
  const filesDir = parsed.values.files;
  if (!nextPath || rest.length > 0 || (parsed.values.origin && filesDir === undefined)) {
    console.error(USAGE);
    return 2;
  }

  // O --approved aponta um arquivo que precisa existir; o padrão pode faltar, na primeira rodada.
  const approvedPath = parsed.values.approved ?? APPROVED_MANIFEST;
  const firstRound = parsed.values.approved === undefined && !existsSync(approvedPath);
  const problem =
    pathProblem(nextPath, "manifesto") ??
    (firstRound ? null : pathProblem(approvedPath, "manifesto aprovado")) ??
    (filesDir === undefined ? null : pathProblem(filesDir, "diretório dos arquivos", "dir"));
  if (problem) {
    console.error(problem);
    return 2;
  }
  const approved = firstRound ? { path: approvedPath, bytes: null } : readManifest(approvedPath);

  const result =
    filesDir === undefined
      ? check(readManifest(nextPath), approved)
      : await checkFiles(readManifest(nextPath), approved, {
          readFile: folderReader(filesDir),
          origin: parsed.values.origin === true,
          fetch,
        });
  for (const line of result.lines) console.log(line);
  return result.ok ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
