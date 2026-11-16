"use client";

import { cn } from "cn";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";

// O diálogo de confirmação de docs/layout.md, seção 5: backdrop --overlay, caixa de 480px em
// --popover, raio de 14px, padding de 32px; foco inicial em "Cancelar", Esc fecha e o foco volta ao
// botão de origem (o primitivo faz as três coisas). Abrir e fechar como a seção 8. Escrito no
// formato do AlertDialog do shadcn/ui, sem atributo style; o <style> da trava de rolagem do Radix
// sai com o nonce do ADR-012.

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;

export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-closed:animate-out data-closed:fade-out-0 data-closed:duration-120 data-closed:ease-in data-open:animate-in data-open:fade-in-0 data-open:duration-180 data-open:ease-out motion-reduce:animate-none" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-[14px] border border-border bg-popover p-8 shadow-lg data-closed:animate-out data-closed:fade-out-0 data-closed:duration-120 data-closed:ease-in data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-open:duration-180 data-open:ease-out motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-[20px]/7 font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-[15px]/6 text-secondary-text", className)}
      {...props}
    />
  );
}
