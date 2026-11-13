import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import { ApiKey } from "./api-key";
import { downloadFile, type Fetch, PexelsError, searchPhotos } from "./pexels";

// Chave fictícia: nenhum teste usa a chave da pessoa nem a rede.
const KEY = "chave-ficticia-de-teste-0123456789";
const key = new ApiKey(KEY);

type Call = { url: URL; init: RequestInit };

// Um fetch de mentira que guarda cada chamada e devolve a resposta dada.
function fakeFetch(respond: () => Response | Promise<Response> = () => Response.json({ photos: [] })) {
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
  expect(error).toBeInstanceOf(PexelsError);
  const shown = [String(error), (error as Error).stack ?? "", inspect(error), JSON.stringify(error)].join("\n");
  return { message: (error as Error).message, shown };
}

const FILE = "https://images.pexels.com/photos/111/pexels-photo-111.jpeg?fit=crop&w=800&h=600";

const refused = (reason: string) =>
  `download do Pexels: o pedido não saiu, porque ${reason}. Só vale https://images.pexels.com, sem porta nem usuário (RN-01).`;

const LIMIT =
  "busca no Pexels: o limite de pedidos do Pexels acabou (429). São 200 por hora e 20.000 por mês (ADR-011); tente de novo mais tarde.";

describe("searchPhotos e downloadFile, CA-01 (spec 002, RN-01)", () => {
  it("ca_01 a busca vai a https://api.pexels.com/v1/search com a chave no Authorization, sem Bearer", async () => {
    const { calls, fetch } = fakeFetch(() => Response.json({ photos: [{ id: 1 }] }));

    expect(await searchPhotos(key, "laptop on white desk", { page: 2, perPage: 30, fetch })).toEqual({
      photos: [{ id: 1 }],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url.href).toBe(
      "https://api.pexels.com/v1/search?query=laptop+on+white+desk&page=2&per_page=30",
    );
    expect(headersOf(calls[0]).get("Authorization")).toBe(KEY);
    expect(calls[0].init.redirect).toBe("error");
  });

  // Uma URL fora do host da função não sai (CA-01); as outras recusas são do RN-18, no CA-13.
  it.each([
    ["outro host", "https://example.com/foto.jpg", "o host é example.com"],
    ["um host que só começa igual", "https://images.pexels.com.example.com/foto.jpg", "o host é images.pexels.com.example.com"],
    ["um host que só termina igual", "https://notimages.pexels.com/foto.jpg", "o host é notimages.pexels.com"],
    ["o host com ponto no fim", "https://images.pexels.com./foto.jpg", "o host é images.pexels.com."],
    ["o host da API no lugar do CDN", "https://api.pexels.com/foto.jpg", "o host é api.pexels.com"],
  ])("ca_01 o download com %s falha antes de sair", async (_, url, reason) => {
    const { calls, fetch } = fakeFetch();

    expect((await errorOf(downloadFile(url, { fetch }))).message).toBe(refused(reason));
    expect(calls).toEqual([]);
  });
});

describe("as mensagens de erro, CA-07 (spec 002, RN-08)", () => {
  it.each([
    [
      "401",
      () => new Response("", { status: 401 }),
      "busca no Pexels: o Pexels recusou a chave (401). Confira a PEXELS_API_KEY no .env.local.",
    ],
    ["429", () => new Response("", { status: 429 }), LIMIT],
  ])("ca_07 o erro %s da busca não traz a chave", async (_, respond, expected) => {
    const { fetch } = fakeFetch(respond);

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(expected);
    expect(shown).not.toContain(KEY);
  });

  it("ca_07 a falha de rede não traz a chave, nem quando o erro original a ecoa", async () => {
    // O erro de mentira repete a chave na mensagem e na causa, como um proxy que ecoasse o cabeçalho.
    const fetch: Fetch = async () => {
      throw new TypeError(`fetch failed: Authorization ${KEY}`, { cause: new Error(`ECONNREFUSED ${KEY}`) });
    };

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(
      "busca no Pexels: falha de rede (fetch failed: Authorization [chave]; ECONNREFUSED [chave]).",
    );
    expect(shown).not.toContain(KEY);
  });
});

describe("os detalhes da rede, CA-13 (spec 002, RN-18)", () => {
  it("ca_13 o download vem de https://images.pexels.com sem a chave e sem seguir redirecionamento", async () => {
    const { calls, fetch } = fakeFetch(() => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])));

    expect(await downloadFile(FILE, { fetch })).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    expect(calls.map((call) => call.url.href)).toEqual([FILE]);
    expect(headersOf(calls[0]).has("Authorization")).toBe(false);
    expect(calls[0].init.redirect).toBe("error");
  });

  it("ca_13 a busca também não segue redirecionamento", async () => {
    const { calls, fetch } = fakeFetch();

    await searchPhotos(key, "webcam", { fetch });

    expect(calls[0].init.redirect).toBe("error");
  });

  it.each([
    ["http, e não https", "http://images.pexels.com/foto.jpg", "a URL não é https"],
    ["uma porta", "https://images.pexels.com:8443/foto.jpg", "a URL tem a porta 8443"],
    ["usuário na URL", "https://usuario:segredo123@images.pexels.com/foto.jpg", "a URL tem usuário ou senha"],
  ])("ca_13 o download com %s falha antes de sair, com o motivo", async (_, url, reason) => {
    const { calls, fetch } = fakeFetch();

    const { message, shown } = await errorOf(downloadFile(url, { fetch }));

    expect(message).toBe(refused(reason));
    expect(shown).not.toContain("segredo123");
    expect(calls).toEqual([]);
  });

  it("ca_13 uma URL de download inválida falha antes de sair", async () => {
    const { calls, fetch } = fakeFetch();

    expect((await errorOf(downloadFile("pexels-photo-111.jpeg", { fetch }))).message).toBe(
      "download do Pexels: a URL não é válida.",
    );
    expect(calls).toEqual([]);
  });

  it.each([
    ["429, com os limites do RN-18", () => new Response("", { status: 429, headers: { "X-Ratelimit-Reset": "1800000000" } }), LIMIT],
    ["500", () => new Response("", { status: 500 }), "busca no Pexels: o Pexels respondeu 500."],
    ["resposta que não é JSON", () => new Response("<html>"), "busca no Pexels: a resposta não é um JSON."],
    ["corpo cortado no meio", () => cutBody(`terminated ${KEY}`), "busca no Pexels: falha de rede (terminated [chave])."],
  ])("ca_13 o erro %s da busca sai como erro do Pexels, sem a chave", async (_, respond, expected) => {
    const { fetch } = fakeFetch(respond);

    const { message, shown } = await errorOf(searchPhotos(key, "webcam", { fetch }));

    expect(message).toBe(expected);
    expect(shown).not.toContain(KEY);
  });

  it.each([
    ["a falha de rede", () => Promise.reject(new TypeError("fetch failed")), "download do Pexels: falha de rede (fetch failed)."],
    ["o corpo cortado no meio", () => Promise.resolve(cutBody("terminated")), "download do Pexels: falha de rede (terminated)."],
    ["o 401, que não é da chave", () => Promise.resolve(new Response("", { status: 401 })), "download do Pexels: o Pexels respondeu 401."],
  ])("ca_13 no download, %s sai como erro do Pexels", async (_, respond, expected) => {
    const fetch: Fetch = async () => respond();

    expect((await errorOf(downloadFile(FILE, { fetch }))).message).toBe(expected);
  });
});
