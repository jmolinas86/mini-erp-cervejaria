"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const etapasPermitidas = new Set(["planejamento", "mostura", "fervura", "fermentacao", "envase"]);
const etapasCompletas = new Set(["planejamento", "mostura", "fervura", "fermentacao", "envase"]);

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function numero(formData: FormData, name: string, allowEmpty = false) {
  const raw = texto(formData, name).replace(",", ".");
  if (!raw && allowEmpty) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function feedback(id: string | undefined, message: string, error = false): never {
  const query = new URLSearchParams(error ? { error: message } : { message });
  redirect(id && uuid(id) ? `/brassagens/${id}?${query.toString()}` : `/brassagens?${query.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fbrassagens");
  const authId = typeof data.claims.sub === "string" && uuid(data.claims.sub) ? data.claims.sub : null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  let criadoPor: string | null = null;
  if (authId) {
    const { data: usuario } = await supabase.from("usuarios_app").select("id").eq("id_usuario_auth", authId).maybeSingle();
    criadoPor = usuario?.id ?? null;
  }
  if (!criadoPor && email) {
    const { data: usuario } = await supabase.from("usuarios_app").select("id").eq("email", email).eq("ativo", true).maybeSingle();
    criadoPor = usuario?.id ?? null;
  }
  return { supabase, criadoPor };
}

async function proximoNumero(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("brassagens").select("numero_brassagem").like("numero_brassagem", "BR-%");
  const maior = (data ?? []).reduce((max, registro) => {
    const numeroAtual = Number(String(registro.numero_brassagem).replace(/^BR-/, ""));
    return Number.isInteger(numeroAtual) && numeroAtual > max ? numeroAtual : max;
  }, 0);
  return `BR-${String(maior + 1).padStart(4, "0")}`;
}

export async function criarBrassagem(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const idVersao = texto(formData, "id_versao_receita");
  const volumePrevisto = numero(formData, "volume_previsto_litros");
  const observacoes = texto(formData, "observacoes");
  if (!uuid(idVersao) || volumePrevisto === null || volumePrevisto <= 0) feedback(undefined, "Selecione uma versão de receita e informe um volume previsto válido.", true);

  const { data: versao } = await supabase.from("versoes_receitas").select("id,id_receita").eq("id", idVersao).maybeSingle();
  if (!versao) feedback(undefined, "A versão da receita não foi encontrada.", true);
  const { data: insumos } = await supabase.from("insumos_receita").select("id,id_item,etapa,quantidade_prevista,ordem").eq("id_versao_receita", idVersao).order("ordem");
  const numeroBrassagem = await proximoNumero(supabase);
  const { data: brassagem, error } = await supabase.from("brassagens").insert({
    numero_brassagem: numeroBrassagem,
    id_versao_receita: idVersao,
    status: "rascunho",
    etapa_atual: "planejamento",
    volume_previsto_litros: volumePrevisto,
    observacoes: observacoes || null,
    criado_por: criadoPor
  }).select("id").single();
  if (error || !brassagem) feedback(undefined, "Não foi possível abrir a brassagem.", true);

  const consumos = (insumos ?? []).map((insumo) => ({
    id_brassagem: brassagem.id,
    id_insumo_receita: insumo.id,
    id_item: insumo.id_item,
    etapa: insumo.etapa,
    quantidade_prevista: insumo.quantidade_prevista
  }));
  if (consumos.length) {
    const { error: erroConsumos } = await supabase.from("consumos_brassagem").insert(consumos);
    if (erroConsumos) {
      await supabase.from("brassagens").delete().eq("id", brassagem.id);
      feedback(undefined, "A brassagem foi aberta, mas seus insumos não puderam ser preparados.", true);
    }
  }
  await supabase.from("eventos_brassagem").insert({ id_brassagem: brassagem.id, etapa: "planejamento", descricao: "Brassagem aberta a partir da receita.", criado_por: criadoPor });
  redirect(`/brassagens/${brassagem.id}?message=${encodeURIComponent(`${numeroBrassagem} aberta com sucesso.`)}`);
}

export async function alterarEtapa(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const id = texto(formData, "id_brassagem");
  const etapa = texto(formData, "etapa");
  if (!uuid(id) || !etapasPermitidas.has(etapa)) feedback(id, "Etapa inválida.", true);
  const { data: atual } = await supabase.from("brassagens").select("status,etapa_atual,iniciada_em").eq("id", id).maybeSingle();
  if (!atual || ["finalizada", "cancelada"].includes(atual.status)) feedback(id, "Esta brassagem não pode mais ser alterada.", true);
  const { error } = await supabase.from("brassagens").update({
    etapa_atual: etapa,
    status: etapa === "planejamento" ? "rascunho" : "em_andamento",
    iniciada_em: etapa === "planejamento" ? null : atual.iniciada_em ?? new Date().toISOString()
  }).eq("id", id);
  if (error) feedback(id, "Não foi possível atualizar a etapa da brassagem.", true);
  await supabase.from("eventos_brassagem").insert({ id_brassagem: id, etapa, descricao: `Etapa alterada para ${etapa.replaceAll("_", " ")}.`, criado_por: criadoPor });
  feedback(id, "Etapa atualizada.");
}

export async function salvarConsumo(formData: FormData) {
  const { supabase } = await autenticado();
  const id = texto(formData, "id_consumo");
  const idBrassagem = texto(formData, "id_brassagem");
  const idLote = texto(formData, "id_lote");
  const confirmado = texto(formData, "confirmado") === "true";
  const quantidadeReal = confirmado ? numero(formData, "quantidade_real") : null;
  if (!uuid(id) || !uuid(idBrassagem) || (confirmado && (!uuid(idLote) || quantidadeReal === null || quantidadeReal <= 0))) feedback(idBrassagem, "Não foi possível confirmar este consumo.", true);
  const { data: brassagem } = await supabase.from("brassagens").select("status").eq("id", idBrassagem).maybeSingle();
  if (!brassagem || ["finalizada", "cancelada"].includes(brassagem.status)) feedback(idBrassagem, "Esta brassagem não pode mais receber alterações.", true);
  const { data: consumo } = await supabase.from("consumos_brassagem").select("id_item,id_brassagem").eq("id", id).eq("id_brassagem", idBrassagem).maybeSingle();
  if (!consumo) feedback(idBrassagem, "Consumo não encontrado.", true);
  if (idLote) {
    const { data: lote } = await supabase.from("lotes_itens").select("id,id_item").eq("id", idLote).maybeSingle();
    if (!lote || lote.id_item !== consumo.id_item) feedback(idBrassagem, "O lote sugerido não pertence ao item deste consumo.", true);
    if (confirmado) {
      const { data: saldo } = await supabase.from("vw_saldos_estoque").select("quantidade_saldo").eq("id_lote", idLote).maybeSingle();
      if (!saldo || quantidadeReal! > Number(saldo.quantidade_saldo ?? 0)) feedback(idBrassagem, "O saldo atual do lote não é suficiente para confirmar este consumo.", true);
    }
  }
  const { error } = await supabase.from("consumos_brassagem").update({ id_lote: idLote || null, quantidade_real: quantidadeReal, observacoes: texto(formData, "observacoes") || null }).eq("id", id).eq("id_brassagem", idBrassagem);
  if (error) feedback(idBrassagem, "Não foi possível salvar o consumo.", true);
  feedback(idBrassagem, confirmado ? "Consumo confirmado." : "Confirmação removida.");
}

export async function registrarEvento(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const id = texto(formData, "id_brassagem");
  const etapa = texto(formData, "etapa");
  const descricao = texto(formData, "descricao");
  if (!uuid(id) || !etapasCompletas.has(etapa) || !descricao) feedback(id, "Informe a etapa e a descrição do evento.", true);
  const { data: brassagem } = await supabase.from("brassagens").select("status").eq("id", id).maybeSingle();
  if (!brassagem || ["finalizada", "cancelada"].includes(brassagem.status)) feedback(id, "Esta brassagem não pode mais receber eventos.", true);
  const { error } = await supabase.from("eventos_brassagem").insert({ id_brassagem: id, etapa, descricao, criado_por: criadoPor });
  if (error) feedback(id, "Não foi possível registrar o evento.", true);
  feedback(id, "Evento registrado.");
}

export async function finalizarBrassagem(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const id = texto(formData, "id_brassagem");
  const volumeFinal = numero(formData, "volume_final_litros");
  if (!uuid(id) || volumeFinal === null) feedback(id, "Informe o volume final da brassagem.", true);
  const { data: brassagem } = await supabase.from("brassagens").select("id,status,numero_brassagem,volume_previsto_litros,estoque_baixado_em").eq("id", id).maybeSingle();
  if (!brassagem) feedback(id, "Brassagem não encontrada.", true);
  if (["finalizada", "cancelada"].includes(brassagem.status) || brassagem.estoque_baixado_em) feedback(id, "Esta brassagem já foi encerrada.", true);
  const { data: consumos } = await supabase.from("consumos_brassagem").select("id,id_item,id_lote,quantidade_real,etapa").eq("id_brassagem", id);
  if (!consumos?.length || consumos.some((consumo) => !consumo.id_lote || Number(consumo.quantidade_real ?? 0) <= 0)) feedback(id, "Selecione o lote e o consumo real de todos os insumos antes de finalizar.", true);
  const lotIds = consumos.map((consumo) => consumo.id_lote).filter((value): value is string => Boolean(value));
  const { data: saldos } = await supabase.from("vw_saldos_estoque").select("id_item,id_lote,quantidade_saldo").in("id_lote", lotIds);
  const consumoPorLote = new Map<string, number>();
  for (const consumo of consumos) consumoPorLote.set(consumo.id_lote!, (consumoPorLote.get(consumo.id_lote!) ?? 0) + Number(consumo.quantidade_real));
  for (const [idLote, quantidadeUsada] of consumoPorLote) {
    const saldo = saldos?.find((item) => item.id_lote === idLote);
    if (!saldo || quantidadeUsada > Number(saldo.quantidade_saldo ?? 0)) feedback(id, "Saldo insuficiente para os consumos informados.", true);
  }
  const { data: itens } = await supabase.from("itens").select("id,codigo_item,codigo_grupo,codigo_unidade").in("id", consumos.map((consumo) => consumo.id_item));
  const { data: lotes } = await supabase.from("lotes_itens").select("id,custo_unitario").in("id", lotIds);
  const movimentos: string[] = [];
  for (const consumo of consumos) {
    const item = itens?.find((registro) => registro.id === consumo.id_item);
    const lote = lotes?.find((registro) => registro.id === consumo.id_lote);
    if (!item || !lote) feedback(id, "Não foi possível localizar os dados de um item ou lote.", true);
    const { data: movimento, error } = await supabase.from("movimentacoes_estoque").insert({
      id_item: consumo.id_item,
      codigo_item: item.codigo_item,
      codigo_grupo: item.codigo_grupo,
      id_lote: consumo.id_lote,
      tipo_movimentacao: "consumo_brassagem",
      quantidade: consumo.quantidade_real,
      custo_unitario: lote.custo_unitario,
      ocorrido_em: new Date().toISOString(),
      tabela_origem: "consumos_brassagem",
      id_origem: consumo.id,
      observacoes: `Consumo real da ${brassagem.numero_brassagem}.`,
      criado_por: criadoPor
    }).select("id").single();
    if (error || !movimento) {
      await supabase.from("consumos_brassagem").update({ id_movimentacao_estoque: null }).in("id", consumos.map((registro) => registro.id));
      if (movimentos.length) await supabase.from("movimentacoes_estoque").delete().in("id", movimentos);
      feedback(id, "Não foi possível baixar todos os insumos. Nenhuma baixa foi mantida.", true);
    }
    movimentos.push(movimento.id);
    const { error: erroConsumo } = await supabase.from("consumos_brassagem").update({ id_movimentacao_estoque: movimento.id }).eq("id", consumo.id);
    if (erroConsumo) {
      await supabase.from("consumos_brassagem").update({ id_movimentacao_estoque: null }).in("id", consumos.map((registro) => registro.id));
      await supabase.from("movimentacoes_estoque").delete().in("id", movimentos);
      feedback(id, "A baixa foi revertida porque o consumo não pôde ser vinculado.", true);
    }
  }
  const agora = new Date().toISOString();
  const { error: erroFinalizacao } = await supabase.from("brassagens").update({ status: "finalizada", etapa_atual: "finalizada", volume_final_litros: volumeFinal, finalizada_em: agora, estoque_baixado_em: agora }).eq("id", id);
  if (erroFinalizacao) {
    await supabase.from("consumos_brassagem").update({ id_movimentacao_estoque: null }).in("id", consumos.map((consumo) => consumo.id));
    await supabase.from("movimentacoes_estoque").delete().in("id", movimentos);
    feedback(id, "As baixas foram revertidas porque a brassagem não pôde ser finalizada.", true);
  }
  await supabase.from("eventos_brassagem").insert({ id_brassagem: id, etapa: "finalizada", descricao: `Brassagem finalizada com ${volumeFinal} L. Estoque baixado.`, criado_por: criadoPor });
  feedback(id, "Brassagem finalizada e estoque baixado.");
}
