"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
function isCodigo(value: string) { return /^[A-Z0-9][A-Z0-9_-]{1,20}$/.test(value); }
function feedback(message: string, error = false): never { redirect(`/cadastros/grupos?${new URLSearchParams(error ? { error: message } : { message }).toString()}`); }
async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Fgrupos");
  return supabase;
}
async function dadosGrupo(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData) {
  const codigo = texto(formData, "codigo").toUpperCase();
  const nome = texto(formData, "nome");
  const codigoCategoria = texto(formData, "codigo_categoria").toUpperCase();
  if (!isCodigo(codigo) || !nome || !isCodigo(codigoCategoria)) feedback("Informe código, nome e categoria válidos.", true);
  const { data: categoria } = await supabase.from("categorias_itens").select("codigo").eq("codigo", codigoCategoria).eq("ativo", true).maybeSingle();
  if (!categoria) feedback("Selecione uma categoria válida.", true);
  return { codigo, nome, codigo_categoria: codigoCategoria };
}
export async function criarGrupo(formData: FormData) {
  const supabase = await autenticado();
  const { error } = await supabase.from("grupos_itens").insert(await dadosGrupo(supabase, formData));
  if (error) feedback("Não foi possível criar o grupo. Verifique se o código já existe.", true);
  feedback("Grupo criado com sucesso.");
}
export async function editarGrupo(formData: FormData) {
  const supabase = await autenticado();
  const codigo = texto(formData, "codigo").toUpperCase();
  if (!isCodigo(codigo)) feedback("Grupo inválido.", true);
  const dados = await dadosGrupo(supabase, formData);
  const { error } = await supabase.from("grupos_itens").update({ nome: dados.nome, codigo_categoria: dados.codigo_categoria }).eq("codigo", codigo);
  if (error) feedback("Não foi possível atualizar o grupo.", true);
  await supabase.from("itens").update({ categoria: dados.nome }).eq("codigo_grupo", codigo);
  feedback("Grupo atualizado com sucesso.");
}
export async function alternarGrupo(formData: FormData) {
  const supabase = await autenticado();
  const codigo = texto(formData, "codigo").toUpperCase();
  if (!isCodigo(codigo)) feedback("Grupo inválido.", true);
  const ativo = texto(formData, "ativo") === "true";
  const { error } = await supabase.from("grupos_itens").update({ ativo }).eq("codigo", codigo);
  if (error) feedback("Não foi possível alterar o status do grupo.", true);
  feedback(ativo ? "Grupo reativado." : "Grupo inativado.");
}
