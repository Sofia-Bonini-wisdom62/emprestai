import { AuthFrame } from "@/app/login/auth-frame";

import { ForgotPasswordForm } from "./forgot-password-form";

// Tela 8 de docs/layout.md, seção 6, na moldura do login.
export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
