// O download de uma foto escolhida (spec 002, RN-03 e RN-05; CA-14; plano, passo 5). Baixa o
// largeImageURL, recorta em 800×600 pelo sharp, confere o arquivo pelo leitor de JPEG e registra
// a foto no manifesto da rodada, ainda sem o veredito, que o agente escreve depois de olhar a foto.
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/download.ts \
//     <patrimônio> <id do Pixabay> [--work <pasta>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { crop } from "./lib/crop";
import { checkJpeg } from "./lib/jpeg";
import { LICENSE, objectName, type Photo } from "./lib/manifest";
import { CANDIDATES_FILE, MANIFEST_FILE, WORK_DIR } from "./lib/paths";
import { downloadFile, type Fetch } from "./lib/pixabay";
import { sha256 } from "./lib/sha256";
import { authorUrl, type Candidate, type Search } from "./search";

// A foto baixada, antes da revisão visual (RN-02): todos os campos do RN-05 menos o veredito.
export type DraftPhoto = Omit<Photo, "review">;

export class DownloadError extends Error {}

// Baixa, recorta e confere a foto. A origem recusada não grava arquivo nem entrada (RN-03).
export async function downloadCandidate(
  assetTag: string,
  candidate: Candidate,
  { fetch, now = new Date() }: { fetch?: Fetch; now?: Date } = {},
): Promise<{ photo: DraftPhoto; bytes: Uint8Array }> {
  const source = await downloadFile(candidate.largeImageUrl, { fetch });
  const cropped = await crop(source);
  if (!cropped.ok) throw new DownloadError(`A foto ${candidate.pixabayId} do ${assetTag} foi recusada: ${cropped.reason}.`);
  const jpeg = checkJpeg(cropped.bytes);
  if (!jpeg.ok) throw new DownloadError(`A foto ${candidate.pixabayId} do ${assetTag} foi recusada: ${jpeg.reason} (RN-03).`);

  return {
    photo: {
      assetTag,
      pixabayId: candidate.pixabayId,
      objectName: objectName(assetTag, candidate.pixabayId),
      photoUrl: candidate.pageUrl,
      photographer: candidate.user,
      photographerUrl: authorUrl(candidate.user, candidate.userId),
      license: { ...LICENSE },
      sourceUrl: candidate.largeImageUrl,
      // O SHA-256 do arquivo de 800×600 gravado, e não o da origem (RN-05).
      sha256: sha256(cropped.bytes),
      downloadedAt: now.toISOString(),
    },
    bytes: cropped.bytes,
  };
}

// O manifesto da rodada com a foto nova. Baixar de novo a mesma foto troca a entrada dela, e a
// revisão anterior sai junto, porque o arquivo pode ter mudado.
export function withDraft(manifest: { photos: unknown[] }, photo: DraftPhoto) {
  const others = manifest.photos.filter(
    (entry) => !(typeof entry === "object" && entry !== null && "objectName" in entry && entry.objectName === photo.objectName),
  );
  return { photos: [...others, photo] };
}

const USAGE = "Uso: download.ts <patrimônio> <id do Pixabay> [--work <pasta>]";

function readCandidates(workDir: string): Search[] {
  const path = join(workDir, CANDIDATES_FILE);
  if (!existsSync(path)) throw new DownloadError(`Os candidatos ${path} não existem; rode a busca antes.`);
  try {
    const data: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(data)) throw new Error("não é uma lista");
    return data as Search[];
  } catch {
    throw new DownloadError(`Os candidatos ${path} não são a lista que a busca grava; rode a busca de novo.`);
  }
}

function readDraft(workDir: string): { photos: unknown[] } {
  const path = join(workDir, MANIFEST_FILE);
  if (!existsSync(path)) return { photos: [] };
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    throw new DownloadError(`O manifesto da rodada ${path} não é um JSON válido.`);
  }
  if (typeof data !== "object" || data === null || !Array.isArray((data as { photos?: unknown }).photos)) {
    throw new DownloadError(`O manifesto da rodada ${path} não tem a lista de fotos (photos).`);
  }
  return data as { photos: unknown[] };
}

// A linha de comando: 0 quando a foto foi gravada, 1 quando o download ou o arquivo falha e 2
// quando o argumento está errado. O fetch e o relógio entram como dependência, para os testes.
export async function main(argv: string[], { fetch, now }: { fetch?: Fetch; now?: Date } = {}): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: { work: { type: "string" } }, allowPositionals: true });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const [assetTag, id, ...rest] = parsed.positionals;
  const pixabayId = Number(id);
  if (!assetTag || !/^\d+$/.test(id ?? "") || !Number.isSafeInteger(pixabayId) || pixabayId <= 0 || rest.length > 0) {
    console.error(USAGE);
    return 2;
  }

  const workDir = parsed.values.work ?? WORK_DIR;
  try {
    const search = readCandidates(workDir).find((entry) => entry.assetTag === assetTag);
    const candidate = search?.candidates.find((entry) => entry.pixabayId === pixabayId);
    if (!candidate) throw new DownloadError(`A foto ${pixabayId} não está entre os candidatos do ${assetTag}.`);

    const draft = readDraft(workDir);
    const { photo, bytes } = await downloadCandidate(assetTag, candidate, { fetch, now });
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, photo.objectName), bytes);
    writeFileSync(join(workDir, MANIFEST_FILE), `${JSON.stringify(withDraft(draft, photo), null, 2)}\n`);

    console.log(`${photo.objectName} gravado em ${workDir}, ainda sem veredito.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
