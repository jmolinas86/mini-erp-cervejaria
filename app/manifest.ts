import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrewerPro — Mini ERP Cervejeiro",
    short_name: "BrewerPro",
    description: "Estoque, receitas, brassagens e custos da sua cervejaria.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8f7",
    theme_color: "#063d32",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
