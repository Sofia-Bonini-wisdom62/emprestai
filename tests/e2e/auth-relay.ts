import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { connect, createServer, type Socket } from "node:net";

import { freePort } from "./stack";

// Repasse TCP entre o app do E2E e o gateway do Auth. O app é buildado com a URL do repasse
// (NEXT_PUBLIC_SUPABASE_URL fica gravada no build), e os casos trocam o modo dele sem novo build:
// - primary: repassa ao gateway da pilha comum;
// - short-token: repassa ao gateway da pilha de token curto (CA-17);
// - refuse: para de escutar, e a conexão é recusada (CA-29);
// - silent: aceita a conexão e não responde (CA-29).
export const RELAY_MODES = ["primary", "short-token", "refuse", "silent"] as const;
export type RelayMode = (typeof RELAY_MODES)[number];
type ForwardMode = Extract<RelayMode, "primary" | "short-token">;

export type AuthRelay = {
  url: string;
  controlUrl: string;
  stop: () => Promise<void>;
};

export async function startAuthRelay(targets: Record<ForwardMode, string>): Promise<AuthRelay> {
  const port = await freePort();
  const sockets = new Set<Socket>();
  let mode: RelayMode = "primary";

  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  };

  const relay = createServer((client) => {
    track(client);
    client.on("error", () => client.destroy());
    if (mode === "silent" || mode === "refuse") {
      return;
    }

    const target = new URL(targets[mode]);
    const upstream = connect(Number(target.port), target.hostname);
    track(upstream);
    upstream.on("error", () => client.destroy());
    client.on("close", () => upstream.destroy());
    client.pipe(upstream).pipe(client);
  });

  const listen = () =>
    new Promise<void>((resolveListen, reject) => {
      relay.once("error", reject);
      relay.listen(port, "127.0.0.1", () => {
        relay.off("error", reject);
        resolveListen();
      });
    });
  const closeRelay = () =>
    new Promise<void>((resolveClose) => (relay.listening ? relay.close(() => resolveClose()) : resolveClose()));
  // O app reusa conexões abertas: sem derrubá-las, o modo novo só valeria para as próximas.
  const dropConnections = () => {
    sockets.forEach((socket) => socket.destroy());
    sockets.clear();
  };

  async function setMode(next: RelayMode) {
    mode = next;
    dropConnections();
    if (next === "refuse") {
      await closeRelay();
    } else if (!relay.listening) {
      await listen();
    }
  }

  await listen();

  const control = createHttpServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    const next = body.trim() as RelayMode;
    if (request.method !== "PUT" || request.url !== "/mode" || !RELAY_MODES.includes(next)) {
      response.writeHead(400).end();
      return;
    }
    await setMode(next);
    response.writeHead(204).end();
  });
  const controlPort = await freePort();
  await new Promise<void>((resolveListen) => control.listen(controlPort, "127.0.0.1", resolveListen));

  return {
    url: `http://127.0.0.1:${port}`,
    controlUrl: `http://127.0.0.1:${controlPort}`,
    stop: async () => {
      dropConnections();
      await Promise.all([closeRelay(), closeHttp(control)]);
    },
  };
}

function closeHttp(server: HttpServer) {
  return new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

// Os casos trocam o modo pelo endereço de controle que o globalSetup grava no ambiente.
export async function setAuthRelayMode(mode: RelayMode) {
  const controlUrl = process.env.E2E_AUTH_RELAY_CONTROL_URL;
  if (!controlUrl) {
    throw new Error("Falta E2E_AUTH_RELAY_CONTROL_URL: o globalSetup do E2E não rodou");
  }

  const response = await fetch(`${controlUrl}/mode`, { method: "PUT", body: mode });
  if (response.status !== 204) {
    throw new Error(`O repasse do Auth recusou o modo ${mode}: ${response.status}`);
  }
}
