// PreToolUse do projeto, matcher Edit|MultiEdit|Write, em .claude/settings.json.
// Portão de rules/spec-flow.md: o spec.md só passa a "Status: implementada" se
// a última rodada do verificacao.md da mesma pasta tem "Veredito: PRONTA" e
// nada mudou no código desde o HEAD daquela rodada.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const IMPLEMENTED = /^Status:\s*implementada\s*$/m;

function deny(reason) {
  process.stderr.write(`spec-flow: ${reason}\n`);
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const { tool_name: toolName, tool_input: toolInput = {} } = input;
const file = String(toolInput.file_path ?? "");
const match = file.replaceAll("\\", "/").match(/(?:^|\/)docs\/specs\/([^/]+)\/spec\.md$/);
if (!match) process.exit(0);

const written =
  toolName === "Write"
    ? String(toolInput.content ?? "")
    : [toolInput.new_string, ...(toolInput.edits ?? []).map((edit) => edit.new_string)].join("\n");
if (!IMPLEMENTED.test(written)) process.exit(0);

const spec = match[1];
const specDir = path.dirname(file);
const record = path.join(specDir, "verificacao.md");
const next = `Delegue ao verificador-spec e cole a resposta como nova "## Rodada" em docs/specs/${spec}/verificacao.md.`;

try {
  if (!existsSync(record)) deny(`docs/specs/${spec} não tem verificacao.md. ${next}`);

  const lastRound = readFileSync(record, "utf8").split(/^## Rodada /m).slice(1).at(-1);
  if (!lastRound) deny(`docs/specs/${spec}/verificacao.md não tem rodada. ${next}`);

  const verdict = lastRound.match(/^Veredito:\s*(PRONTA|NÃO PRONTA)/m)?.[1];
  if (verdict !== "PRONTA") deny(`a última rodada de docs/specs/${spec} não é PRONTA (${verdict ?? "sem veredito"}).`);

  const sha = lastRound.match(/HEAD:\s*([0-9a-f]{7,40})\b/)?.[1];
  if (!sha) deny(`a última rodada de docs/specs/${spec} não diz o HEAD verificado. ${next}`);

  const git = (cwd, args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  const root = git(specDir, ["rev-parse", "--show-toplevel"]).trim();
  const outsideSpec = ["--", ".", `:(exclude)docs/specs/${spec}`];
  const changed = [
    git(root, ["diff", "--name-only", sha, ...outsideSpec]),
    git(root, ["ls-files", "--others", "--exclude-standard", ...outsideSpec]),
  ]
    .join("")
    .trim();
  if (changed) deny(`o código mudou desde a rodada sobre ${sha}: ${changed.split("\n").join(", ")}. Verifique de novo.`);
} catch (error) {
  deny(`não deu para conferir a verificação (${error?.message ?? error}); status não alterado.`);
}
