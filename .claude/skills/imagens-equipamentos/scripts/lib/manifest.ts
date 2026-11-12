// O manifesto das fotos dos equipamentos e a conferência dele (spec 002, RN-04 a RN-06).
// Cada foto baixada e revisada fica registrada, aprovada ou reprovada, com o crédito, a origem
// do arquivo e o veredito. O manifesto aprovado vai para prisma/data/equipment-images.json,
// que o seed lê (RN-10).

export const LICENSE = { name: "Pexels License", url: "https://www.pexels.com/license/" };

export type Verdict = "approved" | "rejected";

export type Photo = {
  // O patrimônio do equipamento, como TI-0001.
  assetTag: string;
  pexelsId: number;
  // <patrimônio>-<id do Pexels>.jpg, o nome do objeto no bucket (RN-06).
  objectName: string;
  // O crédito (RN-05): a página da foto no Pexels, o fotógrafo, a página dele e a licença.
  photoUrl: string;
  photographer: string;
  photographerUrl: string;
  license: { name: string; url: string };
  // De onde o arquivo foi baixado, o SHA-256 dele e a data do download.
  sourceUrl: string;
  sha256: string;
  downloadedAt: string;
  // O veredito da revisão visual (RN-02), com o motivo.
  review: { verdict: Verdict; reason: string };
};

export type Manifest = { photos: Photo[] };

export type ManifestCheck =
  | { ok: true; manifest: Manifest }
  | { ok: false; problems: string[] };

export const objectName = (assetTag: string, pexelsId: number) => `${assetTag}-${pexelsId}.jpg`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFilled = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isMissing = (value: unknown) => value === undefined || value === null || value === "";
// Só https: o crédito vira link na tela do catálogo, e um javascript: ali seria uma brecha.
const isUrl = (value: unknown) => isFilled(value) && URL.canParse(value) && new URL(value).protocol === "https:";
const isId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const isSha256 = (value: unknown) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const isDate = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T.+)?$/.test(value) && !Number.isNaN(Date.parse(value));

// Os campos que o RN-05 exige em toda foto, aprovada ou reprovada, e como cada um se valida.
const FIELDS: Array<[key: keyof Photo, description: string, valid: (value: unknown) => boolean]> = [
  ["assetTag", "o patrimônio (assetTag)", isFilled],
  ["pexelsId", "o id do Pexels (pexelsId)", isId],
  ["photoUrl", "a página da foto (photoUrl)", isUrl],
  ["photographer", "o fotógrafo (photographer)", isFilled],
  ["photographerUrl", "a página do fotógrafo (photographerUrl)", isUrl],
  ["sourceUrl", "a URL de origem do arquivo (sourceUrl)", isUrl],
  ["sha256", "o SHA-256 (sha256)", isSha256],
  ["downloadedAt", "a data do download (downloadedAt)", isDate],
];

function checkPhoto(photo: Record<string, unknown>, label: string): string[] {
  const problems: string[] = [];

  for (const [key, description, valid] of FIELDS) {
    const value = photo[key];
    if (isMissing(value)) problems.push(`${label}: falta ${description}`);
    else if (!valid(value)) problems.push(`${label}: ${description} é inválido`);
  }

  const license = photo.license;
  if (isMissing(license)) {
    problems.push(`${label}: falta a licença (license)`);
  } else if (!isRecord(license) || license.name !== LICENSE.name || license.url !== LICENSE.url) {
    problems.push(`${label}: a licença (license) não é a "${LICENSE.name}", com ${LICENSE.url}`);
  }

  if (isMissing(photo.objectName)) {
    problems.push(`${label}: falta o nome do objeto (objectName)`);
  } else if (typeof photo.objectName !== "string") {
    problems.push(`${label}: o nome do objeto (objectName) é inválido`);
  } else if (isFilled(photo.assetTag) && isId(photo.pexelsId)) {
    const expected = objectName(photo.assetTag, photo.pexelsId);
    if (photo.objectName !== expected) {
      problems.push(`${label}: o nome do objeto é "${photo.objectName}", e não "${expected}" (RN-06)`);
    }
  }

  const review = photo.review;
  if (!isRecord(review) || isMissing(review.verdict)) {
    problems.push(`${label}: foto sem veredito (review.verdict)`);
  } else {
    if (review.verdict !== "approved" && review.verdict !== "rejected") {
      problems.push(`${label}: o veredito (review.verdict) é inválido; use approved ou rejected`);
    }
    if (!isFilled(review.reason)) problems.push(`${label}: falta o motivo do veredito (review.reason)`);
  }

  return problems;
}

// RN-04: a mesma foto, pelo id ou pelo SHA-256, não aparece em dois equipamentos. Conta só
// as aprovadas, que são as que chegam ao bucket; uma reprovada não aparece em equipamento.
// A mesma foto aprovada duas vezes no mesmo patrimônio fica para a contagem por patrimônio.
function findRepeated(approved: Photo[], key: "pexelsId" | "sha256", description: string): string[] {
  const byValue = new Map<string, Set<string>>();
  for (const photo of approved) {
    const value = String(photo[key]);
    byValue.set(value, (byValue.get(value) ?? new Set()).add(photo.assetTag));
  }
  return [...byValue]
    .filter(([, assetTags]) => assetTags.size > 1)
    .map(([value, assetTags]) => `${description} ${value} está aprovado em ${[...assetTags].join(" e ")} (RN-04)`);
}

// Confere o manifesto. Os problemas de campo saem todos de uma vez. A repetição do RN-04 e a
// contagem por patrimônio dependem dos campos, e só são conferidas quando eles passam.
export function checkManifest(data: unknown): ManifestCheck {
  if (!isRecord(data) || !Array.isArray(data.photos)) {
    return { ok: false, problems: ["o manifesto não tem a lista de fotos (photos)"] };
  }

  const problems: string[] = [];
  data.photos.forEach((photo: unknown, index) => {
    if (!isRecord(photo)) {
      problems.push(`foto ${index + 1}: não é um objeto`);
      return;
    }
    const tag = isFilled(photo.assetTag) ? photo.assetTag : "sem patrimônio";
    const id = isId(photo.pexelsId) ? photo.pexelsId : "sem id";
    problems.push(...checkPhoto(photo, `foto ${index + 1} (${tag}, ${id})`));
  });
  if (problems.length > 0) return { ok: false, problems };

  const manifest = data as Manifest;
  const approved = manifest.photos.filter((photo) => photo.review.verdict === "approved");
  problems.push(
    ...findRepeated(approved, "pexelsId", "o id do Pexels"),
    ...findRepeated(approved, "sha256", "o SHA-256"),
  );

  // Cada patrimônio do manifesto tem exatamente uma foto aprovada.
  const assetTags = [...new Set(manifest.photos.map((photo) => photo.assetTag))].sort();
  for (const assetTag of assetTags) {
    const count = approved.filter((photo) => photo.assetTag === assetTag).length;
    if (count === 0) problems.push(`o patrimônio ${assetTag} não tem foto aprovada`);
    if (count > 1) problems.push(`o patrimônio ${assetTag} tem ${count} fotos aprovadas`);
  }

  return problems.length > 0 ? { ok: false, problems } : { ok: true, manifest };
}

export function checkManifestText(text: string): ManifestCheck {
  let data: unknown;
  try {
    // O PowerShell 5.1 grava UTF-8 com BOM, e o JSON.parse recusaria um JSON válido por ele.
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return { ok: false, problems: ["o manifesto não é um JSON válido"] };
  }
  return checkManifest(data);
}

const approvedObjects = (manifest: Manifest) =>
  new Set(manifest.photos.filter((photo) => photo.review.verdict === "approved").map((photo) => photo.objectName));

// RN-06: comparado ao manifesto aprovado, o que o manifesto novo põe no bucket e o que tira.
// Repetir o processo com as mesmas fotos deixa as duas listas vazias.
export function objectLists(approved: Manifest, next: Manifest) {
  const before = approvedObjects(approved);
  const after = approvedObjects(next);
  return {
    toUpload: [...after].filter((name) => !before.has(name)).sort(),
    toDelete: [...before].filter((name) => !after.has(name)).sort(),
  };
}
