import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Garante parte de rules/restrictions.md, seção Ferramentas: exceção entra
  // aqui, com a justificativa ao lado, nunca num comentário na linha.
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "Sem atributo style: a CSP não tem unsafe-inline (ADR-001, 2.10; ADR-002).",
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "it", property: "only" },
        { object: "test", property: "only" },
        { object: "describe", property: "only" },
        { object: "it", property: "skip" },
        { object: "test", property: "skip" },
        { object: "describe", property: "skip" },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // A foto do equipamento entra por <img> (spec 004, RN-26; plano da 004, proposta 1, aprovada
  // pela pessoa em 2026-11-12): o next/image escreve style no <img>, que o ADR-002 proíbe, e a CSP
  // sem 'unsafe-inline' bloquearia. A exceção vale só no arquivo que desenha a foto, usado pelo card
  // e pelo detalhe.
  {
    files: ["src/components/equipment/equipment-photo.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  // Skill imagens-equipamentos (spec 002, RN-01 e RN-08; ADR-011): a rede só passa pelo
  // scripts/lib/pexels.ts, que tem a allowlist de host, e a chave só pelo
  // scripts/lib/api-key.ts, a exceção do rules/secrets.md. Nenhum arquivo da skill importa
  // outro cliente de rede nem roda processo.
  {
    files: [".claude/skills/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        ...["http", "https", "net", "tls", "dgram", "child_process"].flatMap(
          (name) =>
            [name, `node:${name}`].map((module) => ({
              name: module,
              message:
                "Rede e processo só pelo scripts/lib/pexels.ts (spec 002, RN-01).",
            })),
        ),
      ],
    },
  },
  {
    files: [".claude/skills/**/*.ts"],
    ignores: [".claude/skills/imagens-equipamentos/scripts/lib/pexels.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Rede só pelo scripts/lib/pexels.ts, com a allowlist de host (spec 002, RN-01).",
        },
      ],
    },
  },
  {
    files: [".claude/skills/**/*.ts"],
    ignores: [".claude/skills/imagens-equipamentos/scripts/lib/api-key.ts"],
    rules: {
      // Repete as entradas do bloco geral, porque esta regra substitui a de lá nestes arquivos.
      "no-restricted-properties": [
        "error",
        { object: "it", property: "only" },
        { object: "test", property: "only" },
        { object: "describe", property: "only" },
        { object: "it", property: "skip" },
        { object: "test", property: "skip" },
        { object: "describe", property: "skip" },
        {
          object: "process",
          property: "env",
          message: "A chave só pelo scripts/lib/api-key.ts (rules/secrets.md; spec 002, RN-08).",
        },
        {
          object: "process",
          property: "loadEnvFile",
          message: "A chave só pelo scripts/lib/api-key.ts (rules/secrets.md; spec 002, RN-08).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client gerado pelo Prisma: abre com eslint-disable e @ts-nocheck, que o
    // noInlineConfig deixa de respeitar. Fica fora do git (plano do andar zero, T3).
    "src/generated/**",
  ]),
]);

export default eslintConfig;
