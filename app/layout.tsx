import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini ERP Cervejaria",
  description: "Controle simples de estoque, receitas, brassagens e custo real."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
