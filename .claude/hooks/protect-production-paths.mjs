// PreToolUse do projeto, matcher Bash|PowerShell, em .claude/settings.json (ADR-011;
// spec 002, RN-07). Nega git push e gh pr create quando os commits que ainda não estão na
// origin/main tocam .github/workflows/, .claude/hooks/ ou .claude/settings.json.
// Um workflow alterado numa branch roda em pull_request com os secrets do repositório, e
// por isso quem publica esses caminhos é a pessoa. O deny de Edit não alcança um script
// em Node nem o git: este hook fecha o passo que dispararia o CI. Um script que faça o
// push sozinho, sem passar pelo Bash nem pelo PowerShell, continua de fora (ADR-011).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROTECTED = [
  /^\.github\/workflows\//,
  /^\.claude\/hooks\//,
  /^\.claude\/settings\.json$/,
];
const PUBLISHES = [/\bgit\b[^\n;&|]*\bpush\b/, /\bgh\s+pr\s+create\b/];

// O motivo da recusa, ou null quando o comando pode seguir.
export function check({ command = "", cwd = process.cwd() }) {
  if (!PUBLISHES.some((pattern) => pattern.test(command))) return null;

  // O repositório é o do -C, o do cd no começo do comando, ou o diretório da sessão.
  const target =
    command.match(/\bgit\s+-C\s+(?:"([^"]+)"|'([^']+)'|(\S+))/) ??
    command.match(/^\s*cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*(?:&&|;)/);
  const repo = target
    ? path.resolve(cwd, target[1] ?? target[2] ?? target[3])
    : cwd;

  let changed;
  try {
    const git = (args) =>
      execFileSync("git", ["-C", repo, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    const base = git(["merge-base", "origin/main", "HEAD"]).trim();
    changed = git(["diff", "--name-only", base, "HEAD"])
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);
  } catch (error) {
    return (
      `não deu para conferir os commits a publicar (${error?.message ?? error}). ` +
      "Peça à pessoa que faça o push e abra o PR."
    );
  }

  const blocked = changed.filter((file) =>
    PROTECTED.some((pattern) => pattern.test(file)),
  );
  if (!blocked.length) return null;

  return (
    `os commits a publicar mexem em ${blocked.join(", ")}. Quem publica esses ` +
    "caminhos é a pessoa (ADR-011): mostre o que mudou e peça que ela faça o " +
    "push e abra o PR."
  );
}

if (import.meta.main) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }

  const reason = check({
    command: String(input.tool_input?.command ?? ""),
    cwd: String(input.cwd || process.cwd()),
  });
  if (reason) {
    process.stderr.write(`protect-production-paths: ${reason}\n`);
    process.exit(2);
  }
}
