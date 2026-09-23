import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { BrewfatherCapture } from "@/components/brewfather-capture";

export const dynamic = "force-dynamic";

export default async function BrewfatherCapturePage() { const supabase = await createClient(); const { data } = await supabase.auth.getClaims(); if (!data?.claims) redirect("/login?next=%2Fintegracoes%2Fbrewfather%2Fcaptura"); const email = typeof data.claims.email === "string" ? data.claims.email : undefined; return <AppShell active="cadastros" userEmail={email}><main className="page-shell"><section className="page-content"><div className="page-header"><div><p className="eyebrow">Integrações · Brewfather</p><h1>Captura assistida do catálogo.</h1><p className="intro">Copie os ingredientes exibidos no Brewfather, cole aqui e revise antes de importar para o HopFlow.</p></div><div className="page-header-actions"><Link className="button secondary" href="/integracoes/brewfather">Voltar para integração</Link></div></div><section className="panel-card"><BrewfatherCapture /></section></section></main></AppShell>; }
