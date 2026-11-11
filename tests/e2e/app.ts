import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const NEXT_CLI = "node_modules/next/dist/bin/next";
const READY_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 10_000;

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
// Toda variável do .env.example, ativa ou comentada, e as VERCEL_* do runtime começam vazias,
// então nada do .env.local nem do .env.production.local do dev entra na rodada.
const RUNTIME_KEYS = ["VERCEL_ENV", "VERCEL_URL"];

function exampleKeys(): string[] {
  const example = readFileSync(".env.example", "utf8");
  const active = Object.keys(parseEnv(example));
  const commented = [...example.matchAll(/^#\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1] ?? "");
  return [...active, ...commented, ...RUNTIME_KEYS].filter(Boolean);
}

function appEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  const blank = Object.fromEntries(exampleKeys().map((key) => [key, ""]));

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

  if (!child.kill("SIGTERM")) {
    return;
  }

  // Se o next start não sair em 10 s, encerra à força, para o teardown não travar.
  const timeout = new Promise<"timeout">((resolveTimeout) =>
    setTimeout(() => resolveTimeout("timeout"), STOP_TIMEOUT_MS).unref(),
  );
  if ((await Promise.race([exited, timeout])) === "timeout") {
    child.kill("SIGKILL");
    await exited;
  }
}
