"use client";

import { TRPCClientError } from "@trpc/client";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/form-alert";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authMessages } from "@/lib/auth-messages";
import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/client";

type SignInValues = { email: string; password: string };

// Só o limite de tentativas tem mensagem própria (RN-26). Senha errada, conta que não existe,
// conta bloqueada e qualquer falha do servidor ou da rede mostram a do RN-25.
function signInError(error: unknown) {
  const tooMany =
    error instanceof TRPCClientError &&
    (error as TRPCClientError<AppRouter>).data?.code === "TOO_MANY_REQUESTS";

  return tooMany ? authMessages.tooManyAttempts : authMessages.invalidCredentials;
}

// O formulário da tela 1 (docs/layout.md, seção 6; RN-28). Sem link de criar conta: a conta só
// nasce por convite (RN-01).
export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const signIn = trpc.auth.signIn.useMutation();
  const [formError, setFormError] = useState(initialError);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInValues>({ defaultValues: { email: "", password: "" } });

  // Entra pelo servidor (RN-07), que grava o cookie e devolve o destino do papel (RN-22).
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { redirectTo } = await signIn.mutateAsync(values);
      setNavigating(true);
      router.replace(redirectTo);
    } catch (error) {
      setFormError(signInError(error));
    }
  });
  const busy = isSubmitting || navigating;

  return (
    // method="post": antes de o JavaScript carregar, o envio nativo não põe a senha na URL.
    <form method="post" onSubmit={onSubmit} className="flex w-full max-w-[400px] flex-col gap-6">
      <h1 className="text-[28px]/9 font-semibold">Entrar</h1>

      <Field>
        <FieldLabel htmlFor="email">E-mail</FieldLabel>
        <Input id="email" type="email" autoComplete="email" required {...register("email")} />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Senha</FieldLabel>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          {...register("password")}
        />
        {/* O Field estica cada filho na largura toda: o link vai à direita dentro deste bloco. */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-10 items-center text-[15px]/5 text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Esqueci minha senha
          </Link>
        </div>
      </Field>

      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="flex flex-col gap-4">
        <Button type="submit" size="lg" disabled={busy}>
          {busy && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          Entrar
        </Button>
        <p className="text-sm/5 text-muted-foreground">Sem acesso? Fale com Operações.</p>
      </div>
    </form>
  );
}
