"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const etapasPermitidas = new Set(["planejamento", "mostura", "fervura", "fermentacao", "envase"]);

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function numero(formData: FormData, name: string, allowEmpty = false) {
  const value = texto(formData, name).replace(",", ".");
  if (!value && allowEmpty) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function inteiro(formData: FormData, name: string, fallback = 0) {
  const parsed = Number.parseInt(texto(formData, name), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function feedback(message: string, error = false, versao?: string, receita?: string): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  if (versao && uuid(versao)) params.set("versao", versao);
  if (receita && uuid(receita)) params.set("receita", receita);
  redirect(`/receitas?${params.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Freceitas");
  return supabase;
}

function metricas(formData: FormData) {
  const og = numero(formData, "og_previsto", true);
  const fg = numero(formData, "fg_previsto", true);
  const abv = numero(formData, "abv_previsto", true);
  const ibu = numero(formData, "ibu_previsto", true);
  if (og !== null && (og < 0.9 || og > 2)) return null;
  if (fg !== null && (fg < 0.9 || fg > 2)) return null;
  return { og_previsto: og, fg_previsto: fg, abv_previsto: abv, ibu_previsto: ibu };
}

export async function criarReceita(formData: FormData) {
  const supabase = await autenticado();
  const nome = texto(formData, "nome");
  const estilo = texto(formData, "estilo");
  const volume = numero(formData, "volume_previsto_litros");
  const dadosMetricas = metricas(formData);
  if (!nome || !volume || volume <= 0 || !dadosMetricas) feedback("Preencha nome, volume e métricas válidas.", true);

  const { data: receita, error } = await supabase.from("receitas").insert({
    nome,
    estilo: estilo || null,
    volume_previsto_litros: volume,
    observacoes: texto(formData, "observacoes") || null
  }).select("id").single();
  if (error || !receita) feedback("Não foi possível criar a receita. Confira se o nome já existe.", true);

  const { error: erroVersao } = await supabase.from("versoes_receitas").insert({
    id_receita: receita.id,
    numero_versao: 1,
    ...dadosMetricas,
    observacoes: "Versão inicial"
  });
  if (erroVersao) {
    await supabase.from("receitas").delete().eq("id", receita.id);
    feedback("Não foi possível criar a versão inicial da receita.", true);
  }
  feedback("Receita criada com a versão 1.", false, undefined, receita.id);
}

export async function criarVersao(formData: FormData) {
  const idReceita = texto(formData, "id_receita");
  const supabase = await autenticado();
  const dadosMetricas = metricas(formData);
  if (!uuid(idReceita) || !dadosMetricas) feedback("Receita ou métricas inválidas.", true);
  const { data: ultima } = await supabase.from("versoes_receitas").select("numero_versao").eq("id_receita", idReceita).order("numero_versao", { ascending: false }).limit(1).maybeSingle();
  const proximaVersao = Number(ultima?.numero_versao ?? 0) + 1;
  const { error } = await supabase.from("versoes_receitas").insert({ id_receita: idReceita, numero_versao: proximaVersao, ...dadosMetricas, observacoes: texto(formData, "observacoes") || null });
  if (error) feedback("Não foi possível criar a nova versão.", true);
  feedback(`Versão ${proximaVersao} criada com sucesso.`, false, undefined, idReceita);
}

export async function adicionarInsumo(formData: FormData) {
  const idVersao = texto(formData, "id_versao_receita");
  const idItem = texto(formData, "id_item");
  const idReceitaInformado = texto(formData, "id_receita");
  const etapa = texto(formData, "etapa");
  const quantidade = numero(formData, "quantidade_prevista");
  const ordem = inteiro(formData, "ordem", 10);
  const supabase = await autenticado();
  let idReceita = idReceitaInformado;
  if (!uuid(idReceita) && uuid(idVersao)) {
    const { data: versao } = await supabase.from("versoes_receitas").select("id_receita").eq("id", idVersao).maybeSingle();
    idReceita = versao?.id_receita ?? "";
  }
  if (!uuid(idVersao) || !uuid(idItem) || !etapasPermitidas.has(etapa) || !quantidade || quantidade <= 0) feedback("Preencha insumo, etapa e quantidade válidos.", true, idVersao, idReceita);
  const { data: item } = await supabase.from("itens").select("tipo,ativo").eq("id", idItem).maybeSingle();
  if (!item || item.tipo !== "ingrediente" || !item.ativo) feedback("Selecione um insumo ativo do cadastro.", true, idVersao, idReceita);
  const { error } = await supabase.from("insumos_receita").insert({ id_versao_receita: idVersao, id_item: idItem, etapa, quantidade_prevista: quantidade, ordem, observacoes: texto(formData, "observacoes") || null });
  if (error) feedback("Não foi possível adicionar o insumo. Verifique se ele já está nessa etapa e ordem.", true, idVersao, idReceita);
  feedback("Insumo adicionado à receita.", false, idVersao, idReceita);
}

export async function editarInsumo(formData: FormData) {
  const id = texto(formData, "id");
  const idVersao = texto(formData, "id_versao_receita");
  let idReceita = texto(formData, "id_receita");
  const etapa = texto(formData, "etapa");
  const quantidade = numero(formData, "quantidade_prevista");
  const ordem = inteiro(formData, "ordem", 10);
  const supabase = await autenticado();
  if (!uuid(idReceita) && uuid(idVersao)) {
    const { data: versao } = await supabase.from("versoes_receitas").select("id_receita").eq("id", idVersao).maybeSingle();
    idReceita = versao?.id_receita ?? "";
  }
  if (!uuid(id) || !uuid(idVersao) || !etapasPermitidas.has(etapa) || !quantidade || quantidade <= 0) feedback("Dados do insumo inválidos.", true, idVersao, idReceita);
  const { error } = await supabase.from("insumos_receita").update({ etapa, quantidade_prevista: quantidade, ordem, observacoes: texto(formData, "observacoes") || null }).eq("id", id);
  if (error) feedback("Não foi possível atualizar o insumo.", true, idVersao, idReceita);
  feedback("Insumo atualizado.", false, idVersao, idReceita);
}

export async function removerInsumo(formData: FormData) {
  const id = texto(formData, "id");
  const idVersao = texto(formData, "id_versao_receita");
  let idReceita = texto(formData, "id_receita");
  const supabase = await autenticado();
  if (!uuid(idReceita) && uuid(idVersao)) {
    const { data: versao } = await supabase.from("versoes_receitas").select("id_receita").eq("id", idVersao).maybeSingle();
    idReceita = versao?.id_receita ?? "";
  }
  if (!uuid(id)) feedback("Insumo inválido.", true, idVersao, idReceita);
  const { error } = await supabase.from("insumos_receita").delete().eq("id", id);
  if (error) feedback("Não foi possível remover o insumo.", true, idVersao, idReceita);
  feedback("Insumo removido.", false, idVersao, idReceita);
}

export async function alternarReceita(formData: FormData) {
  const id = texto(formData, "id");
  const ativo = texto(formData, "ativo") === "true";
  const supabase = await autenticado();
  if (!uuid(id)) feedback("Receita inválida.", true);
  const { error } = await supabase.from("receitas").update({ ativo }).eq("id", id);
  if (error) feedback("Não foi possível alterar o status da receita.", true);
  feedback(ativo ? "Receita reativada." : "Receita inativada.");
}
