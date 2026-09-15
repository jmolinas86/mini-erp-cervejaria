"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

const tiposMovimentacao = new Set([
  "entrada_manual",
  "saida_manual",
  "ajuste_entrada",
  "ajuste_saida",
  "perda"
]);
const tiposEntrada = new Set(["compra", "entrada_manual", "ajuste_entrada"]);
const tiposSaida = new Set(["saida_manual", "ajuste_saida", "perda"]);

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function numero(formData: FormData, name: string, allowEmpty = false) {
  const raw = texto(formData, name).replace(",", ".");
  if (!raw && allowEmpty) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function dataISO(value: string, required = false) {
  if (!value) return required ? null : new Date().toISOString();
  const data = new Date(`${value}T12:00:00`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

async function converterUnidade(
  supabase: SupabaseClient,
  codigoItem: string,
  codigoEntrada: string,
  quantidade: number,
  custo: number | null
) {
  const { data: unidades, error } = await supabase
    .from("unidades")
    .select("codigo,tipo,unidade_base,fator_para_base")
    .in("codigo", [codigoItem, codigoEntrada]);
  if (error) return null;

  const unidadeItem = unidades?.find((unidade) => unidade.codigo === codigoItem);
  const unidadeEntrada = unidades?.find((unidade) => unidade.codigo === codigoEntrada);
  if (!unidadeItem || !unidadeEntrada || unidadeItem.tipo !== unidadeEntrada.tipo || (unidadeItem.tipo === "count" && unidadeItem.codigo !== unidadeEntrada.codigo) || unidadeItem.unidade_base !== unidadeEntrada.unidade_base) {
    return null;
  }

  const fator = Number(unidadeEntrada.fator_para_base) / Number(unidadeItem.fator_para_base);
  if (!Number.isFinite(fator) || fator <= 0) return null;
  return {
    quantidade: quantidade * fator,
    custo: custo === null ? null : custo / fator,
    unidadeItem: unidadeItem.codigo,
    unidadeEntrada: unidadeEntrada.codigo,
    quantidadeInformada: quantidade
  };
}

function feedback(message: string, error = false): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  redirect(`/estoque?${params.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Festoque");
  const authId = typeof data.claims.sub === "string" && isUuid(data.claims.sub) ? data.claims.sub : null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  let criadoPor: string | null = null;

  if (authId) {
    const { data: usuarioVinculado } = await supabase
      .from("usuarios_app")
      .select("id")
      .eq("id_usuario_auth", authId)
      .maybeSingle();
    criadoPor = usuarioVinculado?.id ?? null;
  }

  if (!criadoPor && email) {
    const { data: usuarioPorEmail } = await supabase
      .from("usuarios_app")
      .select("id")
      .eq("email", email)
      .eq("ativo", true)
      .maybeSingle();
    criadoPor = usuarioPorEmail?.id ?? null;
  }

  return { supabase, criadoPor };
}

export async function registrarEntrada(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const idItem = texto(formData, "id_item");
  const idFornecedor = texto(formData, "id_fornecedor");
  const codigoLote = texto(formData, "codigo_lote");
  const quantidadeInformada = numero(formData, "quantidade");
  const custoInformado = numero(formData, "custo_unitario");
  const codigoUnidadeEntrada = texto(formData, "codigo_unidade_entrada");
  const recebidoEm = dataISO(texto(formData, "recebido_em"), true);
  const validade = texto(formData, "validade");

  if (!isUuid(idItem) || (idFornecedor && !isUuid(idFornecedor)) || !codigoLote || quantidadeInformada === null || quantidadeInformada <= 0 || custoInformado === null || !codigoUnidadeEntrada || !recebidoEm || (validade && !dataISO(validade, true))) {
    feedback("Preencha item, lote, quantidade, custo e datas válidas.", true);
  }

  const { data: item, error: erroItem } = await supabase.from("itens").select("codigo_unidade,codigo_item,codigo_grupo").eq("id", idItem).maybeSingle();
  if (erroItem || !item) feedback("Item não encontrado.", true);
  const conversao = await converterUnidade(supabase, item.codigo_unidade, codigoUnidadeEntrada, quantidadeInformada, custoInformado);
  if (!conversao) feedback("A unidade informada não é compatível com a unidade-base do item.", true);
  const observacoes = texto(formData, "observacoes");
  const observacaoConversao = conversao.unidadeEntrada === conversao.unidadeItem ? observacoes || null : `${observacoes ? `${observacoes} ` : ""}Entrada informada em ${conversao.quantidadeInformada} ${conversao.unidadeEntrada} e convertida para ${conversao.quantidade} ${conversao.unidadeItem}.`;

  const { data: lote, error: erroLote } = await supabase
    .from("lotes_itens")
    .insert({
      id_item: idItem,
      codigo_item: item.codigo_item,
      codigo_grupo: item.codigo_grupo,
      id_fornecedor: idFornecedor || null,
      codigo_lote: codigoLote,
      validade: validade || null,
      custo_unitario: conversao.custo,
      recebido_em: recebidoEm.slice(0, 10),
      observacoes: observacaoConversao
    })
    .select("id")
    .single();

  if (erroLote || !lote) feedback("Não foi possível criar o lote. Verifique se o código já existe para este item.", true);

  const { error: erroMovimento } = await supabase.from("movimentacoes_estoque").insert({
    id_item: idItem,
    codigo_item: item.codigo_item,
    codigo_grupo: item.codigo_grupo,
    id_lote: lote.id,
    tipo_movimentacao: "compra",
    quantidade: conversao.quantidade,
    custo_unitario: conversao.custo,
    ocorrido_em: recebidoEm,
    tabela_origem: "entrada_estoque",
    id_origem: lote.id,
    observacoes: observacaoConversao,
    criado_por: criadoPor
  });

  if (erroMovimento) {
    await supabase.from("lotes_itens").delete().eq("id", lote.id);
    feedback("O lote foi criado, mas a entrada não pôde ser registrada.", true);
  }
  feedback("Entrada registrada e lote criado com sucesso.");
}

export async function registrarMovimentacao(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const idLote = texto(formData, "id_lote");
  const tipo = texto(formData, "tipo_movimentacao");
  const quantidadeInformada = numero(formData, "quantidade");
  const codigoUnidadeEntrada = texto(formData, "codigo_unidade_entrada");
  const ocorridoEm = dataISO(texto(formData, "ocorrido_em"));
  const custoUnitario = numero(formData, "custo_unitario", true);

  if (!isUuid(idLote) || !tiposMovimentacao.has(tipo) || quantidadeInformada === null || quantidadeInformada <= 0 || !codigoUnidadeEntrada || !ocorridoEm) {
    feedback("Selecione um lote e informe uma quantidade válida.", true);
  }

  const { data: lote, error: erroLote } = await supabase
    .from("lotes_itens")
    .select("id,id_item,codigo_item,codigo_grupo,custo_unitario")
    .eq("id", idLote)
    .maybeSingle();
  if (erroLote || !lote) feedback("Lote não encontrado.", true);

  const { data: item, error: erroItem } = await supabase.from("itens").select("codigo_unidade,codigo_item,codigo_grupo").eq("id", lote.id_item).maybeSingle();
  if (erroItem || !item) feedback("Item do lote não encontrado.", true);
  const conversao = await converterUnidade(supabase, item.codigo_unidade, codigoUnidadeEntrada, quantidadeInformada, custoUnitario);
  if (!conversao) feedback("A unidade informada não é compatível com a unidade-base do lote.", true);

  if (tiposSaida.has(tipo)) {
    const { data: saldo, error: erroSaldo } = await supabase
      .from("vw_saldos_estoque")
      .select("quantidade_saldo")
      .eq("id_lote", idLote)
      .maybeSingle();
    const saldoAtual = Number(saldo?.quantidade_saldo ?? 0);
    if (erroSaldo || conversao.quantidade > saldoAtual) feedback(`Saldo insuficiente. Disponível neste lote: ${saldoAtual} ${item.codigo_unidade}.`, true);
  }

  const { error } = await supabase.from("movimentacoes_estoque").insert({
    id_item: lote.id_item,
    codigo_item: item.codigo_item,
    codigo_grupo: item.codigo_grupo,
    id_lote: lote.id,
    tipo_movimentacao: tipo,
    quantidade: conversao.quantidade,
    custo_unitario: conversao.custo ?? Number(lote.custo_unitario),
    ocorrido_em: ocorridoEm,
    tabela_origem: "ajuste_estoque",
    observacoes: `${texto(formData, "observacoes") ? `${texto(formData, "observacoes")} ` : ""}${conversao.unidadeEntrada === conversao.unidadeItem ? "" : `Movimentação informada em ${conversao.quantidadeInformada} ${conversao.unidadeEntrada} e convertida para ${conversao.quantidade} ${conversao.unidadeItem}.`}`.trim() || null,
    criado_por: criadoPor
  });
  if (error) feedback("Não foi possível registrar a movimentação.", true);
  feedback("Movimentação registrada com sucesso.");
}
