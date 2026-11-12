import { redirect } from "next/navigation";

import { AuthFrame } from "@/app/login/auth-frame";
import { LINK_EXPIRED_QUERY } from "@/lib/auth-messages";

import { ContinueForm } from "./continue-form";
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
      <ContinueForm tokenHash={link.data.token_hash} type={link.data.type} />
    </AuthFrame>
  );
}
