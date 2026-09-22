import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { alterarEtapa, finalizarBrassagem, registrarEvento } from "../actions";
import { ConfirmarConsumo } from "../confirmar-consumo";
import { ImprimirRelatorio } from "../imprimir-relatorio";

export const dynamic = "force-dynamic";

type Brassagem = { id: string; numero_brassagem: string; id_versao_receita: string; status: string; etapa_atual: string; volume_previsto_litros: number | string; volume_final_litros: number | string | null; iniciada_em: string | null; finalizada_em: string | null; estoque_baixado_em: string | null; observacoes: string | null };
type Receita = { id: string; nome: string; estilo: string | null };
type Versao = { id: string; id_receita: string; numero_versao: number; og_previsto: number | string | null; fg_previsto: number | string | null; abv_previsto: number | string | null; ibu_previsto: number | string | null };
type Consumo = { id: string; id_item: string; id_lote: string | null; etapa: string; quantidade_prevista: number | string | null; quantidade_real: number | string | null; observacoes: string | null };
type Item = { id: string; nome: string; codigo_unidade: string; codigo_item: string; tipo: string; custo_referencia: number | string | null };
type Saldo = { id_item: string; id_lote: string | null; codigo_lote: string | null; quantidade_saldo: number | string | null; custo_unitario: number | string | null; codigo_unidade: string | null; validade: string | null };
type Lote = { id: string; id_item: string; id_fornecedor: string | null; codigo_lote: string; recebido_em: string | null; validade: string | null; custo_unitario: number | string | null };
type Fornecedor = { id: string; nome: string };
type Extra = { id: string; tipo_custo: string; descricao: string; valor: number | string };
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

function decimal(value: number | string | null | undefined, digits = 2) {
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

function dataCurta(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "—";
}

function statusLabel(value: string) {
  return value === "finalizada" ? "Finalizada" : value === "em_andamento" ? "Em andamento" : value === "cancelada" ? "Cancelada" : "Rascunho";
}

function statusClass(value: string) {
  return value === "finalizada" ? "ok" : value === "cancelada" ? "vazio" : "abaixo_minimo";
}

function proximaEtapa(etapa: string) {
  const index = etapas.findIndex((item) => item.id === etapa);
  return index >= 0 && index < etapas.length - 1 ? etapas[index + 1] : null;
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
  const [{ data: versao }, { data: consumos }, { data: eventos }, { data: extras }] = await Promise.all([
    supabase.from("versoes_receitas").select("id,id_receita,numero_versao,og_previsto,fg_previsto,abv_previsto,ibu_previsto").eq("id", registro.id_versao_receita).maybeSingle(),
    supabase.from("consumos_brassagem").select("id,id_item,id_lote,etapa,quantidade_prevista,quantidade_real,observacoes").eq("id_brassagem", id).order("etapa").order("id"),
    supabase.from("eventos_brassagem").select("id,etapa,evento_em,descricao").eq("id_brassagem", id).order("evento_em", { ascending: false }).limit(30),
    supabase.from("custos_extras_brassagem").select("id,tipo_custo,descricao,valor").eq("id_brassagem", id).order("ocorrido_em", { ascending: true })
  ]);
  const versaoRegistro = versao as Versao | null;
  const itemIds = (consumos ?? []).map((consumo) => consumo.id_item);
  const [{ data: receita }, { data: itens }, { data: saldos }, { data: lotes }, { data: fornecedores }] = await Promise.all([
    versaoRegistro ? supabase.from("receitas").select("id,nome,estilo").eq("id", versaoRegistro.id_receita).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("itens").select("id,nome,codigo_unidade,codigo_item,tipo,custo_referencia").in("id", itemIds),
    supabase.from("vw_saldos_estoque").select("id_item,id_lote,codigo_lote,quantidade_saldo,custo_unitario,codigo_unidade,validade"),
    supabase.from("lotes_itens").select("id,id_item,id_fornecedor,codigo_lote,recebido_em,validade,custo_unitario").order("recebido_em", { ascending: true }),
    supabase.from("fornecedores").select("id,nome").order("nome")
  ]);

  const listaConsumos = (consumos ?? []) as Consumo[];
  const listaItens = (itens ?? []) as Item[];
  const listaSaldos = (saldos ?? []) as Saldo[];
  const listaLotes = (lotes ?? []) as Lote[];
  const listaFornecedores = (fornecedores ?? []) as Fornecedor[];
  const listaExtras = (extras ?? []) as Extra[];
  const listaEventos = (eventos ?? []) as Evento[];
  const itemPorId = new Map(listaItens.map((item) => [item.id, item]));
  const lotePorId = new Map(listaLotes.map((lote) => [lote.id, lote]));
  const fornecedorPorId = new Map(listaFornecedores.map((fornecedor) => [fornecedor.id, fornecedor]));
  const saldoPorLote = new Map(listaSaldos.filter((saldo) => saldo.id_lote).map((saldo) => [saldo.id_lote!, saldo]));
  const eventosPorEtapa = new Map<string, Evento>();
  for (const evento of [...listaEventos].reverse()) eventosPorEtapa.set(evento.etapa, evento);
  const encerrada = ["finalizada", "cancelada"].includes(registro.status);
  const atualIndex = etapas.findIndex((etapa) => etapa.id === registro.etapa_atual);
  const volumePrevisto = numero(registro.volume_previsto_litros);
  const volumeReal = registro.volume_final_litros === null ? null : numero(registro.volume_final_litros);
  const perdaLitros = volumeReal === null ? null : Math.max(volumePrevisto - volumeReal, 0);
  const perdaPercentual = perdaLitros === null || volumePrevisto <= 0 ? null : (perdaLitros / volumePrevisto) * 100;
  const duracaoDias = registro.iniciada_em ? Math.max(1, Math.ceil(((registro.finalizada_em ? new Date(registro.finalizada_em).getTime() : Date.now()) - new Date(registro.iniciada_em).getTime()) / 86400000)) : 0;
  const custoItem = (itemId: string, loteId?: string | null) => {
    const lote = loteId ? lotePorId.get(loteId) : listaLotes.find((registroLote) => registroLote.id_item === itemId);
    return numero(lote?.custo_unitario ?? itemPorId.get(itemId)?.custo_referencia);
  };
  const custoPrevistoInsumos = listaConsumos.reduce((total, consumo) => total + numero(consumo.quantidade_prevista) * custoItem(consumo.id_item, consumo.id_lote), 0);
  const custoRealInsumos = listaConsumos.reduce((total, consumo) => total + (consumo.quantidade_real === null ? 0 : numero(consumo.quantidade_real) * custoItem(consumo.id_item, consumo.id_lote)), 0);
  const custoEmbalagens = listaConsumos.filter((consumo) => itemPorId.get(consumo.id_item)?.tipo === "embalagem").reduce((total, consumo) => total + numero(consumo.quantidade_prevista) * custoItem(consumo.id_item, consumo.id_lote), 0);
  const custoExtras = listaExtras.reduce((total, extra) => total + numero(extra.valor), 0);
  const custoUtilidades = listaExtras.filter((extra) => extra.tipo_custo === "utilidades").reduce((total, extra) => total + numero(extra.valor), 0);
  const custoTotalPrevisto = custoPrevistoInsumos + custoExtras;
  const custoTotalReal = custoRealInsumos + custoExtras;
  const custoPorLitro = volumeReal && volumeReal > 0 ? custoTotalReal / volumeReal : null;
  const consumosConfirmados = listaConsumos.some((consumo) => consumo.quantidade_real !== null);
  const diferencaCusto = custoTotalPrevisto > 0 && consumosConfirmados ? ((custoTotalReal - custoTotalPrevisto) / custoTotalPrevisto) * 100 : null;

  return <AppShell active="producao" userEmail={email} contextLabel="Produção" contextCurrent={registro.numero_brassagem}><main className="page-shell brew-batch-page"><section className="page-content">
    <div className="brew-batch-header"><div><div className="brew-breadcrumb">Produção <span>/</span> Brassagens <span>/</span> <strong>{registro.numero_brassagem.replace("BR-", "#")}</strong></div><div className="brew-title-line"><h1>Brassagem {registro.numero_brassagem.replace("BR-", "#")}</h1><span className={`brew-status-pill ${registro.status}`}>{registro.etapa_atual === "fermentacao" ? "⚗ Fermentação" : statusLabel(registro.status)}</span></div><h2>{(receita as Receita | null)?.nome ?? "Receita não encontrada"}</h2><p className="brew-meta">Estilo: {(receita as Receita | null)?.estilo ?? "—"}<span>|</span> Data de início: {dataCurta(registro.iniciada_em)}<span>|</span> Previsão de término: {volumeReal === null ? "Em andamento" : dataCurta(registro.finalizada_em)}</p></div><div className="brew-header-actions"><Link className="button secondary" href="/brassagens">Brassagens</Link><ImprimirRelatorio /></div></div>
    {query.error ? <p className="form-message error">{query.error}</p> : null}{query.message ? <p className="form-message success">{query.message}</p> : null}

    <div className="brew-batch-layout"><div className="brew-batch-main">
      <section className="brew-card brew-stage-card"><div className="brew-card-heading"><h2>▤ &nbsp; Etapas da produção</h2><span>{statusLabel(registro.status)}</span></div><div className="brew-stage-line">{etapas.map((etapa, index) => { const concluida = registro.status === "finalizada" || index < atualIndex; const atual = etapa.id === registro.etapa_atual && !concluida; const evento = eventosPorEtapa.get(etapa.id); return <div className={`brew-stage-node ${concluida ? "done" : atual ? "current" : "waiting"}`} key={etapa.id}><span>{concluida ? "✓" : atual ? "●" : "○"}</span><strong>{etapa.label}</strong><small>{evento ? dataHora(evento.evento_em) : atual ? dataHora(registro.iniciada_em) : "Aguardando"}</small><em>{concluida ? "Concluída" : atual ? "Em andamento" : "Aguardando"}</em></div>; })}</div><div className="brew-stage-connectors" aria-hidden="true">{etapas.slice(0, -1).map((etapa, index) => <i className={registro.status === "finalizada" || index < atualIndex ? "done" : ""} key={etapa.id} />)}</div>{!encerrada ? <div className="brew-stage-buttons">{etapas.map((etapa) => <form action={alterarEtapa} key={etapa.id}><input type="hidden" name="id_brassagem" value={id} /><input type="hidden" name="etapa" value={etapa.id} /><button className={`button ${etapa.id === registro.etapa_atual ? "primary" : "secondary"}`} type="submit">{etapa.id === registro.etapa_atual ? "Etapa atual" : etapa.label}</button></form>)}</div> : null}</section>

      <section className="brew-kpi-grid"><div className="brew-kpi-card"><span className="brew-kpi-icon green">⚗</span><div><small>Volume previsto</small><strong>{decimal(volumePrevisto, 1)} L</strong></div></div><div className="brew-kpi-card"><span className="brew-kpi-icon blue">▣</span><div><small>Volume real</small><strong>{volumeReal === null ? "—" : `${decimal(volumeReal, 1)} L`}</strong></div></div><div className="brew-kpi-card"><span className="brew-kpi-icon red">▼</span><div><small>Perda</small><strong className="negative">{perdaPercentual === null ? "—" : `${decimal(perdaPercentual, 1)}%`}</strong></div></div><div className="brew-kpi-card"><span className="brew-kpi-icon gray">◷</span><div><small>Duração</small><strong>{duracaoDias ? `${duracaoDias} dia${duracaoDias === 1 ? "" : "s"}` : "—"}</strong></div></div></section>

      <section className="brew-card brew-recipe-card"><div className="brew-card-heading"><h2>▤ &nbsp; Receita utilizada</h2><Link href={`/receitas?receita=${versaoRegistro?.id_receita ?? ""}&versao=${registro.id_versao_receita}`}>Ver receita ↗</Link></div><div className="brew-recipe-info"><strong>{(receita as Receita | null)?.nome ?? "—"}</strong><span>{(receita as Receita | null)?.estilo ?? "—"}</span><i>|</i><span>OG: {versaoRegistro?.og_previsto ? decimal(versaoRegistro.og_previsto, 3) : "—"}</span><i>|</i><span>FG: {versaoRegistro?.fg_previsto ? decimal(versaoRegistro.fg_previsto, 3) : "—"}</span><i>|</i><span>ABV: {versaoRegistro?.abv_previsto ? `${decimal(versaoRegistro.abv_previsto, 1)}%` : "—"}</span><i>|</i><span>IBU: {versaoRegistro?.ibu_previsto ? decimal(versaoRegistro.ibu_previsto, 0) : "—"}</span></div></section>

      <section className="brew-card brew-consumption-card"><div className="brew-card-heading"><h2>♧ &nbsp; Consumo de insumos</h2><span>{listaConsumos.filter((consumo) => consumo.quantidade_real !== null).length}/{listaConsumos.length} confirmados</span></div><div className="brew-consumption-table"><div className="brew-consumption-head"><span>Insumo</span><span>Previsto</span><span>Real / lote</span><span>Diferença</span><span>Custo real</span></div>{listaConsumos.length ? listaConsumos.map((consumo) => { const item = itemPorId.get(consumo.id_item); const quantidadePrevista = numero(consumo.quantidade_prevista); const lotesDoItem = listaSaldos.filter((saldo) => saldo.id_item === consumo.id_item && (numero(saldo.quantidade_saldo) > 0 || saldo.id_lote === consumo.id_lote)).sort((a, b) => (lotePorId.get(a.id_lote ?? "")?.recebido_em ?? "9999-12-31").localeCompare(lotePorId.get(b.id_lote ?? "")?.recebido_em ?? "9999-12-31")); const loteAutomatico = lotesDoItem.find((lote) => numero(lote.quantidade_saldo) >= quantidadePrevista) ?? lotesDoItem[0] ?? null; const loteSelecionado = lotesDoItem.find((lote) => lote.id_lote === consumo.id_lote) ?? loteAutomatico; const quantidadeExibida = consumo.quantidade_real === null ? quantidadePrevista : numero(consumo.quantidade_real); const saldoSelecionado = numero(loteSelecionado?.quantidade_saldo); const bloqueado = !loteSelecionado || saldoSelecionado < quantidadeExibida; const fornecedor = loteSelecionado?.id_lote ? fornecedorPorId.get(lotePorId.get(loteSelecionado.id_lote)?.id_fornecedor ?? "")?.nome : null; const diferenca = consumo.quantidade_real === null ? null : numero(consumo.quantidade_real) - quantidadePrevista; const custoReal = consumo.quantidade_real === null ? null : quantidadeExibida * custoItem(consumo.id_item, loteSelecionado?.id_lote); return <div className="brew-consumption-row" key={consumo.id}><div className="brew-consumption-item"><strong>{item?.nome ?? "Item removido"}</strong><small>{fornecedor ?? loteSelecionado?.codigo_lote ?? "Lote não definido"}</small></div><span>{decimal(quantidadePrevista)} {item?.codigo_unidade ?? ""}</span><div className="brew-real-cell">{!encerrada ? <ConfirmarConsumo compact idConsumo={consumo.id} idBrassagem={id} idLote={loteSelecionado?.id_lote ?? ""} loteLabel={loteSelecionado?.codigo_lote ?? "Sem lote"} saldoLabel={loteSelecionado ? `Saldo ${decimal(loteSelecionado.quantidade_saldo)} ${loteSelecionado.codigo_unidade ?? item?.codigo_unidade ?? ""}` : "Sem saldo"} quantidade={quantidadeExibida} unidade={item?.codigo_unidade ?? "un"} confirmado={consumo.quantidade_real !== null} bloqueado={bloqueado} /> : <><strong>{consumo.quantidade_real === null ? "—" : `${decimal(consumo.quantidade_real)} ${item?.codigo_unidade ?? ""}`}</strong><small>{loteSelecionado?.codigo_lote ?? "Lote não definido"}</small></>}</div><span className={diferenca === null ? "muted" : diferenca > 0 ? "negative" : diferenca < 0 ? "positive" : "muted"}>{diferenca === null ? "—" : `${diferenca > 0 ? "+" : ""}${decimal(diferenca)} ${item?.codigo_unidade ?? ""}`}</span><strong>{custoReal === null ? "—" : moeda(custoReal)}</strong></div>; }) : <div className="empty-state"><strong>Nenhum insumo foi copiado da receita.</strong><span>Edite a receita antes de abrir a brassagem.</span></div>}</div></section>

      <section className="brew-card brew-events-card" id="eventos"><div className="brew-card-heading"><h2>☷ &nbsp; Eventos recentes</h2><span>{listaEventos.length} registros</span></div><div className="brew-events-list">{listaEventos.length ? listaEventos.map((evento) => <div className="brew-event-row" key={evento.id}><span className="brew-event-dot" /><time>{dataHora(evento.evento_em)}</time><strong>{evento.descricao}</strong><span>{rotuloEtapa(evento.etapa)}</span><b>{email?.slice(0, 2).toUpperCase() ?? "EU"}</b></div>) : <div className="empty-state"><strong>Nenhum evento registrado.</strong><span>As mudanças de etapa e os registros manuais aparecerão aqui.</span></div>}</div></section>
      {!encerrada ? <section className="brew-card brew-event-form-card" id="registrar-evento"><div className="brew-card-heading"><h2>Registrar evento ou perda</h2></div><form className="brew-event-form" action={registrarEvento}><input type="hidden" name="id_brassagem" value={id} /><select name="etapa" defaultValue={registro.etapa_atual}>{etapas.map((etapa) => <option value={etapa.id} key={etapa.id}>{etapa.label}</option>)}</select><input name="descricao" required placeholder="Ex.: perda de 0,5 L no envase" /><button className="button secondary" type="submit">Registrar</button></form></section> : null}
    </div>

    <aside className="brew-batch-sidebar"><section className="brew-card brew-cost-card"><div className="brew-card-heading"><h2>▤ &nbsp; Custo da brassagem</h2></div><div className="brew-cost-line"><span>Custo previsto (insumos)</span><strong>{moeda(custoPrevistoInsumos)}</strong></div><div className="brew-cost-line"><span>Custo real (insumos)</span><strong className={custoRealInsumos > custoPrevistoInsumos ? "negative" : ""}>{registro.status === "rascunho" ? "—" : moeda(custoRealInsumos)}</strong></div><div className="brew-cost-diff"><span>Diferença</span><strong>{diferencaCusto === null ? "—" : `${diferencaCusto > 0 ? "+" : ""}${decimal(diferencaCusto, 1)}%`}</strong></div><hr /><div className="brew-cost-per-liter"><span>Custo por litro (real)</span><strong>{custoPorLitro === null ? "—" : `${moeda(custoPorLitro)} / L`}</strong></div><div className="brew-cost-detail"><span>Embalagens (estimado)</span><strong>{custoEmbalagens ? moeda(custoEmbalagens) : "—"}</strong></div><div className="brew-cost-detail"><span>Utilidades</span><strong>{custoUtilidades ? moeda(custoUtilidades) : "—"}</strong></div><div className="brew-cost-detail"><span>Perdas e descarte</span><strong>{perdaLitros === null ? "—" : `${decimal(perdaLitros, 1)} L`}</strong></div><div className="brew-cost-total"><span>Custo total {registro.status === "finalizada" ? "real" : "estimado"}</span><strong>{moeda(registro.status === "finalizada" ? custoTotalReal : custoTotalPrevisto)}</strong>{volumeReal === null ? null : <small>(com volume final)</small>}</div></section>
      <section className="brew-card brew-actions-card"><div className="brew-card-heading"><h2>⚡ &nbsp; Ações</h2></div><Link className="brew-action-button primary" href="#registrar-evento">＋ &nbsp; Registrar perda</Link>{!encerrada && proximaEtapa(registro.etapa_atual) ? <form action={alterarEtapa}><input type="hidden" name="id_brassagem" value={id} /><input type="hidden" name="etapa" value={proximaEtapa(registro.etapa_atual)?.id} /><button className="brew-action-button" type="submit">▶ &nbsp; Finalizar etapa</button></form> : null}<Link className="brew-action-button" href="#eventos">▤ &nbsp; Ver relatório de eventos</Link>{!encerrada ? <form className="brew-finalize-form" action={finalizarBrassagem}><input type="hidden" name="id_brassagem" value={id} /><label><span>Volume final (L)</span><input name="volume_final_litros" type="number" min="0" step="0.001" required placeholder="18,5" /></label><button className="brew-action-button primary" type="submit">✓ &nbsp; Finalizar brassagem</button></form> : null}</section>
      <section className="brew-card brew-notes-card"><div className="brew-card-heading"><h2>▣ &nbsp; Observações</h2><span>Editar</span></div><p>{registro.observacoes ?? "Nenhuma observação registrada."}</p></section></aside>
    </div>
  </section></main></AppShell>;
}
