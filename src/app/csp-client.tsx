"use client";

import { setNonce } from "get-nonce";
import { z } from "zod";

// O que o navegador precisa para não esbarrar na CSP sem 'unsafe-inline' nem 'unsafe-eval'
// (ADR-001, 2.10; CA-16). Roda uma vez, quando o módulo carrega no navegador, antes de qualquer
// componente montar.

if (typeof document !== "undefined") {
  // O nonce desta página para o get-nonce (ADR-012, saída B), para os <style> que os primitivos do
  // Radix injetam, como a trava de rolagem do menu, saírem com ele. Ele vem dos scripts que o Next
  // já escreveu na página, e não de uma prop: a CSP do documento fica fixa no carregamento, e um
  // router.refresh() traria o nonce de outro request, que ela barraria.
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (nonce) setNonce(nonce);

  // Sem a compilação de validadores do Zod no navegador: ao montar um z.object, o Zod testa se pode
  // compilar código com new Function, e a CSP reporta esse teste como violação de 'unsafe-eval',
  // mesmo com o erro capturado. Com jitless, ele nem testa (o próprio código do Zod 4 diz isso).
  z.config({ jitless: true });
}

// Só existe para o módulo entrar no bundle do navegador pelo layout raiz.
export function CspClient() {
  return null;
}
