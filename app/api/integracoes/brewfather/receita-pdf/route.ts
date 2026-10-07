import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { converterQuantidade, extrairTextoPdf, interpretarReceita, unidadesCompativeis } from "@/lib/brewfather/recipe-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function chave(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase(); }

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  try {
    const formulario = await request.formData();
    const arquivo = formulario.get("arquivo");
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Selecione um arquivo PDF." }, { status: 400 });
    if (arquivo.size > 12 * 1024 * 1024) return NextResponse.json({ error: "O arquivo deve ter no máximo 12 MB." }, { status: 413 });
    if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Nesta primeira versão, envie um PDF gerado pelo Brewfather." }, { status: 415 });
    const receita = interpretarReceita(await extrairTextoPdf(await arquivo.arrayBuffer()));
    if (!receita.ingredientes.length) return NextResponse.json({ error: "Não encontrei ingredientes nas seções Fermentáveis, Lúpulos, Diversos ou Levedura." }, { status: 422 });
    const itensCatalogo = await supabase.from("itens").select("nome,tipo,codigo_unidade,ativo").in("tipo", ["ingrediente", "embalagem"]).eq("ativo", true);
    if (itensCatalogo.error) return NextResponse.json({ error: "Não foi possível verificar os itens já cadastrados." }, { status: 502 });
    const catalogo = (itensCatalogo.data ?? []) as Array<{ nome: string; tipo: string; codigo_unidade: string; ativo: boolean }>;
    const ingredientes = receita.ingredientes.map((ingrediente) => {
      const item = catalogo.find((candidato) => candidato.tipo === "ingrediente" && chave(candidato.nome) === chave(ingrediente.nome) && unidadesCompativeis(ingrediente.unidade, candidato.codigo_unidade));
      return {
        ...ingrediente,
        unidade: item?.codigo_unidade ?? ingrediente.unidade,
        quantidade: item ? converterQuantidade(ingrediente.quantidade, ingrediente.unidade, item.codigo_unidade) : ingrediente.quantidade,
        itemExistente: Boolean(item)
      };
    });
    return NextResponse.json({ receita: { ...receita, ingredientes } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler o PDF." }, { status: 422 });
  }
}
