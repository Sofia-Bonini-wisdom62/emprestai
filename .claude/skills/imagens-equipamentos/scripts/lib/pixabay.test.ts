import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import { ApiKey } from "./api-key";
import { downloadFile, type Fetch, FILE_HOSTS, PixabayError, searchPhotos } from "./pixabay";

// Chave fictícia, com caracteres que a URL codifica: nenhum teste usa a chave da pessoa nem a rede.
const KEY = "chave+ficticia/de=teste-0123456789";
const ENCODED = "chave%2Bficticia%2Fde%3Dteste-0123456789";
const key = new ApiKey(KEY);

// Um marcador no corpo das respostas: nenhuma mensagem traz o corpo, que pode ecoar a chave (RN-18).
const BODY = `corpo-do-pixabay ${KEY}`;
const SEARCH = "https://pixabay.com/api/?";

type Call = { url: URL; init: RequestInit };

// Um fetch de mentira que guarda cada chamada e devolve a resposta dada.
function fakeFetch(respond: () => Response | Promise<Response> = () => Response.json({ hits: [] })) {
  const calls: Call[] = [];
  const fetch: Fetch = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { calls, fetch };
}

const headersOf = (call: Call) => new Headers(call.init.headers);

// Uma resposta cujo corpo cai no meio da leitura, como uma conexão cortada.
const cutBody = (message: string) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new TypeError(message));
      },
    }),
  );

// A mensagem de erro e tudo o que um log mostraria dele.
async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error("a chamada deveria ter falhado");
    },
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(PixabayError);
  const shown = [String(error), (error as Error).stack ?? "", inspect(error), JSON.stringify(error)].join("\n");
  return { message: (error as Error).message, shown };
}

// O que nenhuma mensagem pode trazer: a chave, como está ou codificada, a URL da busca e o corpo.
function expectClean(shown: string) {
  expect(shown).not.toContain(KEY);
  expect(shown).not.toContain(ENCODED);
  expect(shown).not.toContain(SEARCH);
  expect(shown).not.toContain("corpo-do-pixabay");
}

const LARGE = "https://pixabay.com/get/ficticia111_1280.jpg";
const CDN = "https://cdn.pixabay.com/photo/2026/11/13/10/00/ficticia-111_1280.jpg";

const refused = (reason: string) =>
  `download do Pixabay: o pedido não saiu, porque ${reason}. Só vale https://pixabay.com ou https://cdn.pixabay.com, sem porta nem usuário (RN-01 e RN-18).`;

const LIMIT =
  "busca no Pixabay: o limite de pedidos do Pixabay acabou (429). São 100 a cada 60 s, por chave (ADR-011); espere um minuto e tente de novo.";

const EXPIRED =
  " A URL do Pixabay pode ter expirado: escolha outro candidato ou, depois do prazo de 24 h da busca guardada, busque de novo (RN-18).";

const expired = (status: number) => `download do Pixabay: o Pixabay respondeu ${status}.${EXPIRED}`;

describe("searchPhotos e downloadFile, CA-01 (spec 002, RN-01)", () => {
  it("ca_01 a busca vai a https://pixabay.com/api/ com a chave no parâmetro key, sem Authorization", async () => {
    const { calls, fetch } = fakeFetch(() => Response.json({ hits: [{ id: 1 }] }));

    expect(await searchPhotos(key, "laptop on white desk", { page: 2, perPage: 30, fetch })).toEqual({
      hits: [{ id: 1 }],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url.href).toBe(
      `https://pixabay.com/api/?key=${ENCODED}&q=laptop+on+white+desk&image_type=photo&orientation=horizontal&page=2&per_page=30`,
    );
    expect(calls[0].url.searchParams.get("key")).toBe(KEY);
    expect(headersOf(calls[0]).has("Authorization")).toBe(false);
    expect(calls[0].init.redirect).toBe("error");
  });

  it("ca_01 sem página nem tamanho, a busca vai a https://pixabay.com/api/ pedindo a página 1 com 20 fotos", async () => {
    const { calls, fetch } = fakeFetch();

    await searchPhotos(key, "webcam", { fetch });

    expect(calls[0].url.href).toBe(
      `https://pixabay.com/api/?key=${ENCODED}&q=webcam&image_type=photo&orientation=horizontal&page=1&per_page=20`,
    );
  });

  it("ca_01 a lista de hosts do download não pode ser ampliada por outro arquivo", () => {
    expect(Object.isFrozen(FILE_HOSTS)).toBe(true);
    expect(() => (FILE_HOSTS as string[]).push("example.com")).toThrow(TypeError);
    expect(FILE_HOSTS).toEqual(["pixabay.com", "cdn.pixabay.com"]);
  });

  // Uma URL fora dos hosts do download não sai (CA-01); as outras recusas são do RN-18, no CA-13.
  it.each([
    ["outro host", "https://example.com/foto.jpg", "o host é example.com"],
    ["um host que só começa igual", "https://pixabay.com.example.com/foto.jpg", "o host é pixabay.com.example.com"],
    ["um host que só termina igual", "https://notpixabay.com/foto.jpg", "o host é notpixabay.com"],
    ["o CDN seguido de outro domínio", "https://cdn.pixabay.com.example.com/foto.jpg", "o host é cdn.pixabay.com.example.com"],
    ["o host com ponto no fim", "https://pixabay.com./foto.jpg", "o host é pixabay.com."],
    ["um subdomínio fora da lista", "https://www.pixabay.com/foto.jpg", "o host é www.pixabay.com"],
    ["o host antigo do Pexels", "https://images.pexels.com/photos/111/foto.jpeg", "o host é images.pexels.com"],
  ])("ca_01 o download com %s falha antes de sair", async (_, url, reason) => {
    const { calls, fetch } = fakeFetch();

    expect((await errorOf(downloadFile(url, { fetch }))).message).toBe(refused(reason));
    expect(calls).toEqual([]);
  });
});

describe("as mensagens de erro, CA-07 (spec 002, RN-08 e RN-18)", () => {
  it.each([400, 401, 403])("ca_07 o erro %s da busca não traz a chave, a URL da busca nem o corpo", async (status) => {
    const { fetch } = fakeFetch(() => new Response(BODY, { status }));

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(`busca no Pixabay: o Pixabay recusou o pedido (${status}). Confira a PIXABAY_API_KEY no .env.local.`);
    expectClean(shown);
  });

  it("ca_07 o 429 da busca não traz a chave, a URL da busca nem o corpo", async () => {
    const { fetch } = fakeFetch(() => new Response(`API rate limit exceeded ${BODY}`, { status: 429 }));

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(LIMIT);
    expectClean(shown);
  });

  it("ca_07 a falha de rede não traz a chave nem a URL da busca, nem quando o erro original as ecoa", async () => {
    // O erro de mentira repete a URL da busca e a chave, como um proxy que ecoasse o pedido.
    const fetch: Fetch = async (url) => {
      throw new TypeError(`fetch failed: GET ${url.href}`, { cause: new Error(`ECONNREFUSED ${KEY} ${ENCODED}`) });
    };

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe("busca no Pixabay: falha de rede (fetch failed: GET [URL da busca]; ECONNREFUSED [chave] [chave]).");
    expectClean(shown);
  });

  it("ca_07 uma chave com ponto e vírgula e vírgula, ecoada sem codificar na URL, não deixa pedaço para trás", async () => {
    const odd = "chave;ficticia,de-teste-42";
    const fetch: Fetch = async () => {
      throw new TypeError(`fetch failed: GET https://pixabay.com/api/?key=${odd}&q=webcam`);
    };

    const { message, shown } = await errorOf(searchPhotos(new ApiKey(odd), "webcam", { fetch }));

    expect(message).toBe("busca no Pixabay: falha de rede (fetch failed: GET [URL da busca]).");
    expect(shown).not.toContain("ficticia");
  });
});

describe("os detalhes da rede, CA-13 (spec 002, RN-18)", () => {
  it.each([
    ["pixabay.com", LARGE],
    ["cdn.pixabay.com", CDN],
  ])("ca_13 o download vem de %s sem a chave e sem seguir redirecionamento", async (_, url) => {
    const { calls, fetch } = fakeFetch(() => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])));

    expect(await downloadFile(url, { fetch })).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    expect(calls.map((call) => call.url.href)).toEqual([url]);
    expect(headersOf(calls[0]).has("Authorization")).toBe(false);
    expect(calls[0].url.searchParams.has("key")).toBe(false);
    expect(calls[0].init.redirect).toBe("error");
  });

  it("ca_13 a busca também não segue redirecionamento", async () => {
    const { calls, fetch } = fakeFetch();

    await searchPhotos(key, "webcam", { fetch });

    expect(calls[0].init.redirect).toBe("error");
  });

  it.each([
    ["http, e não https", "http://pixabay.com/get/foto.jpg", "a URL não é https"],
    ["uma porta", "https://cdn.pixabay.com:8443/foto.jpg", "a URL tem a porta 8443"],
    ["usuário e senha na URL", "https://usuario:segredo123@pixabay.com/get/foto.jpg", "a URL tem usuário ou senha"],
    ["só o usuário na URL", "https://usuario@cdn.pixabay.com/foto.jpg", "a URL tem usuário ou senha"],
  ])("ca_13 o download com %s falha antes de sair, com o motivo", async (_, url, reason) => {
    const { calls, fetch } = fakeFetch();

    const { message, shown } = await errorOf(downloadFile(url, { fetch }));

    expect(message).toBe(refused(reason));
    expect(shown).not.toContain("segredo123");
    expect(calls).toEqual([]);
  });

  it("ca_13 uma URL de download inválida falha antes de sair", async () => {
    const { calls, fetch } = fakeFetch();

    expect((await errorOf(downloadFile("ficticia111_1280.jpg", { fetch }))).message).toBe(
      "download do Pixabay: a URL não é válida.",
    );
    expect(calls).toEqual([]);
  });

  it.each([
    ["429, com o limite do RN-18", () => new Response(BODY, { status: 429, headers: { "X-RateLimit-Reset": "42" } }), LIMIT],
    ["500", () => new Response(BODY, { status: 500 }), "busca no Pixabay: o Pixabay respondeu 500."],
    ["resposta que não é JSON", () => new Response(`<html>${BODY}`), "busca no Pixabay: a resposta não é um JSON."],
    [
      "corpo cortado no meio",
      () => cutBody(`terminated ${SEARCH}key=${ENCODED} ${KEY}`),
      "busca no Pixabay: falha de rede (terminated [URL da busca] [chave]).",
    ],
  ])("ca_13 o erro %s da busca sai como erro do Pixabay, sem a chave, a URL da busca nem o corpo", async (_, respond, expected) => {
    const { fetch } = fakeFetch(respond);

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(expected);
    expectClean(shown);
  });

  it.each([
    ["a falha de rede", () => Promise.reject(new TypeError("fetch failed")), "download do Pixabay: falha de rede (fetch failed)."],
    [
      "o redirecionamento recusado",
      () => Promise.reject(new TypeError("fetch failed", { cause: new Error("unexpected redirect") })),
      "download do Pixabay: falha de rede (fetch failed; unexpected redirect).",
    ],
    ["o corpo cortado no meio", () => Promise.resolve(cutBody("terminated")), "download do Pixabay: falha de rede (terminated)."],
  ])("ca_13 no download, %s não culpa a chave e diz que a URL pode ter expirado", async (_, respond, expected) => {
    const fetch: Fetch = async () => respond();

    const { message } = await errorOf(downloadFile(LARGE, { fetch }));

    expect(message).toBe(`${expected}${EXPIRED}`);
    expect(message).not.toContain("PIXABAY_API_KEY");
  });

  it.each([401, 403, 404, 410, 429, 500])(
    "ca_13 o %s no download não culpa a chave e diz que a URL pode ter expirado",
    async (status) => {
      const fetch: Fetch = async () => new Response(BODY, { status });

      const { message, shown } = await errorOf(downloadFile(CDN, { fetch }));

      expect(message).toBe(expired(status));
      expect(message).not.toContain("PIXABAY_API_KEY");
      expectClean(shown);
    },
  );
});
