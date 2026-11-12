import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, createNonce } from "@/server/csp";

const directive = (policy: string, name: string) =>
  policy.split("; ").find((entry) => entry.startsWith(`${name} `)) ?? "";

describe("contentSecurityPolicy em produção", () => {
  const policy = contentSecurityPolicy("bm9uY2U=", { development: false, https: true });

  it("ca_16 não tem 'unsafe-inline' nem 'unsafe-eval'", () => {
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("ca_16 libera script e estilo só pelo nonce do request", () => {
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'nonce-bm9uY2U=' 'strict-dynamic'");
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'nonce-bm9uY2U='");
  });

  it("ca_16 não deixa a página dentro de frame nem carregar plugin", () => {
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
  });

  it("ca_16 sobre HTTPS, pede HTTPS para todo recurso; sobre HTTP, não", () => {
    expect(policy).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy("bm9uY2U=", { development: false, https: false })).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});

describe("contentSecurityPolicy no next dev", () => {
  const policy = contentSecurityPolicy("bm9uY2U=", { development: true, https: false });

  it("ca_16 o dev ganha 'unsafe-eval' no script e estilo inline sem nonce", () => {
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });
});

describe("createNonce", () => {
  it("ca_16 gera um nonce novo a cada chamada", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});
