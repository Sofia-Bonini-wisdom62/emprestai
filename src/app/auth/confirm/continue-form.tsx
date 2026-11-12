"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

type Props = { tokenHash: string; type: string };

// O envio nativo do "Continuar" a /auth/confirm/verify (RN-55), uma vez só: o segundo clique
// gastaria o mesmo link e levaria ao aviso de link vencido (RN-38). Sem JavaScript, o envio nativo
// continua funcionando.
export function ContinueForm({ tokenHash, type }: Props) {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (sent) event.preventDefault();
    else setSent(true);
  }

  return (
    <form
      method="post"
      action="/auth/confirm/verify"
      onSubmit={onSubmit}
      className="flex w-full max-w-[400px] flex-col gap-6"
    >
      <h1 className="text-[28px]/9 font-semibold">Defina sua senha</h1>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <Button type="submit" size="lg" aria-disabled={sent}>
        {sent && (
          <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        )}
        Continuar
      </Button>
    </form>
  );
}
