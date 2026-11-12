"use client";

import { setNonce } from "get-nonce";

// Entrega ao get-nonce o nonce da CSP desta página (ADR-012, saída B), para os <style> que os
// primitivos do Radix injetam no navegador, como a trava de rolagem do menu, saírem com ele.
//
// O nonce vem dos scripts que o Next já escreveu nesta página, e não de uma prop: a CSP do documento
// fica fixa no carregamento, e um router.refresh() traria o nonce de outro request, que ela barraria.
// Roda uma vez, quando o módulo carrega no navegador, antes de qualquer componente montar.
if (typeof document !== "undefined") {
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (nonce) setNonce(nonce);
}

// Só existe para o módulo entrar no bundle do navegador pelo layout raiz.
export function CspNonce() {
  return null;
}
