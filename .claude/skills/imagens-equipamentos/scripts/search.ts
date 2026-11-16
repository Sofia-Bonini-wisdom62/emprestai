// A busca de fotos (spec 002, RN-01, RN-04 e RN-18; CA-04 e CA-14; plano, passo 5). Para cada
// equipamento que ainda não tem foto aprovada, busca no Pixabay pelo termo da lista da prática e
// guarda os candidatos, sem os ids já usados. A resposta de cada busca fica guardada por 24 h na
// pasta de trabalho, como a API exige, sem a chave nem a URL da busca. A escolha e a revisão de
// cada foto são do agente e da pessoa.
// Uso, da raiz do repositório:
//   node --import ./prisma/resolve-ts.mjs .claude/skills/imagens-equipamentos/scripts/search.ts \
//     [--approved <manifesto aprovado>] [--equipment <lista>] [--work <pasta>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { type ApiKey, readApiKey } from "./lib/api-key";
import { checkManifestBytes, type Manifest } from "./lib/manifest";
import { APPROVED_MANIFEST, CACHE_DIR, CANDIDATES_FILE, EQUIPMENT_LIST, WORK_DIR } from "./lib/paths";
import { type Fetch, SEARCH_FILTERS, searchPhotos } from "./lib/pixabay";
import { sha256 } from "./lib/sha256";

// Os dois campos da lista da prática que a busca usa, com os nomes do código (AGENTS.md, seção 7):
// o patrimonio vira assetTag, e a busca, query. Os outros campos ficam com o seed.
export type Equipment = { assetTag: string; query: string };

// Um resultado da busca, com os campos que o manifesto vai pedir (RN-01 e RN-05). As tags servem
// à escolha e não vão para o manifesto.
export type Candidate = {
  pixabayId: number;
  pageUrl: string;
  user: string;
  userId: number;
  tags: string;
  largeImageUrl: string;
};

export type Search = { assetTag: string; query: string; candidates: Candidate[] };

export class SearchError extends Error {}

// A busca guardada (RN-18): o termo, os parâmetros sem a chave, a data e a resposta.
type Cached = { query: string; params: Record<string, string>; fetchedAt: string; response: unknown };

export const CACHE_HOURS = 24;
const CACHE_MS = CACHE_HOURS * 60 * 60 * 1000;
export const PER_PAGE = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const isHttps = (value: unknown): value is string =>
  isText(value) && URL.canParse(value) && new URL(value).protocol === "https:";

export function parseEquipment(data: unknown): Equipment[] {
  if (!Array.isArray(data)) throw new SearchError("a lista dos equipamentos não é uma lista");
  return data.map((item: unknown, index) => {
    if (!isRecord(item) || !isText(item.patrimonio) || !isText(item.busca)) {
      throw new SearchError(`o item ${index + 1} da lista dos equipamentos não tem patrimonio e busca`);
    }
    return { assetTag: item.patrimonio, query: item.busca };
  });
}

// Os resultados da resposta da busca do Pixabay (hits), cada um com id, página, autor, tags e
// largeImageURL. Um resultado sem esses campos reprova a resposta inteira.
export function parseCandidates(data: unknown): Candidate[] {
  if (!isRecord(data) || !Array.isArray(data.hits)) {
    throw new SearchError("a resposta da busca não tem a lista de resultados (hits)");
  }
  return data.hits.map((hit: unknown, index) => {
    if (
      !isRecord(hit) ||
      !isId(hit.id) ||
      !isHttps(hit.pageURL) ||
      !isText(hit.user) ||
      !isId(hit.user_id) ||
      typeof hit.tags !== "string" ||
      !isHttps(hit.largeImageURL)
    ) {
      throw new SearchError(
        `o resultado ${index + 1} da resposta da busca não tem id, pageURL, user, user_id, tags ou largeImageURL válidos`,
      );
    }
    return {
      pixabayId: hit.id,
      pageUrl: hit.pageURL,
      user: hit.user,
      userId: hit.user_id,
      tags: hit.tags,
      largeImageUrl: hit.largeImageURL,
    };
  });
}

// A página do autor, como a documentação a monta, com o user codificado para URL (RN-05).
export const authorUrl = (user: string, userId: number) =>
  `https://pixabay.com/users/${encodeURIComponent(user)}-${userId}/`;

const approvedPhotos = (manifest: Manifest) => manifest.photos.filter((photo) => photo.review.verdict === "approved");

// CA-04: só os equipamentos sem foto aprovada entram na busca.
export function pendingEquipment(equipment: Equipment[], approved: Manifest): Equipment[] {
  const done = new Set(approvedPhotos(approved).map((photo) => photo.assetTag));
  return equipment.filter((item) => !done.has(item.assetTag));
}

// Os ids já usados são os das fotos aprovadas (RN-04).
export const usedIds = (approved: Manifest) => new Set(approvedPhotos(approved).map((photo) => photo.pixabayId));

// Os parâmetros da busca, sem a chave: é por eles que a busca guardada se reconhece.
const paramsFor = (perPage: number) => ({ ...SEARCH_FILTERS, page: "1", per_page: String(perPage) });

const cachePath = (cacheDir: string, query: string, params: Record<string, string>) =>
  join(cacheDir, `${sha256(new TextEncoder().encode(JSON.stringify({ query, params })))}.json`);

// A busca guardada ainda no prazo, ou null. Um arquivo que não se lê, de outro termo ou de outros
// parâmetros conta como ausente.
function readCached(path: string, query: string, params: Record<string, string>, now: Date): unknown {
  if (!existsSync(path)) return null;
  let cached: unknown;
  try {
    cached = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (!isRecord(cached) || cached.query !== query || JSON.stringify(cached.params) !== JSON.stringify(params)) return null;
  const fetchedAt = typeof cached.fetchedAt === "string" ? Date.parse(cached.fetchedAt) : Number.NaN;
  if (Number.isNaN(fetchedAt)) return null;
  const age = now.getTime() - fetchedAt;
  return age >= 0 && age < CACHE_MS ? cached.response : null;
}

// RN-18: a mesma busca, dentro de 24 h, lê a resposta guardada, sem chamar a API; depois, chama
// de novo e guarda a resposta nova. A chave só é lida quando a API é chamada.
export async function cachedSearch({
  key,
  query,
  cacheDir,
  now,
  fetch,
  perPage = PER_PAGE,
}: {
  key: () => ApiKey;
  query: string;
  cacheDir: string;
  now: Date;
  fetch?: Fetch;
  perPage?: number;
}): Promise<unknown> {
  const params = paramsFor(perPage);
  const path = cachePath(cacheDir, query, params);
  const cached = readCached(path, query, params, now);
  if (cached !== null) return cached;

  const response = await searchPhotos(key(), query, { perPage, fetch });
  const entry: Cached = { query, params, fetchedAt: now.toISOString(), response };
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
  return response;
}

// Uma busca por vez, e só dos equipamentos sem foto aprovada: a API pede pedidos de pessoas, e
// não em massa (ADR-011).
export async function searchCandidates({
  equipment,
  approved,
  key,
  cacheDir,
  now,
  fetch,
  perPage,
}: {
  equipment: Equipment[];
  approved: Manifest;
  key: () => ApiKey;
  cacheDir: string;
  now: Date;
  fetch?: Fetch;
  perPage?: number;
}): Promise<Search[]> {
  const used = usedIds(approved);
  const searches: Search[] = [];
  for (const item of pendingEquipment(equipment, approved)) {
    const response = await cachedSearch({ key, query: item.query, cacheDir, now, fetch, perPage });
    const candidates = parseCandidates(response).filter((candidate) => !used.has(candidate.pixabayId));
    searches.push({ assetTag: item.assetTag, query: item.query, candidates });
  }
  return searches;
}

const USAGE = "Uso: search.ts [--approved <manifesto aprovado>] [--equipment <lista>] [--work <pasta>]";

function readJson(path: string, description: string): unknown {
  if (!existsSync(path)) throw new SearchError(`A ${description} ${path} não existe.`);
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    throw new SearchError(`A ${description} ${path} não é um JSON válido.`);
  }
}

// A linha de comando: 0 quando a busca termina, 1 quando falha e 2 quando o argumento está
// errado. A chave, o fetch e o relógio entram como dependência, para os testes passarem os de
// mentira.
export async function main(
  argv: string[],
  { key = readApiKey, fetch, now = new Date() }: { key?: () => ApiKey; fetch?: Fetch; now?: Date } = {},
): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: { approved: { type: "string" }, equipment: { type: "string" }, work: { type: "string" } },
    });
  } catch {
    console.error(USAGE);
    return 2;
  }

  const approvedPath = parsed.values.approved ?? APPROVED_MANIFEST;
  const workDir = parsed.values.work ?? WORK_DIR;
  try {
    const equipment = parseEquipment(readJson(parsed.values.equipment ?? EQUIPMENT_LIST, "lista dos equipamentos"));

    // Sem o manifesto aprovado padrão, é a primeira rodada; o --approved precisa existir.
    let approved: Manifest = { photos: [] };
    if (parsed.values.approved !== undefined || existsSync(approvedPath)) {
      if (!existsSync(approvedPath)) throw new SearchError(`O manifesto aprovado ${approvedPath} não existe.`);
      const checked = checkManifestBytes(readFileSync(approvedPath));
      if (!checked.ok) throw new SearchError(`O manifesto aprovado ${approvedPath} não passou na conferência.`);
      approved = checked.manifest;
    }

    const searches = await searchCandidates({ equipment, approved, key, cacheDir: join(workDir, CACHE_DIR), now, fetch });
    mkdirSync(workDir, { recursive: true });
    const out = join(workDir, CANDIDATES_FILE);
    writeFileSync(out, `${JSON.stringify(searches, null, 2)}\n`);

    console.log(`Busca de ${searches.length} equipamentos sem foto aprovada:`);
    for (const search of searches) {
      console.log(`  ${search.assetTag} ("${search.query}"): ${search.candidates.length} candidatos`);
    }
    console.log(`Candidatos em ${out}. Fotos do Pixabay (https://pixabay.com).`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
