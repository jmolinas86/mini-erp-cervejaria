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
  return <AppShell active="cadastros" userEmail={email}><main className="page-shell"><section className="page-content"><div className="page-header"><div><p className="eyebrow">Integrações · Brewfather</p><h1>Traga seu inventário para o HopFlow.</h1><p className="intro">Use a API oficial ou a captura assistida para importar os insumos que você já mantém no Brewfather.</p></div><div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/estoque">Estoque</Link></div></div><section className="panel-card"><BrewfatherImport /><div className="brewfather-capture-link"><span>Sem API paga?</span><Link className="card-link" href="/integracoes/brewfather/captura">Abrir captura assistida da tela →</Link></div></section><section className="panel-card brewfather-security"><h2>Como preparar a conexão</h2><p>Quando disponível, a API usa a permissão <strong>inventory.read</strong>. A captura assistida não exige chave: basta copiar o conteúdo visível no Brewfather e colar na tela de captura.</p><p className="section-help">A captura cria uma prévia e só grava os itens depois da sua confirmação.</p></section></section></main></AppShell>;
}
