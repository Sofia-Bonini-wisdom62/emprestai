"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormAlert } from "@/components/form-alert";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authMessages } from "@/lib/auth-messages";
import { trpc } from "@/trpc/client";

type SetupValues = { password: string; name: string };
type Props = { askPassword: boolean; askName: boolean };

// O nome, como o account.setup o valida: sem espaços nas pontas e com até 80 caracteres (RN-20,
// RN-27, RN-51). A senha quem confere é o Auth (RN-39, RN-56).
const setupSchema = (askName: boolean) =>
  z.object({
    password: z.string(),
    name: askName
      ? z.string().trim().min(1, authMessages.nameRequired).max(80, authMessages.nameTooLong)
      : z.string(),
  });

const passwordMessages: readonly string[] = [authMessages.weakPassword, authMessages.samePassword];
const nameMessages: readonly string[] = [authMessages.nameRequired, authMessages.nameTooLong];

// Cada mensagem do account.setup vai ao campo dela; o resto mostra a genérica do RN-51.
function setupError(error: unknown) {
  const message = error instanceof TRPCClientError ? error.message : "";
  if (passwordMessages.includes(message)) return { field: "password" as const, message };
  if (nameMessages.includes(message)) return { field: "name" as const, message };
  return { field: null, message: authMessages.setupFailed };
}

// O formulário da tela 7 (docs/layout.md, seção 6), com o link "Sair" e nenhum outro (RN-40).
export function SetupForm({ askPassword, askName }: Props) {
  const router = useRouter();
  const setup = trpc.account.setup.useMutation();
  const signOut = trpc.auth.signOut.useMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema(askName)),
    defaultValues: { password: "", name: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { redirectTo } = await setup.mutateAsync({
        ...(askPassword ? { password: values.password } : {}),
        ...(askName ? { name: values.name } : {}),
      });
      setNavigating(true);
      router.replace(redirectTo);
    } catch (error) {
      const { field, message } = setupError(error);
      if (field) setError(field, { message });
      else setFormError(message);
    }
  });

  // Sai mesmo se a chamada falhar: o servidor apaga o cookie até com o Auth fora do ar (RN-54).
  async function leave() {
    setNavigating(true);
    const result = await signOut.mutateAsync().catch(() => null);
    router.replace(result?.redirectTo ?? "/login");
  }

  const busy = isSubmitting || navigating;

  return (
    // method="post": antes de o JavaScript carregar, o envio nativo não põe a senha na URL.
    <form method="post" onSubmit={onSubmit} className="flex w-full max-w-[400px] flex-col gap-6">
      <h1 className="text-[28px]/9 font-semibold">Defina sua senha</h1>

      {askPassword && (
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error">{errors.password?.message}</FieldError>
        </Field>
      )}

      {askName && (
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Seu nome</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="name-error">{errors.name?.message}</FieldError>
        </Field>
      )}

      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="flex flex-col items-start gap-4">
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          Continuar
        </Button>
        {/* 40px de alvo (seção 4) e sem recuo, alinhado ao título e aos rótulos (princípio 7). */}
        <Button type="button" variant="link" disabled={busy} onClick={leave} className="h-10 px-0">
          Sair
        </Button>
      </div>
    </form>
  );
}
