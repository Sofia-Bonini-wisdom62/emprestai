// PreToolUse do subagente verificador-spec, matcher Bash, declarado no
// frontmatter dele. Só passa o que ele precisa para dar evidência: os checks
// de rules/checks.md e a leitura do git. O resto é negado (exit 2), e o
// stderr volta para o agente como motivo.
import { readFileSync } from "node:fs";

const ALLOWED = [
  /^pnpm (lint|typecheck|test|test:e2e)$/,
  /^DATABASE_URL=postgresql:\/\/127\.0\.0\.1:1\/x pnpm build$/,
  /^git (status|diff|log|show|rev-parse|ls-files)( .*)?$/,
];

// Encadear, redirecionar ou substituir comando abriria qualquer coisa depois
// de um prefixo permitido; as opções do git listadas escrevem arquivo ou rodam
// programa externo.
const FORBIDDEN = [/[;&|<>`\n]/, /\$\(/, /--output\b/, /--ext-diff\b/, /--textconv\b/];

function deny(reason) {
  process.stderr.write(`verificador-spec: ${reason}\n`);
  process.exit(2);
}

let command;
try {
  command = String(JSON.parse(readFileSync(0, "utf8")).tool_input?.command ?? "").trim();
} catch {
  deny("entrada do hook ilegível; comando negado.");
}

if (FORBIDDEN.some((pattern) => pattern.test(command)) || !ALLOWED.some((pattern) => pattern.test(command))) {
  deny(`comando fora da lista deste agente: ${command}. Não contorne: marque o passo como bloqueado, com este motivo.`);
}
