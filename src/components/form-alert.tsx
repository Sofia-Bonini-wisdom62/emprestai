import { CircleAlert } from "lucide-react";

// A mensagem de erro do formulário inteiro, abaixo dos campos, no padrão de inválido da seção 5 do
// docs/layout.md: #FF9497 com CircleAlert.
export function FormAlert({ children }: { children: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-status-overdue">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
