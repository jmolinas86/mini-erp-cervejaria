import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { alterarEtapa, finalizarBrassagem, registrarEvento, salvarConsumo } from "../actions";

export const dynamic = "force-dynamic";

type Brassagem = { id: string; numero_brassagem: string; id_versao_receita: string; status: string; etapa_atual: string; volume_previsto_litros: number | string; volume_final_litros: number | string | null; iniciada_em: string | null; finalizada_em: string | null; estoque_baixado_em: string | null; observacoes: string | null };
type Receita = { id: string; nome: string; estilo: string | null };
type Versao = { id: string; id_receita: string; numero_versao: number; og_previsto: number | string | null; fg_previsto: number | string | null; abv_previsto: number | string | null; ibu_previsto: number | string | null };
type Consumo = { id: string; id_item: string; id_lote: string | null; etapa: string; quantidade_prevista: number | string | null; quantidade_real: number | string | null; observacoes: string | null };
type Item = { id: string; nome: string; codigo_unidade: string; codigo_item: string };
type Saldo = { id_item: string; id_lote: string | null; codigo_lote: string | null; quantidade_saldo: number | string | null; custo_unitario: number | string | null; codigo_unidade: string | null; validade: string | null };
type Evento = { id: string; etapa: string; evento_em: string; descricao: string };

const etapas = [
  { id: "planejamento", label: "Planejamento" },
  { id: "mostura", label: "Mostura" },
  { id: "fervura", label: "Fervura" },
  { id: "fermentacao", label: "Fermentação" },
  { id: "envase", label: "Envase" }
];

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number | string | null | undefined, digits = 3) {
  return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function moeda(value: number | string | null | undefined) {
  return numero(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rotuloEtapa(value: string) {
  return etapas.find((etapa) => etapa.id === value)?.label ?? (value === "finalizada" ? "Finalizada" : value.replaceAll("_", " "));
}

function dataHora(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
}

function statusClass(status: string) {
  return status === "finalizada" ? "ok" : status === "cancelada" ? "vazio" : "abaixo_minimo";
}

export default async function BrassagemDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/login?next=${encodeURIComponent(`/brassagens/${id}`)}`);
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const { data: brassagem } = await supabase.from("brassagens").select("id,numero_brassagem,id_versao_receita,status,etapa_atual,volume_previsto_litros,volume_final_litros,iniciada_em,finalizada_em,estoque_baixado_em,observacoes").eq("id", id).maybeSingle();
  if (!brassagem) notFound();
  const registro = brassagem as Brassagem;
  const [{ data: versao }, { data: consumos }, { data: eventos }] = await Promise.all([
    supabase.from("versoes_receitas").select("id,id_receita,numero_versao,og_previsto,fg_previsto,abv_previsto,ibu_previsto").eq("id", registro.id_versao_receita).maybeSingle(),
    supabase.from("consumos_brassagem").select("id,id_item,id_lote,etapa,quantidade_prevista,quantidade_real,observacoes").eq("id_brassagem", id).order("etapa").order("id"),
    supabase.from("eventos_brassagem").select("id,etapa,evento_em,descricao").eq("id_brassagem", id).order("evento_em", { ascending: false }).limit(30)
  ]);
  const versaoRegistro = versao as Versao | null;
  const [{ data: receita }, { data: itens }, { data: saldos }] = await Promise.all([
    versaoRegistro ? supabase.from("receitas").select("id,nome,estilo").eq("id", versaoRegistro.id_receita).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("itens").select("id,nome,codigo_unidade,codigo_item").in("id", (consumos ?? []).map((consumo) => consumo.id_item)),
    supabase.from("vw_saldos_estoque").select("id_item,id_lote,codigo_lote,quantidade_saldo,custo_unitario,codigo_unidade,validade")
  ]);
  const listaConsumos = (consumos ?? []) as Consumo[];
  const listaItens = (itens ?? []) as Item[];
  const listaSaldos = (saldos ?? []) as Saldo[];
  const listaEventos = (eventos ?? []) as Evento[];
  const itemPorId = new Map(listaItens.map((item) => [item.id, item]));
  const encerrada = ["finalizada", "cancelada"].includes(registro.status);
  const consumoTotalPrevisto = listaConsumos.reduce((total, consumo) => total + numero(consumo.quantidade_prevista), 0);
  const consumoTotalReal = listaConsumos.reduce((total, consumo) => total + numero(consumo.quantidade_real), 0);

  return <AppShell active="producao" userEmail={email} contextLabel="Produção" contextCurrent={registro.numero_brassagem}><main className="page-shell batch-page"><section className="page-content">
    <div className="page-header"><div><p className="eyebrow">Produção / Brassagem</p><div className="batch-title-line"><h1>{registro.numero_brassagem}</h1><span className={`table-pill ${statusClass(registro.status)}`}>{registro.status === "finalizada" ? "Finalizada" : registro.status === "em_andamento" ? "Em andamento" : registro.status === "cancelada" ? "Cancelada" : "Rascunho"}</span></div><p className="intro">{(receita as Receita | null)?.nome ?? "Receita não encontrada"} · versão {versaoRegistro?.numero_versao ?? "—"} · {registro.volume_previsto_litros} L previstos</p></div><div className="page-header-actions"><Link className="button secondary" href="/brassagens">Brassagens</Link><Link className="button secondary" href={`/receitas?receita=${versaoRegistro?.id_receita ?? ""}&versao=${registro.id_versao_receita}`}>Ver receita</Link></div></div>
    {query.error ? <p className="form-message error">{query.error}</p> : null}{query.message ? <p className="form-message success">{query.message}</p> : null}

    <section className="batch-overview-grid"><div className="panel-card"><div className="section-header"><div><p className="eyebrow">Etapa atual</p><h2>{rotuloEtapa(registro.etapa_atual)}</h2></div><span className="status-pill pending">Estoque no encerramento</span></div><div className="batch-stage-flow">{etapas.map((etapa, index) => { const atualIndex = etapas.findIndex((item) => item.id === registro.etapa_atual); const concluida = index < atualIndex || registro.status === "finalizada"; return <div className={`${concluida ? "done" : etapa.id === registro.etapa_atual ? "current" : ""}`} key={etapa.id}><span>{concluida ? "✓" : index + 1}</span><strong>{etapa.label}</strong></div>; })}</div><div className="batch-stage-actions">{!encerrada ? etapas.map((etapa) => <form action={alterarEtapa} key={etapa.id}><input type="hidden" name="id_brassagem" value={id} /><input type="hidden" name="etapa" value={etapa.id} /><button className={`button ${etapa.id === registro.etapa_atual ? "primary" : "secondary"}`} type="submit">{etapa.id === "planejamento" ? "Planejamento" : `Ir para ${etapa.label}`}</button></form>) : null}</div></div><aside className="panel-card batch-summary"><p className="eyebrow">Resumo</p><div><span>Receita</span><strong>{(receita as Receita | null)?.nome ?? "—"}</strong></div><div><span>OG / FG</span><strong>{versaoRegistro?.og_previsto ? decimal(versaoRegistro.og_previsto, 3) : "—"} / {versaoRegistro?.fg_previsto ? decimal(versaoRegistro.fg_previsto, 3) : "—"}</strong></div><div><span>Consumo previsto</span><strong>{decimal(consumoTotalPrevisto)} itens</strong></div><div><span>Consumo real</span><strong>{decimal(consumoTotalReal)} itens</strong></div><div><span>Início</span><strong>{dataHora(registro.iniciada_em)}</strong></div><div><span>Estoque</span><strong>{registro.estoque_baixado_em ? "Baixado" : "Pendente"}</strong></div></aside></section>

    <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Consumo real</p><h2>Insumos da brassagem</h2><p className="section-help">Informe o lote e a quantidade realmente usada. Nada é descontado antes da finalização.</p></div><span className="status-pill configured">{listaConsumos.length} itens previstos</span></div><div className="batch-consumption-list">{listaConsumos.length ? listaConsumos.map((consumo) => { const item = itemPorId.get(consumo.id_item); const lotesDoItem = listaSaldos.filter((saldo) => saldo.id_item === consumo.id_item && (numero(saldo.quantidade_saldo) > 0 || saldo.id_lote === consumo.id_lote)); return <div className="batch-consumption-row" key={consumo.id}><div className="batch-consumption-info"><strong>{item?.nome ?? "Item removido"}</strong><span>{rotuloEtapa(consumo.etapa)} · previsto {decimal(consumo.quantidade_prevista)} {item?.codigo_unidade ?? ""}</span></div><form className="batch-consumption-form" action={salvarConsumo}><input type="hidden" name="id_consumo" value={consumo.id} /><input type="hidden" name="id_brassagem" value={id} /><label className="form-field"><span>Lote</span><select name="id_lote" defaultValue={consumo.id_lote ?? ""} disabled={encerrada} required><option value="" disabled>Selecione o lote</option>{lotesDoItem.map((lote) => <option value={lote.id_lote ?? ""} key={`${consumo.id}-${lote.id_lote}`}>{lote.codigo_lote ?? "Sem lote"} · saldo {decimal(lote.quantidade_saldo)} {lote.codigo_unidade ?? item?.codigo_unidade ?? ""}</option>)}</select></label><label className="form-field"><span>Quantidade real ({item?.codigo_unidade ?? "un"})</span><input name="quantidade_real" type="number" min="0.001" step="0.001" defaultValue={consumo.quantidade_real === null ? "" : numero(consumo.quantidade_real)} disabled={encerrada} required /></label><label className="form-field"><span>Observação</span><input name="observacoes" defaultValue={consumo.observacoes ?? ""} disabled={encerrada} placeholder="Opcional" /></label>{!encerrada ? <button className="button secondary" type="submit">Salvar consumo</button> : <span className="batch-saved-mark">✓ Baixado</span>}</form></div>; }) : <div className="empty-state"><strong>Nenhum insumo foi copiado da receita.</strong><span>Edite a receita antes de abrir a brassagem.</span></div>}</div></section>

    {!encerrada ? <section className="batch-finalize-grid"><section className="panel-card"><div className="section-header"><div><p className="eyebrow">Encerrar produção</p><h2>Finalizar brassagem</h2><p className="section-help">Ao finalizar, o volume final será gravado e os consumos reais serão lançados como saída de estoque.</p></div></div><form className="form-grid" action={finalizarBrassagem}><input type="hidden" name="id_brassagem" value={id} /><label className="form-field"><span>Volume final aproveitável (L) *</span><input name="volume_final_litros" type="number" min="0" step="0.001" required defaultValue={registro.volume_final_litros === null ? "" : numero(registro.volume_final_litros)} placeholder="18,5" /></label><div className="form-actions form-field-wide"><button className="button primary" type="submit">Finalizar e baixar estoque</button></div></form></section><section className="panel-card"><div className="section-header"><div><p className="eyebrow">Registro operacional</p><h2>Adicionar evento</h2></div></div><form className="form-grid" action={registrarEvento}><input type="hidden" name="id_brassagem" value={id} /><label className="form-field"><span>Etapa</span><select name="etapa" defaultValue={registro.etapa_atual}>{etapas.map((etapa) => <option value={etapa.id} key={etapa.id}>{etapa.label}</option>)}</select></label><label className="form-field form-field-wide"><span>Descrição *</span><textarea name="descricao" rows={2} required placeholder="Ex.: Mostura concluída a 67 °C" /></label><div className="form-actions form-field-wide"><button className="button secondary" type="submit">Registrar evento</button></div></form></section></section> : null}

    <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Linha do tempo</p><h2>Eventos da brassagem</h2></div><span className="status-pill configured">{listaEventos.length} registros</span></div><div className="batch-event-list">{listaEventos.length ? listaEventos.map((evento) => <div className="batch-event" key={evento.id}><span className="batch-event-dot" /><div><strong>{evento.descricao}</strong><small>{rotuloEtapa(evento.etapa)} · {dataHora(evento.evento_em)}</small></div></div>) : <div className="empty-state"><strong>Nenhum evento registrado.</strong><span>As mudanças de etapa e os registros manuais aparecerão aqui.</span></div>}</div></section>
  </section></main></AppShell>;
}
