"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const tiposPermitidos = new Set(["ingrediente", "embalagem", "produto_acabado"]);

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function feedback(message: string, error = false): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  redirect(`/cadastros/itens?${params.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Fitens");
  return supabase;
}

async function dadosItem(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData) {
  const nome = texto(formData, "nome");
  const tipo = texto(formData, "tipo");
  const codigoItem = texto(formData, "codigo_item").toUpperCase();
  const codigoGrupo = texto(formData, "codigo_grupo").toUpperCase();
  const codigoUnidade = texto(formData, "codigo_unidade");
  const estoqueMinimo = numero(formData, "estoque_minimo");
  const custoReferencia = numero(formData, "custo_referencia", true);

  if (!nome || !tiposPermitidos.has(tipo) || !/^[A-Z0-9][A-Z0-9_-]{2,30}$/.test(codigoItem) || !/^[A-Z0-9][A-Z0-9_-]{1,20}$/.test(codigoGrupo) || !codigoUnidade || estoqueMinimo === null || (texto(formData, "custo_referencia") && custoReferencia === null)) {
    feedback("Preencha nome, código do item, grupo, unidade e valores válidos.", true);
  }

  const { data: grupo, error: erroGrupo } = await supabase.from("grupos_itens").select("codigo,nome,codigo_categoria").eq("codigo", codigoGrupo).eq("ativo", true).maybeSingle();
  const categoriaEsperada = tipo === "ingrediente" ? "ING" : tipo === "embalagem" ? "EMB" : "PA";
  if (erroGrupo || !grupo || grupo.codigo_categoria !== categoriaEsperada) feedback("Selecione um grupo compatível com o tipo do item.", true);

  return { nome, tipo, codigo_item: codigoItem, codigo_grupo: codigoGrupo, categoria: grupo.nome, codigo_unidade: codigoUnidade, estoque_minimo: estoqueMinimo, custo_referencia: custoReferencia, observacoes: texto(formData, "observacoes") || null };
}

export async function criarItem(formData: FormData) {
  const supabase = await autenticado();
  const { error } = await supabase.from("itens").insert(await dadosItem(supabase, formData));
  if (error) feedback("Não foi possível criar o item. Confira se nome, tipo e unidade estão corretos.", true);
  feedback("Item criado com sucesso.");
}

export async function editarItem(formData: FormData) {
  const id = texto(formData, "id");
  if (!isUuid(id)) feedback("Item inválido.", true);
  const supabase = await autenticado();
  const dados = await dadosItem(supabase, formData);
  const { data: atual, error: erroAtual } = await supabase.from("itens").select("codigo_item").eq("id", id).maybeSingle();
  if (erroAtual || !atual || atual.codigo_item !== dados.codigo_item) feedback("O código do item é uma referência fixa e não pode ser alterado.", true);
  const { error } = await supabase.from("itens").update(dados).eq("id", id);
  if (error) feedback("Não foi possível atualizar o item. Confira os dados informados.", true);
  await supabase.from("lotes_itens").update({ codigo_grupo: dados.codigo_grupo }).eq("id_item", id);
  await supabase.from("movimentacoes_estoque").update({ codigo_grupo: dados.codigo_grupo }).eq("id_item", id);
  feedback("Item atualizado com sucesso.");
}

export async function alternarItem(formData: FormData) {
  const id = texto(formData, "id");
  if (!isUuid(id)) feedback("Item inválido.", true);
  const supabase = await autenticado();
  const ativo = texto(formData, "ativo") === "true";
  const { error } = await supabase.from("itens").update({ ativo }).eq("id", id);
  if (error) feedback("Não foi possível alterar o status do item.", true);
  feedback(ativo ? "Item reativado." : "Item inativado.");
}
