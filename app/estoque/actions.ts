"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  const quantidade = numero(formData, "quantidade");
  const custoUnitario = numero(formData, "custo_unitario");
  const recebidoEm = dataISO(texto(formData, "recebido_em"), true);
  const validade = texto(formData, "validade");

  if (!isUuid(idItem) || (idFornecedor && !isUuid(idFornecedor)) || !codigoLote || quantidade === null || quantidade <= 0 || custoUnitario === null || !recebidoEm || (validade && !dataISO(validade, true))) {
    feedback("Preencha item, lote, quantidade, custo e datas válidas.", true);
  }

  const { data: lote, error: erroLote } = await supabase
    .from("lotes_itens")
    .insert({
      id_item: idItem,
      id_fornecedor: idFornecedor || null,
      codigo_lote: codigoLote,
      validade: validade || null,
      custo_unitario: custoUnitario,
      recebido_em: recebidoEm.slice(0, 10),
      observacoes: texto(formData, "observacoes") || null
    })
    .select("id")
    .single();

  if (erroLote || !lote) feedback("Não foi possível criar o lote. Verifique se o código já existe para este item.", true);

  const { error: erroMovimento } = await supabase.from("movimentacoes_estoque").insert({
    id_item: idItem,
    id_lote: lote.id,
    tipo_movimentacao: "compra",
    quantidade,
    custo_unitario: custoUnitario,
    ocorrido_em: recebidoEm,
    tabela_origem: "entrada_estoque",
    id_origem: lote.id,
    observacoes: texto(formData, "observacoes") || null,
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
  const quantidade = numero(formData, "quantidade");
  const ocorridoEm = dataISO(texto(formData, "ocorrido_em"));
  const custoUnitario = numero(formData, "custo_unitario", true);

  if (!isUuid(idLote) || !tiposMovimentacao.has(tipo) || quantidade === null || quantidade <= 0 || !ocorridoEm) {
    feedback("Selecione um lote e informe uma quantidade válida.", true);
  }

  const { data: lote, error: erroLote } = await supabase
    .from("lotes_itens")
    .select("id,id_item,custo_unitario")
    .eq("id", idLote)
    .maybeSingle();
  if (erroLote || !lote) feedback("Lote não encontrado.", true);

  if (tiposSaida.has(tipo)) {
    const { data: saldo, error: erroSaldo } = await supabase
      .from("vw_saldos_estoque")
      .select("quantidade_saldo")
      .eq("id_lote", idLote)
      .maybeSingle();
    const saldoAtual = Number(saldo?.quantidade_saldo ?? 0);
    if (erroSaldo || quantidade > saldoAtual) feedback(`Saldo insuficiente. Disponível neste lote: ${saldoAtual}.`, true);
  }

  const { error } = await supabase.from("movimentacoes_estoque").insert({
    id_item: lote.id_item,
    id_lote: lote.id,
    tipo_movimentacao: tipo,
    quantidade,
    custo_unitario: custoUnitario ?? Number(lote.custo_unitario),
    ocorrido_em: ocorridoEm,
    tabela_origem: "ajuste_estoque",
    observacoes: texto(formData, "observacoes") || null,
    criado_por: criadoPor
  });
  if (error) feedback("Não foi possível registrar a movimentação.", true);
  feedback("Movimentação registrada com sucesso.");
}
