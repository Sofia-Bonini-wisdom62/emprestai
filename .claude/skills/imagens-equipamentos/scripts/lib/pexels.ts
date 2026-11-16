// A única porta da skill para a rede (spec 002, RN-01, RN-08 e plano, passo 4). O fetch e a
// chave entram como parâmetro, a lista de hosts vive aqui, e nenhuma mensagem traz a chave.
// A busca vai a api.pexels.com, com a chave; o arquivo vem de images.pexels.com, sem ela.
import type { ApiKey } from "./api-key";

export const API_HOST = "api.pexels.com";
export const FILE_HOST = "images.pexels.com";
const SEARCH_URL = "https://api.pexels.com/v1/search";

export type Fetch = (input: URL, init: RequestInit) => Promise<Response>;

// O fetch de verdade fica aqui dentro, sem exportar: a rede só se alcança pelas funções abaixo,
// com a lista de hosts. Os testes passam um fetch de mentira no lugar.
const realFetch: Fetch = (input, init) => fetch(input, init);

export class PexelsError extends Error {}

// Por que a URL não pode sair, ou null quando pode: só https, o host exato, sem porta nem usuário.
function refusal(url: URL, host: string): string | null {
  if (url.protocol !== "https:") return "a URL não é https";
  if (url.hostname !== host) return `o host é ${url.hostname}`;
  if (url.port !== "") return `a URL tem a porta ${url.port}`;
  if (url.username || url.password) return "a URL tem usuário ou senha";
  return null;
}

// A falha de rede, sem a chave, que poderia vir num cabeçalho ou numa URL ecoados.
function networkError(what: string, error: unknown, key: ApiKey | null) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? `; ${error.cause.message}` : "";
  const text = `${message}${cause}`;
  return new PexelsError(`${what}: falha de rede (${key ? text.split(key.reveal()).join("[chave]") : text}).`);
}

// A conexão pode cair também no meio do corpo, depois que os cabeçalhos chegaram.
async function readBody<T>(read: () => Promise<T>, what: string, key: ApiKey | null): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw networkError(what, error, key);
  }
}

async function request(fetchFn: Fetch, url: URL, host: string, key: ApiKey | null, what: string) {
  const reason = refusal(url, host);
  if (reason) {
    throw new PexelsError(`${what}: o pedido não saiu, porque ${reason}. Só vale https://${host}, sem porta nem usuário (RN-01 e RN-18).`);
  }

  let response: Response;
  try {
    // Sem seguir redirecionamento: um redirect levaria o pedido para fora da lista de hosts.
    response = await fetchFn(url, { headers: key ? { Authorization: key.reveal() } : {}, redirect: "error" });
  } catch (error) {
    throw networkError(what, error, key);
  }

  // Só a busca leva a chave; um 401 no download não tem a ver com ela.
  if (response.status === 401 && key) {
    throw new PexelsError(`${what}: o Pexels recusou a chave (401). Confira a PEXELS_API_KEY no .env.local.`);
  }
  if (response.status === 429) {
    throw new PexelsError(
      `${what}: o limite de pedidos do Pexels acabou (429). São 200 por hora e 20.000 por mês (ADR-011); tente de novo mais tarde.`,
    );
  }
  if (!response.ok) throw new PexelsError(`${what}: o Pexels respondeu ${response.status}.`);
  return response;
}

export type SearchOptions = { page?: number; perPage?: number; fetch?: Fetch };

// A busca de fotos (CA-01): a chave vai no cabeçalho Authorization, sem "Bearer". Devolve o
// JSON da resposta, que a busca da T-05 interpreta.
export async function searchPhotos(
  key: ApiKey,
  query: string,
  { page = 1, perPage = 15, fetch: fetchFn = realFetch }: SearchOptions = {},
): Promise<unknown> {
  const what = "busca no Pexels";
  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));

  const response = await request(fetchFn, url, API_HOST, key, what);
  const text = await readBody(() => response.text(), what, key);
  try {
    return JSON.parse(text);
  } catch {
    throw new PexelsError(`${what}: a resposta não é um JSON.`);
  }
}

// O download de um arquivo do CDN, sem a chave.
export async function downloadFile(url: string, { fetch: fetchFn = realFetch }: { fetch?: Fetch } = {}): Promise<Uint8Array> {
  const what = "download do Pexels";
  if (!URL.canParse(url)) throw new PexelsError(`${what}: a URL não é válida.`);
  const response = await request(fetchFn, new URL(url), FILE_HOST, null, what);
  return new Uint8Array(await readBody(() => response.arrayBuffer(), what, null));
}
