import { redirect } from "next/navigation";

import { LINK_EXPIRED_QUERY } from "@/lib/auth-messages";

import { linkSchema } from "./link";

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// O link do e-mail abre esta página, que não chama o Auth: o link só vale no
// clique em "Continuar", pelo POST de /auth/confirm/verify. Assim um leitor de
// e-mail que abra o link sozinho não o gasta (RN-55). A moldura do login chega
// com a T-10.
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const link = linkSchema.safeParse(await searchParams);
  if (!link.success) redirect(`/login?${LINK_EXPIRED_QUERY}`);

  return (
    <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-8 px-5 py-10">
      <h1 className="text-[28px]/9 font-semibold">Defina sua senha</h1>
      <form method="post" action="/auth/confirm/verify">
        <input type="hidden" name="token_hash" value={link.data.token_hash} />
        <input type="hidden" name="type" value={link.data.type} />
        <button
          type="submit"
          className="h-12 w-full rounded-lg bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Continuar
        </button>
      </form>
    </main>
  );
}
