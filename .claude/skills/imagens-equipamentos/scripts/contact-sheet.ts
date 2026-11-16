// A folha de contato (spec 002, RN-02 e RN-09; CA-14; plano, passo 5): uma página com as fotos da
// rodada, o veredito do agente, o motivo e o crédito, para a pessoa aprovar antes de qualquer
// envio ao bucket. Só sai de um manifesto que passa na conferência do manifesto, comparado ao
// aprovado. O SKILL.md só a gera depois de a conferência de origem sair com 0 (RN-20).
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/contact-sheet.ts \
//     [<manifesto>] [--approved <manifesto aprovado>] [--work <pasta>]
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { compareManifests, type ManifestFile, type MissingFile } from "./check";
import type { Manifest, Photo } from "./lib/manifest";
import { APPROVED_MANIFEST, CONTACT_SHEET_FILE, EQUIPMENT_LIST, MANIFEST_FILE, WORK_DIR } from "./lib/paths";

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Todo texto vem da API do Pixabay ou do agente, e entra escapado.
const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);

const VERDICT = { approved: "Aprovada", rejected: "Reprovada" };

// O crédito de cada foto: o autor, com link para a página dele, e a página da foto no Pixabay,
// que é onde a API pede mostrar de onde vêm as imagens (ADR-011, seção 2).
const credit = (photo: Photo) =>
  `Foto de <a href="${escape(photo.photographerUrl)}">${escape(photo.photographer)}</a>` +
  ` no <a href="${escape(photo.photoUrl)}">Pixabay</a>, ${escape(photo.license.name)}`;

// Uma foto da rodada, pelo arquivo local.
function figure(photo: Photo) {
  const approved = photo.review.verdict === "approved";
  return [
    `<figure class="${approved ? "approved" : "rejected"}">`,
    `<img src="${escape(photo.objectName)}" width="400" height="300" alt="${escape(`${photo.assetTag}, foto ${photo.pixabayId} do Pixabay`)}">`,
    "<figcaption>",
    `<strong>${VERDICT[photo.review.verdict]}</strong>: ${escape(photo.review.reason)}<br>`,
    `${credit(photo)}<br>`,
    `<code>${escape(photo.objectName)}</code>`,
    "</figcaption>",
    "</figure>",
  ].join("");
}

// Uma entrada que vem do manifesto aprovado, só em texto, sem imagem: o veredito de agora e, se
// mudou, o de antes.
function inherited(photo: Photo, before: Photo | undefined) {
  const changed = before && before.review.verdict !== photo.review.verdict;
  const verdict = changed
    ? `${VERDICT[photo.review.verdict]} agora, ${VERDICT[before.review.verdict].toLowerCase()} antes`
    : VERDICT[photo.review.verdict];
  return [
    '<p class="inherited">',
    `<strong>Vinda do manifesto aprovado</strong>, sem imagem: <code>${escape(photo.objectName)}</code>. `,
    `${verdict}: ${escape(photo.review.reason)}. ${credit(photo)}`,
    "</p>",
  ].join("");
}

export type SheetResult = { ok: true; html: string } | { ok: false; missing: string[] };

// As fotos da rodada (RN-09): a entrada cujo nome de objeto não está no manifesto aprovado e a
// foto aprovada da lista de envio. Uma delas sem arquivo local faz a folha falhar.
export function contactSheet({
  next,
  approved,
  toUpload,
  names = new Map(),
  hasFile,
}: {
  next: Manifest;
  approved: Manifest;
  toUpload: string[];
  names?: Map<string, string>;
  hasFile: (objectName: string) => boolean;
}): SheetResult {
  const before = new Map(approved.photos.map((photo) => [photo.objectName, photo]));
  const upload = new Set(toUpload);
  const isRound = (photo: Photo) => !before.has(photo.objectName) || upload.has(photo.objectName);

  const missing = next.photos.filter((photo) => isRound(photo) && !hasFile(photo.objectName)).map((photo) => photo.objectName);
  if (missing.length > 0) return { ok: false, missing: [...new Set(missing)].sort() };

  const assetTags = [...new Set(next.photos.map((photo) => photo.assetTag))].sort();
  const roundPhotos = next.photos.filter(isRound);
  const approvedCount = roundPhotos.filter((photo) => photo.review.verdict === "approved").length;

  const sections = assetTags.map((assetTag) => {
    const photos = next.photos
      .filter((photo) => photo.assetTag === assetTag)
      .sort(
        (a, b) =>
          Number(isRound(b)) - Number(isRound(a)) ||
          Number(b.review.verdict === "approved") - Number(a.review.verdict === "approved") ||
          a.pixabayId - b.pixabayId,
      );
    const name = names.get(assetTag);
    return [
      "<section>",
      `<h2>${escape(assetTag)}${name ? `, ${escape(name)}` : ""}</h2>`,
      ...photos.map((photo) => (isRound(photo) ? figure(photo) : inherited(photo, before.get(photo.objectName)))),
      "</section>",
    ].join("\n");
  });

  const html = [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="utf-8">',
    "<title>Folha de contato das imagens dos equipamentos</title>",
    "<style>body{font-family:sans-serif;margin:24px}figure{display:inline-block;margin:8px;width:400px;vertical-align:top}" +
      "img{display:block;width:400px;height:300px;object-fit:cover}.approved{outline:4px solid #2e7d32}" +
      ".rejected{outline:4px solid #c62828;opacity:.7}figcaption,.inherited{font-size:14px;margin-top:4px}</style>",
    "</head>",
    "<body>",
    "<h1>Folha de contato das imagens dos equipamentos</h1>",
    `<p>${roundPhotos.length} fotos nesta rodada, ${approvedCount} aprovadas pelo agente. Fotos do <a href="https://pixabay.com">Pixabay</a>. Confira cada aprovada: sem pessoa, marca ou logo legível, texto nem tela com conteúdo; na dúvida, reprove (RN-02). Nada vai ao bucket antes da sua aprovação (RN-09).</p>`,
    ...sections,
    "</body>",
    "</html>",
    "",
  ].join("\n");
  return { ok: true, html };
}

// Os nomes dos equipamentos, pelo patrimônio, quando a lista existe; sem ela, a folha sai sem nome.
function readNames(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map();
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return new Map();
  }
  if (!Array.isArray(data)) return new Map();
  return new Map(
    data.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) return [];
      const { patrimonio, nome } = item as { patrimonio?: unknown; nome?: unknown };
      return typeof patrimonio === "string" && typeof nome === "string" ? [[patrimonio, nome] as const] : [];
    }),
  );
}

const USAGE = "Uso: contact-sheet.ts [<manifesto>] [--approved <manifesto aprovado>] [--work <pasta>]";

// A linha de comando: 0 quando a folha foi gravada, 1 quando o manifesto não passa ou falta
// arquivo e 2 quando o argumento ou o arquivo está errado.
export function main(argv: string[], { equipmentList = EQUIPMENT_LIST }: { equipmentList?: string } = {}): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { approved: { type: "string" }, work: { type: "string" } },
      allowPositionals: true,
    });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const [manifestArg, ...rest] = parsed.positionals;
  if (rest.length > 0) {
    console.error(USAGE);
    return 2;
  }
  const workDir = parsed.values.work ?? WORK_DIR;
  const manifestPath = manifestArg ?? join(workDir, MANIFEST_FILE);
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
    console.error(`O manifesto ${manifestPath} não existe ou não é um arquivo.`);
    return 2;
  }
  const approvedPath = parsed.values.approved ?? APPROVED_MANIFEST;
  const firstRound = parsed.values.approved === undefined && !existsSync(approvedPath);
  if (!firstRound && (!existsSync(approvedPath) || !statSync(approvedPath).isFile())) {
    console.error(`O manifesto aprovado ${approvedPath} não existe ou não é um arquivo.`);
    return 2;
  }

  const next: ManifestFile = { path: manifestPath, bytes: readFileSync(manifestPath) };
  const approved: ManifestFile | MissingFile = firstRound
    ? { path: approvedPath, bytes: null }
    : { path: approvedPath, bytes: readFileSync(approvedPath) };
  const comparison = compareManifests(next, approved);
  if (!comparison.ok) {
    for (const line of comparison.lines) console.error(line);
    console.error("A folha de contato não foi gerada.");
    return 1;
  }

  const sheet = contactSheet({
    next: comparison.next,
    approved: comparison.approved,
    toUpload: comparison.toUpload,
    names: readNames(equipmentList),
    hasFile: (name) => existsSync(join(workDir, name)) && statSync(join(workDir, name)).isFile(),
  });
  if (!sheet.ok) {
    console.error(`Faltam em ${workDir} os arquivos destas fotos da rodada, e a folha de contato não foi gerada:`);
    for (const name of sheet.missing) console.error(`  - ${name}`);
    return 1;
  }

  mkdirSync(workDir, { recursive: true });
  const out = join(workDir, CONTACT_SHEET_FILE);
  writeFileSync(out, sheet.html);
  console.log(`Folha de contato em ${out}. Abra no navegador e aprove antes de qualquer envio (RN-09).`);
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
