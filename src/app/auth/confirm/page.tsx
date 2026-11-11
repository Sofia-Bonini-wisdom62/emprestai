import { redirect } from "next/navigation";

import { AuthFrame } from "@/app/login/auth-frame";
import { Button } from "@/components/ui/button";
import { LINK_EXPIRED_QUERY } from "@/lib/auth-messages";

import { linkSchema } from "./link";

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// O link do e-mail abre esta página, que não chama o Auth: o link só vale no
// clique em "Continuar", pelo POST de /auth/confirm/verify. Assim um leitor de
// e-mail que abra o link sozinho não o gasta (RN-55). Fica na moldura do login,
// como Definir senha (docs/layout.md, seção 6, tela 7).
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const link = linkSchema.safeParse(await searchParams);
  if (!link.success) redirect(`/login?${LINK_EXPIRED_QUERY}`);

  return (
    <AuthFrame>
      <form
        method="post"
        action="/auth/confirm/verify"
        className="flex w-full max-w-[400px] flex-col gap-6"
      >
        <h1 className="text-[28px]/9 font-semibold">Defina sua senha</h1>
        <input type="hidden" name="token_hash" value={link.data.token_hash} />
        <input type="hidden" name="type" value={link.data.type} />
        <Button type="submit" size="lg">
          Continuar
        </Button>
      </form>
    </AuthFrame>
  );
}
