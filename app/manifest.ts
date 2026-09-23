import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HopFlow — Mini ERP Cervejeiro",
    short_name: "HopFlow",
    description: "Estoque, receitas, brassagens e custos da sua cervejaria.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8f7",
    theme_color: "#063d32",
    lang: "pt-BR",
    icons: [
      { src: "/hopflow-logo.png", sizes: "609x542", type: "image/png", purpose: "any" }
    ]
  };
}
