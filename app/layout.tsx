import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HopFlow — Mini ERP Cervejeiro",
  description: "HopFlow: estoque, receitas, brassagens e custo real da sua cervejaria.",
  icons: { icon: "/hopflow-logo.png", apple: "/hopflow-logo.png" }
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
