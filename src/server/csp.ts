// A Content-Security-Policy de cada request (ADR-001, 2.10; spec 001, CA-16), no padrão do guia de
// CSP do Next 16: sem 'unsafe-inline', com um nonce novo por request. O Next lê o nonce deste
// cabeçalho no request e o põe nos próprios scripts e estilos.

export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

type PolicyOptions = {
  // O next dev precisa de 'unsafe-eval' (React) e de estilo inline (as folhas que ele injeta); a
  // produção, não. Com nonce, o navegador ignora 'unsafe-inline', então no dev o estilo fica sem nonce.
  development: boolean;
  // Só sobre HTTPS: no E2E e no next start local, o app roda em http://127.0.0.1.
  https: boolean;
};

export function contentSecurityPolicy(nonce: string, options: PolicyOptions) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    options.development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    // A fonte vem do próprio domínio pelo next/font (docs/layout.md, seção 11).
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (options.https) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}
