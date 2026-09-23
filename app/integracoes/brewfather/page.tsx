import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { BrewfatherImport } from "@/components/brewfather-import";

export const dynamic = "force-dynamic";

export default async function BrewfatherPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fintegracoes%2Fbrewfather");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;
  return <AppShell active="cadastros" userEmail={email}><main className="page-shell"><section className="page-content"><div className="page-header"><div><p className="eyebrow">Integrações · Brewfather</p><h1>Traga seu inventário para o HopFlow.</h1><p className="intro">Use a API oficial para importar os insumos que você já mantém no Brewfather e continuar o controle de estoque por aqui.</p></div><div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/estoque">Estoque</Link></div></div><section className="panel-card"><BrewfatherImport /></section><section className="panel-card brewfather-security"><h2>Como preparar a conexão</h2><p>Crie uma API key no Brewfather com a permissão <strong>inventory.read</strong> e configure as variáveis <code>BREWFATHER_USER_ID</code> e <code>BREWFATHER_API_KEY</code> no ambiente do HopFlow. Nunca envie a chave por mensagem ou coloque o prefixo <code>NEXT_PUBLIC_</code>.</p><p className="section-help">A importação usa os itens pessoais do seu inventário. Ingredientes globais padrão que nunca foram adicionados ao seu inventário não aparecem na API.</p></section></section></main></AppShell>;
}
