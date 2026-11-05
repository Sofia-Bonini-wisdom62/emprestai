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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
