import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ImprimirRelatorio } from "./imprimir";

export const dynamic = "force-dynamic";
type Custo = { id_brassagem: string; numero_brassagem: string; status: string; volume_previsto_litros: number | string; volume_final_litros: number | string | null; perda_litros: number | string | null; percentual_perda: number | string | null; custo_total: number | string | null; custo_por_litro: number | string | null };
type Saldo = { id_item: string; nome_item: string; categoria: string | null; codigo_unidade: string; quantidade_saldo: number | string | null; estoque_minimo: number | string | null; status_estoque: string };
type Brassagem = { id: string; numero_brassagem: string; status: string; etapa_atual: string; volume_final_litros: number | string | null; finalizada_em: string | null };
function numero(value: number | string | null | undefined) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function decimal(value: number | string | null | undefined, digits = 1) { return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function moeda(value: number | string | null | undefined) { return numero(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function data(value: string | null) { return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "—"; }
function rotulo(value: string) { return ({ finalizada: "Finalizada", em_andamento: "Em andamento", rascunho: "Rascunho", vazio: "Crítico", abaixo_minimo: "Abaixo do mínimo", ok: "OK" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const params = await searchParams;
  const aba = params.aba === "estoque" ? "estoque" : params.aba === "producao" ? "producao" : "custos";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/login?next=${encodeURIComponent("/relatorios")}`);
  const email = typeof claims.claims.email === "string" ? claims.claims.email : "";
  const [{ data: custos }, { data: saldos }, { data: brassagens }] = await Promise.all([
    supabase.from("vw_custos_brassagem").select("id_brassagem,numero_brassagem,status,volume_previsto_litros,volume_final_litros,perda_litros,percentual_perda,custo_total,custo_por_litro").order("numero_brassagem", { ascending: false }),
    supabase.from("vw_saldos_estoque").select("id_item,nome_item,categoria,codigo_unidade,quantidade_saldo,estoque_minimo,status_estoque").order("status_estoque").order("nome_item"),
    supabase.from("brassagens").select("id,numero_brassagem,status,etapa_atual,volume_final_litros,finalizada_em").order("finalizada_em", { ascending: false })
  ]);
  const listaCustos = (custos ?? []) as Custo[];
  const listaSaldos = (saldos ?? []) as Saldo[];
  const listaBrassagens = (brassagens ?? []) as Brassagem[];
  const finalizadas = listaCustos.filter((item) => item.status === "finalizada");
  const totalLitros = finalizadas.reduce((total, item) => total + numero(item.volume_final_litros), 0);
  const custoTotal = finalizadas.reduce((total, item) => total + numero(item.custo_total), 0);
  const criticos = listaSaldos.filter((item) => item.status_estoque !== "ok");
  return <AppShell active="relatorios" userEmail={email} contextLabel="Relatórios" contextCurrent="Custos e operação"><main className="page-shell reports-page"><section className="page-content">
    <div className="page-header"><div><p className="eyebrow">Fase 9 · Gestão</p><h1>Relatórios</h1><p className="intro">Acompanhe custos reais, produção e situação do estoque.</p></div><div className="page-header-actions"><ImprimirRelatorio /></div></div>
    <nav className="report-tabs" aria-label="Tipo de relatório"><Link className={aba === "custos" ? "active" : ""} href="/relatorios?aba=custos">Custos</Link><Link className={aba === "producao" ? "active" : ""} href="/relatorios?aba=producao">Produção</Link><Link className={aba === "estoque" ? "active" : ""} href="/relatorios?aba=estoque">Estoque</Link></nav>
    {aba === "custos" ? <><section className="report-summary-grid"><div className="report-summary"><small>Brassagens finalizadas</small><strong>{finalizadas.length}</strong></div><div className="report-summary"><small>Volume produzido</small><strong>{decimal(totalLitros, 1)} L</strong></div><div className="report-summary"><small>Custo total</small><strong>{moeda(custoTotal)}</strong></div></section><section className="panel-card report-table-card"><div className="section-header"><div><h2>Custos por brassagem</h2><p>Valores calculados a partir dos consumos reais e custos extras.</p></div></div><div className="table-wrap"><table><thead><tr><th>Brassagem</th><th>Status</th><th>Volume final</th><th>Perda</th><th>Custo total</th><th>Custo/L</th></tr></thead><tbody>{listaCustos.map((item) => <tr key={item.id_brassagem}><td><strong>{item.numero_brassagem}</strong></td><td><span className="table-pill">{rotulo(item.status)}</span></td><td>{item.volume_final_litros === null ? "—" : `${decimal(item.volume_final_litros)} L`}</td><td>{item.percentual_perda === null ? "—" : `${decimal(numero(item.percentual_perda) * 100)}%`}</td><td>{item.custo_total === null ? "—" : moeda(item.custo_total)}</td><td>{item.custo_por_litro === null ? "—" : `${moeda(item.custo_por_litro)} / L`}</td></tr>)}{!listaCustos.length ? <tr><td colSpan={6}>Nenhuma brassagem registrada.</td></tr> : null}</tbody></table></div></section></> : null}
    {aba === "producao" ? <section className="panel-card report-table-card"><div className="section-header"><div><h2>Histórico de produção</h2><p>Brassagens abertas e finalizadas no sistema.</p></div></div><div className="table-wrap"><table><thead><tr><th>Brassagem</th><th>Status</th><th>Etapa</th><th>Volume final</th><th>Finalizada em</th></tr></thead><tbody>{listaBrassagens.map((item) => <tr key={item.id}><td><Link href={`/brassagens/${item.id}`}><strong>{item.numero_brassagem}</strong></Link></td><td><span className="table-pill">{rotulo(item.status)}</span></td><td>{rotulo(item.etapa_atual)}</td><td>{item.volume_final_litros === null ? "—" : `${decimal(item.volume_final_litros)} L`}</td><td>{data(item.finalizada_em)}</td></tr>)}</tbody></table></div></section> : null}
    {aba === "estoque" ? <><section className="report-summary-grid"><div className="report-summary danger"><small>Itens críticos</small><strong>{criticos.length}</strong></div><div className="report-summary"><small>Itens monitorados</small><strong>{new Set(listaSaldos.map((item) => item.id_item)).size}</strong></div></section><section className="panel-card report-table-card"><div className="section-header"><div><h2>Posição do estoque</h2><p>Saldo atual, mínimo configurado e situação por lote.</p></div><Link href="/estoque">Abrir estoque →</Link></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Categoria</th><th>Saldo</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>{listaSaldos.map((item) => <tr key={`${item.id_item}-${item.codigo_unidade}`}><td><strong>{item.nome_item}</strong></td><td>{item.categoria ?? "—"}</td><td>{decimal(item.quantidade_saldo, 3)} {item.codigo_unidade}</td><td>{decimal(item.estoque_minimo, 3)} {item.codigo_unidade}</td><td><span className={`table-pill ${item.status_estoque}`}>{rotulo(item.status_estoque)}</span></td></tr>)}</tbody></table></div></section></> : null}
  </section></main></AppShell>;
}
