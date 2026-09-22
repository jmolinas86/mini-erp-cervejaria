import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { criarBrassagem } from "./actions";

export const dynamic = "force-dynamic";

type Receita = { id: string; nome: string; estilo: string | null; volume_previsto_litros: number | string };
type Versao = { id: string; id_receita: string; numero_versao: number; og_previsto: number | string | null; fg_previsto: number | string | null };
type Brassagem = { id: string; numero_brassagem: string; id_versao_receita: string; status: string; etapa_atual: string; volume_previsto_litros: number | string; volume_final_litros: number | string | null; iniciada_em: string | null; estoque_baixado_em: string | null };

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number | string | null | undefined, digits = 1) {
  return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function dataCurta(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "Ainda não iniciada";
}

function rotuloStatus(value: string) {
  const labels: Record<string, string> = { rascunho: "Rascunho", em_andamento: "Em andamento", finalizada: "Finalizada", cancelada: "Cancelada", planejamento: "Planejamento", mostura: "Mostura", fervura: "Fervura", fermentacao: "Fermentação", envase: "Envase", finalizada_etapa: "Finalizada" };
  return labels[value] ?? value.replaceAll("_", " ");
}

export default async function BrassagensPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; receita?: string; versao?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=%2Fbrassagens");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const [{ data: receitas }, { data: versoes }, { data: brassagens, error }] = await Promise.all([
    supabase.from("receitas").select("id,nome,estilo,volume_previsto_litros").eq("ativo", true).order("nome"),
    supabase.from("versoes_receitas").select("id,id_receita,numero_versao,og_previsto,fg_previsto").eq("ativo", true).order("numero_versao", { ascending: false }),
    supabase.from("brassagens").select("id,numero_brassagem,id_versao_receita,status,etapa_atual,volume_previsto_litros,volume_final_litros,iniciada_em,estoque_baixado_em").order("criado_em", { ascending: false })
  ]);

  const listaReceitas = (receitas ?? []) as Receita[];
  const listaVersoes = (versoes ?? []) as Versao[];
  const listaBrassagens = (brassagens ?? []) as Brassagem[];
  const receitaPorId = new Map(listaReceitas.map((receita) => [receita.id, receita]));
  const versaoPorId = new Map(listaVersoes.map((versao) => [versao.id, versao]));
  const receitaPreselecionada = params.receita ? receitaPorId.get(params.receita) : null;
  const versaoPreselecionada = params.versao ? versaoPorId.get(params.versao) : null;
  const volumePreselecionado = versaoPreselecionada && receitaPreselecionada && versaoPreselecionada.id_receita === receitaPreselecionada.id ? numero(receitaPreselecionada.volume_previsto_litros) : "";

  return <AppShell active="producao" userEmail={email} contextLabel="Produção" contextCurrent="Brassagens"><main className="page-shell batch-page"><section className="page-content">
    <div className="page-header"><div><p className="eyebrow">Produção · Fase 8</p><h1>Brassagens</h1><p className="intro">Abra uma produção a partir de uma versão de receita e acompanhe cada etapa.</p></div><div className="page-header-actions"><Link className="button secondary" href="/receitas">Receitas</Link><Link className="button secondary" href="/estoque">Estoque</Link></div></div>
    {params.error ? <p className="form-message error">{params.error}</p> : null}{params.message ? <p className="form-message success">{params.message}</p> : null}{error ? <p className="form-message error">Não foi possível carregar as brassagens.</p> : null}

    <section className="panel-card batch-create-card"><div className="section-header"><div><p className="eyebrow">Nova produção</p><h2>Abrir brassagem</h2><p className="section-help">Os ingredientes previstos serão copiados para a produção. O estoque só será baixado na finalização.</p></div><span className="status-pill configured">Controle por lote</span></div><form className="form-grid" action={criarBrassagem}><label className="form-field form-field-wide"><span>Receita e versão *</span><select name="id_versao_receita" required defaultValue={params.versao ?? ""}><option value="" disabled>Selecione uma receita</option>{listaVersoes.map((versao) => { const receita = receitaPorId.get(versao.id_receita); return receita ? <option value={versao.id} key={versao.id}>{receita.nome} · versão {versao.numero_versao} · {receita.estilo ?? "Sem estilo"}</option> : null; })}</select></label><label className="form-field"><span>Volume previsto (L) *</span><input name="volume_previsto_litros" type="number" min="0.001" step="0.001" required placeholder="20,0" defaultValue={volumePreselecionado} /></label><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Anotações para esta brassagem" /></label><div className="form-actions form-field-wide"><button className="button primary" type="submit">Abrir brassagem</button></div></form></section>

    <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Histórico de produção</p><h2>{listaBrassagens.length} brassagens cadastradas</h2></div><span className="status-pill pending">Estoque baixa ao finalizar</span></div><div className="batch-list batch-list-rich">{listaBrassagens.length ? listaBrassagens.map((brassagem) => { const versao = versaoPorId.get(brassagem.id_versao_receita); const receita = versao ? receitaPorId.get(versao.id_receita) : null; return <Link className="batch-card batch-card-link" href={`/brassagens/${brassagem.id}`} key={brassagem.id}><div><p className="card-label">{dataCurta(brassagem.iniciada_em)}</p><h3>{brassagem.numero_brassagem}</h3><p>{receita?.nome ?? "Receita removida"} · versão {versao?.numero_versao ?? "—"}</p></div><div className="batch-card-meta"><span className={`table-pill ${brassagem.status === "finalizada" ? "ok" : brassagem.status === "cancelada" ? "vazio" : "abaixo_minimo"}`}>{rotuloStatus(brassagem.status)}</span><strong>{decimal(brassagem.volume_final_litros ?? brassagem.volume_previsto_litros)} L</strong><small>{rotuloStatus(brassagem.etapa_atual)}</small></div><span className="batch-card-arrow" aria-hidden="true">›</span></Link>; }) : <div className="empty-state"><strong>Nenhuma brassagem aberta.</strong><span>Escolha uma receita acima para iniciar a primeira produção.</span></div>}</div></section>
  </section></main></AppShell>;
}
