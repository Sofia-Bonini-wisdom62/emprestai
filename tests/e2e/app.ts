import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const NEXT_CLI = "node_modules/next/dist/bin/next";
const READY_TIMEOUT_MS = 60_000;

export type App = {
  baseURL: string;
  stop: () => Promise<void>;
};

type AppOptions = {
  port: number;
  // Variáveis do app nesta rodada. As demais do .env.example ficam vazias.
  env: Record<string, string>;
};

// Build de produção e next start, o que a pessoa recebe: proxy.ts, cabeçalhos e CSP como em produção.
export async function startApp(options: AppOptions): Promise<App> {
  const baseURL = `http://127.0.0.1:${options.port}`;
  const env = appEnv(options.env);

  execFileSync(process.execPath, [NEXT_CLI, "build"], { env, stdio: "inherit" });

  const child = spawn(
    process.execPath,
    [NEXT_CLI, "start", "--port", String(options.port), "--hostname", "127.0.0.1"],
    { env, stdio: "inherit" },
  );

  const stop = () => stopProcess(child);

  try {
    await waitUntilReady(baseURL, child);
  } catch (error) {
    await stop();
    throw error;
  }

  console.log(`App do E2E em ${baseURL}`);

  return { baseURL, stop };
}

// O Next lê o .env.local sozinho, mas não troca o que já está no ambiente, nem string vazia.
// Toda variável do .env.example começa vazia, então nada do .env.local do dev entra na rodada.
function appEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  const blank = Object.fromEntries(
    Object.keys(parseEnv(readFileSync(".env.example", "utf8"))).map((key) => [key, ""]),
  );

  return {
    ...process.env,
    ...blank,
    // Vazia, a LOG_LEVEL não passa no schema; os outros valores vêm de quem chama.
    LOG_LEVEL: "warn",
    NEXT_TELEMETRY_DISABLED: "1",
    ...overrides,
  };
}

async function waitUntilReady(baseURL: string, child: ChildProcess) {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`O next start saiu com código ${child.exitCode} antes de responder`);
    }

    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        return;
      }
    } catch {
      // Ainda não escuta: tenta de novo.
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  throw new Error(`O app não respondeu em ${baseURL} em ${READY_TIMEOUT_MS / 1000} s`);
}

// O next start serve no próprio processo, sem filhos: basta encerrar esse processo.
async function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));

  if (child.kill("SIGTERM")) {
    await exited;
  }
}
