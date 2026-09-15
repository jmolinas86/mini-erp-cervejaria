"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function feedback(message: string, error = false): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  redirect(`/cadastros/fornecedores?${params.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Ffornecedores");
  return supabase;
}

function dadosFornecedor(formData: FormData) {
  const nome = texto(formData, "nome");
  const email = texto(formData, "email");
  if (!nome) feedback("Informe o nome do fornecedor.", true);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) feedback("Informe um e-mail válido ou deixe o campo vazio.", true);
  return {
    nome,
    nome_contato: texto(formData, "nome_contato") || null,
    email: email || null,
    telefone: texto(formData, "telefone") || null,
    observacoes: texto(formData, "observacoes") || null
  };
}

export async function criarFornecedor(formData: FormData) {
  const supabase = await autenticado();
  const { error } = await supabase.from("fornecedores").insert(dadosFornecedor(formData));
  if (error) feedback("Não foi possível criar o fornecedor. Confira os dados informados.", true);
  feedback("Fornecedor criado com sucesso.");
}

export async function editarFornecedor(formData: FormData) {
  const id = texto(formData, "id");
  if (!isUuid(id)) feedback("Fornecedor inválido.", true);
  const supabase = await autenticado();
  const { error } = await supabase.from("fornecedores").update(dadosFornecedor(formData)).eq("id", id);
  if (error) feedback("Não foi possível atualizar o fornecedor.", true);
  feedback("Fornecedor atualizado com sucesso.");
}

export async function alternarFornecedor(formData: FormData) {
  const id = texto(formData, "id");
  if (!isUuid(id)) feedback("Fornecedor inválido.", true);
  const supabase = await autenticado();
  const ativo = texto(formData, "ativo") === "true";
  const { error } = await supabase.from("fornecedores").update({ ativo }).eq("id", id);
  if (error) feedback("Não foi possível alterar o status do fornecedor.", true);
  feedback(ativo ? "Fornecedor reativado." : "Fornecedor inativado.");
}
