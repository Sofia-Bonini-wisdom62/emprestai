import { generateKeyPairSync, sign } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo, Socket } from "node:net";

// Auth de mentira, para os testes do Vitest sem a pilha do E2E: responde só o
// que o supabase-js pede para renovar e conferir a sessão. Dados fictícios de
// docs/layout.md, seção 10.

export const fakeUser = {
  id: "00000000-0000-4000-8000-0000000000b1",
  email: "beatriz.fontes@example.com",
  aud: "authenticated",
  role: "authenticated",
};

const toBase64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

// ES256 com kid, como o Auth do dev e o da produção assinam (ADR-006): o
// getClaims() confere o token pelo JWKS, sem chamar o GET /user.
const signingKeys = generateKeyPairSync("ec", { namedCurve: "P-256" });
const KID = "chave-de-teste";

export const fakeJwks = {
  keys: [
    {
      ...signingKeys.publicKey.export({ format: "jwk" }),
      kid: KID,
      alg: "ES256",
      use: "sig",
    },
  ],
};

function fakeAccessToken(expiresAt: number) {
  const signed = [
    toBase64url({ alg: "ES256", typ: "JWT", kid: KID }),
    toBase64url({
      sub: fakeUser.id,
      email: fakeUser.email,
      aud: "authenticated",
      role: "authenticated",
      exp: expiresAt,
    }),
  ].join(".");
  const signature = sign("sha256", Buffer.from(signed), {
    key: signingKeys.privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${signed}.${signature.toString("base64url")}`;
}

export function fakeSession(refreshToken: string, expiresInSeconds: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return {
    access_token: fakeAccessToken(expiresAt),
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: Math.max(expiresInSeconds, 0),
    expires_at: expiresAt,
    user: fakeUser,
  };
}

// O cookie que o @supabase/ssr grava: sb-<primeiro rótulo do host>-auth-token,
// com a sessão em JSON e base64url.
export function sessionCookieName(authUrl: string) {
  return `sb-${new URL(authUrl).hostname.split(".")[0]}-auth-token`;
}

export function sessionCookie(authUrl: string, session: object) {
  return `${sessionCookieName(authUrl)}=base64-${toBase64url(session)}`;
}

export function decodeSessionCookie(value: string) {
  return JSON.parse(
    Buffer.from(value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { refresh_token: string };
}

export async function startFakeAuth(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
) {
  const sockets: Socket[] = [];
  const server = createServer(handler);
  server.on("connection", (socket) => sockets.push(socket));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      sockets.forEach((socket) => socket.destroy());
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

export function sendJson(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
