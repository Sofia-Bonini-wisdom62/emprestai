import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type HookEntry = {
  matcher: string;
  hooks: { type: string; command: string }[];
};
type Settings = {
  permissions?: { deny?: string[] };
  hooks?: { PreToolUse?: HookEntry[] };
};

const settings = JSON.parse(
  readFileSync(fileURLToPath(new URL("./settings.json", import.meta.url)), "utf8"),
) as Settings;

// Os ids são os dos conectores na conta da pessoa, vistos em 2026-11-11 (spec 002, CA-06).
const DENY = [
  ["Supabase", "mcp__3efacae1-0bd5-43e9-b21b-06a0e15499c3__*"],
  ["Vercel", "mcp__cd63b4c8-e88c-449d-8d47-120629820758__*"],
  ["Composio", "mcp__7b70377e-6561-44af-b328-9a1533d0144c__*"],
  ["v0", "mcp__e6d3977c-2db1-4b63-97c4-d36718977027__*"],
  ["workflows", "Edit(/.github/workflows/**)"],
  ["hooks", "Edit(/.claude/hooks/**)"],
  ["settings", "Edit(/.claude/settings.json)"],
];

describe("bloqueio de produção (spec 002, RN-07)", () => {
  it.each(DENY)("ca_06 o permissions.deny nega %s com %s", (_, rule) => {
    expect(settings.permissions?.deny).toContain(rule);
  });

  it.each(["Bash", "PowerShell"])(
    "ca_10 o hook do push está ligado ao %s",
    (tool) => {
      const entry = settings.hooks?.PreToolUse?.find((item) =>
        item.matcher.split("|").includes(tool),
      );

      expect(entry?.hooks).toContainEqual({
        type: "command",
        command: 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-production-paths.mjs"',
      });
    },
  );

  it("adr_011 o portão do status implementada continua ligado às edições", () => {
    const entry = settings.hooks?.PreToolUse?.find(
      (item) => item.matcher === "Edit|MultiEdit|Write",
    );

    expect(entry?.hooks).toContainEqual({
      type: "command",
      command: 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/require-verification.mjs"',
    });
  });
});
