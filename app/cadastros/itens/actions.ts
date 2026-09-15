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

function dadosItem(formData: FormData) {
  const nome = texto(formData, "nome");
  const tipo = texto(formData, "tipo");
  const categoria = texto(formData, "categoria");
  const codigoUnidade = texto(formData, "codigo_unidade");
  const estoqueMinimo = numero(formData, "estoque_minimo");
  const custoReferencia = numero(formData, "custo_referencia", true);

  if (!nome || !tiposPermitidos.has(tipo) || !categoria || !codigoUnidade || estoqueMinimo === null || (texto(formData, "custo_referencia") && custoReferencia === null)) {
    feedback("Preencha nome, tipo, categoria, unidade e valores válidos.", true);
  }

  return { nome, tipo, categoria, codigo_unidade: codigoUnidade, estoque_minimo: estoqueMinimo, custo_referencia: custoReferencia, observacoes: texto(formData, "observacoes") || null };
}

export async function criarItem(formData: FormData) {
  const supabase = await autenticado();
  const { error } = await supabase.from("itens").insert(dadosItem(formData));
  if (error) feedback("Não foi possível criar o item. Confira se nome, tipo e unidade estão corretos.", true);
  feedback("Item criado com sucesso.");
}

export async function editarItem(formData: FormData) {
  const id = texto(formData, "id");
  if (!isUuid(id)) feedback("Item inválido.", true);
  const supabase = await autenticado();
  const { error } = await supabase.from("itens").update(dadosItem(formData)).eq("id", id);
  if (error) feedback("Não foi possível atualizar o item. Confira os dados informados.", true);
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
