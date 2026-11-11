import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCProvider } from "@/trpc/provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "emprestai",
  description: "Empréstimo de equipamentos internos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      // dark fixa: há um tema só, e os primitivos do shadcn/ui usam a variante dark: (docs/layout.md, seção 11).
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
