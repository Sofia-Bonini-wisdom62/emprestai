// As imagens do dev (compose.yaml), dos testes e da pilha do E2E: dev, testes e E2E rodam as mesmas
// (ADR-004 e ADR-006). O images.test.ts confere que o compose.yaml usa estas tags.
export const IMAGES = {
  postgres: "supabase/postgres:17.11.0.018",
  auth: "supabase/gotrue:v2.197.0",
  gateway: "envoyproxy/envoy:v1.39.6",
} as const;
