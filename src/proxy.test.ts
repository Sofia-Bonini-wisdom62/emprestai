import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

// O proxy renova a sessão em toda rota, menos os estáticos (spec 001, contrato
// do proxy.ts), e por isso também passa pelas rotas do CA-08.
describe("matcher do proxy", () => {
  it.each(["/", "/catalog", "/operations/loans", "/login", "/api/trpc/health.check"])(
    "ca_08 roda em %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    },
  );

  it.each(["/_next/static/chunks/app.js", "/_next/image", "/favicon.ico", "/logo.svg"])(
    "ca_08 não roda no estático %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    },
  );
});
