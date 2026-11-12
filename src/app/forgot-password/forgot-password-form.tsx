"use client";

import { TRPCClientError } from "@trpc/client";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authMessages } from "@/lib/auth-messages";
import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/client";

// O limite de tentativas tem mensagem própria (RN-43, RN-26). Qualquer outra falha da chamada, como
// a rede ou o servidor fora do ar, mostra a do RN-60, e o formulário continua na tela.
function requestError(error: unknown) {
  const tooMany =
    error instanceof TRPCClientError &&
    (error as TRPCClientError<AppRouter>).data?.code === "TOO_MANY_REQUESTS";

  return tooMany ? authMessages.tooManyAttempts : authMessages.resetFailed;
}

// O formulário da tela 8 (docs/layout.md, seção 6). Depois do envio, a resposta do RN-42 toma o
// lugar do formulário, a mesma exista ou não a conta (CA-28).
export function ForgotPasswordForm() {
  const requestReset = trpc.auth.requestPasswordReset.useMutation();
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      const { message } = await requestReset.mutateAsync({ email });
      setSent(message);
    } catch (error) {
      setFormError(requestError(error));
    }
  });

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <h1 className="text-[28px]/9 font-semibold">Redefinir senha</h1>

      {/* A região de aviso existe desde o começo, vazia: o leitor de tela anuncia o texto quando
          ele entra, o que nem sempre acontece com uma região criada já com o texto. */}
      <p role="status" className={sent ? "text-secondary-text" : "sr-only"}>
        {sent}
      </p>
      {!sent && (
        <form method="post" onSubmit={onSubmit} className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input id="email" type="email" autoComplete="email" required {...register("email")} />
          </Field>

          {formError && <FormAlert>{formError}</FormAlert>}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            )}
            Enviar link
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="inline-flex min-h-10 w-fit items-center text-[15px]/5 text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Voltar ao login
      </Link>
    </div>
  );
}
