import { BrandPanel } from "./brand-panel";
import { LoginForm } from "./login-form";

// Tela 1 de docs/layout.md, seção 6: duas colunas (5/12 e 7/12) a partir de 1024px e uma abaixo
// disso (RN-29).
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-12">
      <BrandPanel className="lg:col-span-5" />
      <section className="flex items-center px-5 py-10 md:px-8 lg:col-span-7 lg:justify-center">
        <LoginForm />
      </section>
    </main>
  );
}
