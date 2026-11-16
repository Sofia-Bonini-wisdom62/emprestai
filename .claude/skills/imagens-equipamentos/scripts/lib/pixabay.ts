// A única porta da skill para a rede (spec 002, RN-01, RN-08 e RN-18; plano, passo 4). O fetch
// e a chave entram como parâmetro, a lista de hosts vive aqui, e nenhuma mensagem traz a chave,
// a URL da busca nem o corpo da resposta.
// A busca vai a https://pixabay.com/api/, com a chave no parâmetro key da URL, o único jeito que
// a API documenta (ADR-011, seção 1.2). O arquivo do largeImageURL vem de pixabay.com ou de
// cdn.pixabay.com, sem a chave.
import type { ApiKey } from "./api-key";

export const API_HOST = "pixabay.com";
// Congelada: nenhum outro arquivo da skill amplia a lista de hosts do download.
export const FILE_HOSTS: readonly string[] = Object.freeze(["pixabay.com", "cdn.pixabay.com"]);
const SEARCH_URL = "https://pixabay.com/api/";

export type Fetch = (input: URL, init: RequestInit) => Promise<Response>;

// O fetch de verdade fica aqui dentro, sem exportar: a rede só se alcança pelas funções abaixo,
// com a lista de hosts. Os testes passam um fetch de mentira no lugar.
const realFetch: Fetch = (input, init) => fetch(input, init);

export class PixabayError extends Error {}

// Como cada pedido se apresenta nas mensagens: o nome, a chave a tirar de um erro ecoado (só na
// busca) e o aviso que segue toda falha (só no download).
type Context = { what: string; key: string | null; hint: string };

// RN-18: um download que falha diz que a URL pode ter expirado, porque a documentação não diz
// quanto tempo o largeImageURL vale. A recusa de antes de sair não leva o aviso: ali a URL é
// inválida, e não expirada.
const EXPIRED =
  " A URL do Pixabay pode ter expirado: escolha outro candidato ou, depois do prazo de 24 h da busca guardada, busque de novo (RN-18).";

// Por que a URL não pode sair, ou null quando pode: só https, um dos hosts, sem porta nem usuário.
function refusal(url: URL, hosts: readonly string[]): string | null {
  if (url.protocol !== "https:") return "a URL não é https";
  if (!hosts.includes(url.hostname)) return `o host é ${url.hostname}`;
  if (url.port !== "") return `a URL tem a porta ${url.port}`;
  if (url.username || url.password) return "a URL tem usuário ou senha";
  return null;
}

// A URL da busca, inteira ou em parte, até o primeiro espaço, parêntese, ponto e vírgula ou
// vírgula, que separam as partes de uma mensagem de erro.
const SEARCH_URL_IN_TEXT = /https?:\/\/pixabay\.com\/api\/?[^\s);,]*/gi;

// O texto de um erro ecoado sem a chave e sem a URL da busca. A chave sai primeiro, crua e
// codificada como o URLSearchParams a põe na URL: assim, uma chave com ";" ou "," não corta a
// URL no meio e deixa um pedaço dela para trás.
function redact(text: string, key: string | null) {
  if (!key) return text;
  const encoded = new URLSearchParams({ key }).toString().slice("key=".length);
  const withoutKey = [encoded, key].reduce((shown, secret) => shown.split(secret).join("[chave]"), text);
  return withoutKey.replace(SEARCH_URL_IN_TEXT, "[URL da busca]");
}

// A falha de rede, sem a chave nem a URL da busca, que um erro poderia ecoar.
function networkError({ what, key, hint }: Context, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? `; ${error.cause.message}` : "";
  return new PixabayError(`${what}: falha de rede (${redact(`${message}${cause}`, key)}).${hint}`);
}

// A conexão pode cair também no meio do corpo, depois que os cabeçalhos chegaram.
async function readBody<T>(read: () => Promise<T>, context: Context): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw networkError(context, error);
  }
}

async function send(fetchFn: Fetch, url: URL, hosts: readonly string[], context: Context) {
  const reason = refusal(url, hosts);
  if (reason) {
    const allowed = hosts.map((host) => `https://${host}`).join(" ou ");
    throw new PixabayError(
      `${context.what}: o pedido não saiu, porque ${reason}. Só vale ${allowed}, sem porta nem usuário (RN-01 e RN-18).`,
    );
  }
  try {
    // Sem seguir redirecionamento: um redirect levaria o pedido para fora da lista de hosts.
    // Sem cabeçalho de autorização: a chave, quando vai, está na URL da busca.
    return await fetchFn(url, { redirect: "error" });
  } catch (error) {
    throw networkError(context, error);
  }
}

export type SearchOptions = { page?: number; perPage?: number; fetch?: Fetch };

// A busca de fotos (CA-01): só fotos, na horizontal (RN-01), com a chave no parâmetro key.
// Devolve o JSON da resposta, que a busca da T-05 interpreta. Nenhuma mensagem traz o corpo,
// que o Pixabay manda em texto puro quando há erro.
export async function searchPhotos(
  key: ApiKey,
  query: string,
  { page = 1, perPage = 20, fetch: fetchFn = realFetch }: SearchOptions = {},
): Promise<unknown> {
  const context: Context = { what: "busca no Pixabay", key: key.reveal(), hint: "" };
  const { what } = context;
  const url = new URL(SEARCH_URL);
  url.searchParams.set("key", key.reveal());
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));

  const response = await send(fetchFn, url, [API_HOST], context);
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new PixabayError(`${what}: o Pixabay recusou o pedido (${response.status}). Confira a PIXABAY_API_KEY no .env.local.`);
  }
  if (response.status === 429) {
    throw new PixabayError(
      `${what}: o limite de pedidos do Pixabay acabou (429). São 100 a cada 60 s, por chave (ADR-011); espere um minuto e tente de novo.`,
    );
  }
  if (!response.ok) throw new PixabayError(`${what}: o Pixabay respondeu ${response.status}.`);

  const text = await readBody(() => response.text(), context);
  try {
    return JSON.parse(text);
  } catch {
    throw new PixabayError(`${what}: a resposta não é um JSON.`);
  }
}

// O download do arquivo de um largeImageURL, sem a chave. Um erro aqui nunca é da chave, e toda
// falha depois de o pedido sair diz que a URL pode ter expirado (RN-18).
export async function downloadFile(url: string, { fetch: fetchFn = realFetch }: { fetch?: Fetch } = {}): Promise<Uint8Array> {
  const context: Context = { what: "download do Pixabay", key: null, hint: EXPIRED };
  if (!URL.canParse(url)) throw new PixabayError(`${context.what}: a URL não é válida.`);
  const response = await send(fetchFn, new URL(url), FILE_HOSTS, context);
  if (!response.ok) throw new PixabayError(`${context.what}: o Pixabay respondeu ${response.status}.${EXPIRED}`);
  return new Uint8Array(await readBody(() => response.arrayBuffer(), context));
}
