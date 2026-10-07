import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { converterQuantidade, unidadesCompativeis } from "@/lib/brewfather/recipe-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ingrediente = { nome?: unknown; grupo?: unknown; codigoGrupo?: unknown; quantidade?: unknown; unidade?: unknown; etapa?: unknown; observacoes?: unknown; cadastrar?: unknown };

function texto(valor: unknown) { return typeof valor === "string" ? valor.trim() : ""; }
function numero(valor: unknown) { const resultado = Number(valor); return Number.isFinite(resultado) && resultado > 0 ? resultado : 0; }
function chave(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase(); }
function grupo(codigo: string, nome: string) {
  if (codigo === "MAL") return { codigo: "MAL", nome: "Malte" };
  if (codigo === "LUP") return { codigo: "LUP", nome: "Lúpulo" };
  if (codigo === "LEV") return { codigo: "LEV", nome: "Levedura" };
  return { codigo: "DIV", nome: nome || "Diversos" };
}
function proximoCodigo(existentes: Array<{ codigo_item: string }>) {
  const usados = new Set(existentes.map((item) => Number(item.codigo_item)).filter(Number.isInteger));
  let valor = 1;
  while (usados.has(valor)) valor += 1;
  return String(valor).padStart(4, "0");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  try {
    const corpo = await request.json() as { nome?: unknown; estilo?: unknown; volumeLitros?: unknown; og?: unknown; fg?: unknown; abv?: unknown; ibu?: unknown; ingredientes?: Ingrediente[] };
    const nome = texto(corpo.nome);
    const volume = numero(corpo.volumeLitros);
    const ingredientes = Array.isArray(corpo.ingredientes) ? corpo.ingredientes : [];
    if (!nome || !volume || !ingredientes.length) return NextResponse.json({ error: "A receita precisa ter nome, volume e pelo menos um ingrediente." }, { status: 400 });

    const existentesConsulta = await supabase.from("itens").select("id,nome,tipo,codigo_item,codigo_unidade,ativo");
    if (existentesConsulta.error) throw new Error("Não foi possível consultar o catálogo de itens.");
    const existentes = (existentesConsulta.data ?? []) as Array<{ id: string; nome: string; tipo: string; codigo_item: string; codigo_unidade: string; ativo: boolean }>;
    const receitaExistente = await supabase.from("receitas").select("id").ilike("nome", nome).maybeSingle();
    if (receitaExistente.data) return NextResponse.json({ error: "Já existe uma receita com esse nome. Altere o nome antes de salvar." }, { status: 409 });

    const receitaCriada = await supabase.from("receitas").insert({ nome, estilo: texto(corpo.estilo) || null, volume_previsto_litros: volume, observacoes: "Importada do PDF do Brewfather" }).select("id").single();
    if (receitaCriada.error || !receitaCriada.data) throw new Error("Não foi possível criar a receita.");
    const receitaId = receitaCriada.data.id;
    const versaoCriada = await supabase.from("versoes_receitas").insert({ id_receita: receitaId, numero_versao: 1, og_previsto: numero(corpo.og) || null, fg_previsto: numero(corpo.fg) || null, abv_previsto: numero(corpo.abv) || null, ibu_previsto: numero(corpo.ibu) || null, observacoes: "Importada do PDF do Brewfather" }).select("id").single();
    if (versaoCriada.error || !versaoCriada.data) { await supabase.from("receitas").delete().eq("id", receitaId); throw new Error("Não foi possível criar a versão inicial da receita."); }

    const itensCriados = new Map<string, string>();
    let ordem = 10;
    for (const ingrediente of ingredientes) {
      const nomeIngrediente = texto(ingrediente.nome);
      let quantidade = numero(ingrediente.quantidade);
      if (!nomeIngrediente || !quantidade) continue;
      if (ingrediente.cadastrar === false) continue;
      const codigoGrupo = texto(ingrediente.codigoGrupo);
      const definicaoGrupo = grupo(codigoGrupo, texto(ingrediente.grupo));
      let unidade = texto(ingrediente.unidade) || (codigoGrupo === "MAL" ? "kg" : codigoGrupo === "LEV" ? "pct" : "g");
      let chaveItem = `${chave(nomeIngrediente)}:${unidade}`;
      let idItem = itensCriados.get(chaveItem);
      if (!idItem) {
        const existente = existentes.find((item) => item.ativo && item.tipo === "ingrediente" && chave(item.nome) === chave(nomeIngrediente) && unidadesCompativeis(unidade, item.codigo_unidade));
        if (existente) {
          idItem = existente.id;
          quantidade = converterQuantidade(quantidade, unidade, existente.codigo_unidade);
          unidade = existente.codigo_unidade;
          chaveItem = `${chave(nomeIngrediente)}:${unidade}`;
        }
        else {
          const codigoItem = proximoCodigo(existentes);
          const criado = await supabase.from("itens").insert({ codigo_item: codigoItem, codigo_grupo: definicaoGrupo.codigo, nome: nomeIngrediente, tipo: "ingrediente", categoria: definicaoGrupo.nome, codigo_unidade: unidade, estoque_minimo: 0, custo_referencia: 0, observacoes: "Importado do PDF do Brewfather" }).select("id").single();
          if (criado.error || !criado.data) throw new Error(`Não foi possível cadastrar o item ${nomeIngrediente}.`);
          const novoId = criado.data.id;
          idItem = novoId;
          existentes.push({ id: novoId, nome: nomeIngrediente, tipo: "ingrediente", codigo_item: codigoItem, codigo_unidade: unidade, ativo: true });
        }
        if (!idItem) throw new Error(`Não foi possível resolver o item ${nomeIngrediente}.`);
        itensCriados.set(chaveItem, idItem);
      }
      if (!idItem) throw new Error(`Não foi possível resolver o item ${nomeIngrediente}.`);
      const inserido = await supabase.from("insumos_receita").insert({ id_versao_receita: versaoCriada.data.id, id_item: idItem, etapa: texto(ingrediente.etapa) || "planejamento", quantidade_prevista: quantidade, ordem, observacoes: texto(ingrediente.observacoes) || null });
      if (inserido.error) throw new Error(`Não foi possível adicionar ${nomeIngrediente} à receita.`);
      ordem += 10;
    }
    revalidatePath("/receitas");
    return NextResponse.json({ id: receitaId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível importar a receita." }, { status: 422 });
  }
}
