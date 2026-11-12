import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { check } from "./protect-production-paths.mjs";

const HOOK = fileURLToPath(
  new URL("./protect-production-paths.mjs", import.meta.url),
);
const PROTECTED = [
  ".github/workflows/ci.yml",
  ".claude/hooks/x.mjs",
  ".claude/settings.json",
] as const;

// Um repositório git só deste teste, com a origin/main num commit e o HEAD um commit à
// frente. Nada vai à rede: a origin/main é só uma ref local.
function repoWithCommit(file: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "hook-push-"));
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-C", dir, "-c", "user.name=Teste", "-c", "user.email=teste@example.com", ...args],
      { stdio: "ignore" },
    );

  git("init", "-q", "-b", "main");
  writeFileSync(path.join(dir, "README.md"), "base\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  git("update-ref", "refs/remotes/origin/main", "HEAD");

  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), "mudança\n");
  git("add", ".");
  git("commit", "-q", "-m", "mudança");

  return dir;
}

// O hook de verdade, como o Claude Code o chama: JSON na entrada, código 2 para negar.
function runHook(cwd: string, command: string, tool: string) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd, tool_name: tool, tool_input: { command } }),
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

const repos = new Map<string, string>();

beforeAll(() => {
  for (const file of [...PROTECTED, "docs/x.md"]) {
    repos.set(file, repoWithCommit(file));
  }
});

afterAll(() => {
  for (const dir of repos.values()) rmSync(dir, { recursive: true, force: true });
});

const repo = (file: string) => repos.get(file) ?? "";

// O git roda várias vezes por caso, o que passa dos 5 s padrão numa máquina carregada.
describe("hook do push (spec 002, RN-07)", { timeout: 30_000 }, () => {
  describe.each(PROTECTED)("com um commit em %s", (file) => {
    it.each([
      "git push -u origin feat/x",
      "gh pr create --base main --title x",
      'git add . && git commit -m "x" && git push',
    ])("ca_10 nega o comando %s", (command) => {
      const reason = check({ command, cwd: repo(file) });

      expect(reason).toContain(file);
      expect(reason).toContain("peça que ela faça o push");
    });

    it("ca_10 deixa passar o que não publica", () => {
      expect(check({ command: "git status --short", cwd: repo(file) })).toBeNull();
      expect(check({ command: "git commit -m x", cwd: repo(file) })).toBeNull();
    });
  });

  it.each(["Bash", "PowerShell"])(
    "ca_10 pelo %s, o hook sai com 2 e explica o motivo",
    (tool) => {
      const result = runHook(repo(".claude/settings.json"), "git push", tool);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(".claude/settings.json");
      expect(result.stderr).toContain("peça que ela faça o push");
    },
  );

  it("ca_10 confere o repositório do git -C, e não o diretório da sessão", () => {
    const protectedRepo = repo(".claude/settings.json");
    const docsRepo = repo("docs/x.md");

    expect(check({ command: `git -C "${protectedRepo}" push`, cwd: docsRepo })).not.toBeNull();
    expect(check({ command: `git -C "${docsRepo}" push`, cwd: protectedRepo })).toBeNull();
  });

  it("ca_10 deixa passar o push e o PR de commits que só tocam docs/", () => {
    expect(check({ command: "git push -u origin feat/x", cwd: repo("docs/x.md") })).toBeNull();
    expect(check({ command: "gh pr create --base main", cwd: repo("docs/x.md") })).toBeNull();
  });

  it("ca_10 sem origin/main para comparar, nega e pede à pessoa", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "hook-push-"));
    repos.set("sem-origin", dir);
    execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });

    expect(check({ command: "git push", cwd: dir })).toContain("Peça à pessoa");
  });
});
