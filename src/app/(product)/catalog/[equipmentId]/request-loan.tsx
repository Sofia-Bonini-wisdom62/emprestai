"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatFullDate } from "@/lib/dates";
import { trpc } from "@/trpc/client";

// O botão "Solicitar empréstimo" e o diálogo de confirmação (spec 004, RN-15 e RN-17): o resumo do
// que muda mostra a data prevista, o local e a contagem resultante. Confirmar cria o empréstimo e
// leva a Meus empréstimos; a recusa mostra o motivo do servidor (RN-10), nunca um erro genérico.
export function RequestLoan({
  equipmentId,
  dueOn,
  countAfter,
  limit,
}: {
  equipmentId: string;
  dueOn: string;
  countAfter: number;
  limit: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const create = trpc.loan.create.useMutation({
    onSuccess: (loan) => {
      router.push(`/my-loans?confirmado=${loan.dueOn}`);
    },
    onError: (error) => {
      setOpen(false);
      // A recusa traz o texto do RN-10; outra falha, uma mensagem que diz o que fazer.
      setRefusal(
        error.data?.reason
          ? error.message
          : "Não foi possível solicitar agora. Tente de novo em alguns instantes.",
      );
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button size="lg" className="w-full">
            Solicitar empréstimo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar empréstimo</AlertDialogTitle>
          <AlertDialogDescription>
            O empréstimo começa ao confirmar, e o item passa a contar no seu limite.
          </AlertDialogDescription>
          <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-sunken p-4 text-[15px]/6 text-foreground">
            <li>
              Devolver até <span className="font-semibold">{formatFullDate(dueOn)}</span>
            </li>
            <li>Retire no balcão de Operações</li>
            <li>
              Depois deste, você fica com {countAfter} de {limit} itens
            </li>
          </ul>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <Button
              disabled={create.isPending}
              onClick={() => {
                setRefusal(null);
                create.mutate({ equipmentId });
              }}
            >
              {create.isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : null}
              Confirmar empréstimo
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {refusal ? (
        <p role="alert" className="text-sm/5 text-status-overdue">
          {refusal}
        </p>
      ) : null}
    </div>
  );
}
