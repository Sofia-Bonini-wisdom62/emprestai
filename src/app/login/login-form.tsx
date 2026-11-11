"use client";

import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SignInValues = { email: string; password: string };

// O formulário da tela 1 (docs/layout.md, seção 6; RN-28). Sem link de criar conta: a conta só
// nasce por convite (RN-01).
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInValues>({ defaultValues: { email: "", password: "" } });

  // O envio chama auth.signIn, da T-07 (PR #33), e mostra a mensagem dele (RN-25, RN-26).
  const onSubmit = handleSubmit(async () => {});

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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-controls="password"
            onClick={() => setShowPassword((shown) => !shown)}
            className="absolute inset-y-0 right-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        {/* O Field estica cada filho na largura toda: o link vai à direita dentro deste bloco. */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[15px]/5 text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Esqueci minha senha
          </Link>
        </div>
      </Field>

      {formError && (
        <p role="alert" className="flex items-start gap-2 text-sm text-status-overdue">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          Entrar
        </Button>
        <p className="text-sm/5 text-muted-foreground">Sem acesso? Fale com Operações.</p>
      </div>
    </form>
  );
}
