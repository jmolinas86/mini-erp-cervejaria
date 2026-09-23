import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Capturado = { nome?: unknown; grupo?: unknown; fornecedor?: unknown; quantidade?: unknown; unidade?: unknown; custo?: unknown };
function texto(valor: unknown) { return typeof valor === "string" ? valor.trim() : ""; }
function numero(valor: unknown) { const n = typeof valor === "number" ? valor : Number(String(valor ?? "").replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function mapeamento(valor: string) { const texto = valor.toLocaleLowerCase(); if (/lup|hop/.test(texto)) return { codigo: "LUP", nome: "Lúpulo", unidade: "g" }; if (/leved|yeast/.test(texto)) return { codigo: "LEV", nome: "Levedura", unidade: "un" }; if (/malte|malt|ferment/.test(texto)) return { codigo: "MAL", nome: "Malte", unidade: "kg" }; return { codigo: "DIV", nome: "Diversos", unidade: "g" }; }
async function autenticado() { const supabase = await createClient(); const { data } = await supabase.auth.getClaims(); return data?.claims ? supabase : null; }
function proximoCodigo(existentes: Array<{ codigo_item: string }>) { const usados = new Set(existentes.map((item) => Number(item.codigo_item))); let valor = 1; while (usados.has(valor)) valor += 1; return String(valor).padStart(4, "0"); }

export async function POST(request: Request) {
  const supabase = await autenticado(); if (!supabase) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  try {
    const corpo = await request.json() as { itens?: Capturado[]; incluirSaldo?: boolean }; const itens = Array.isArray(corpo.itens) ? corpo.itens : []; if (!itens.length) return NextResponse.json({ error: "Nenhum item foi selecionado." }, { status: 400 });
    const consulta = await supabase.from("itens").select("id,nome,tipo,observacoes,codigo_item"); if (consulta.error) throw new Error("Não foi possível consultar o catálogo do HopFlow.");
    const existentes = (consulta.data ?? []) as Array<{ id: string; nome: string; tipo: string; observacoes: string | null; codigo_item: string }>; let importados = 0; let ignorados = 0;
    for (const captura of itens) {
      const nome = texto(captura.nome); if (!nome) continue; if (existentes.some((item) => item.nome.trim().toLocaleLowerCase() === nome.toLocaleLowerCase() && item.tipo === "ingrediente")) { ignorados += 1; continue; }
      const grupo = mapeamento(texto(captura.grupo)); const unidadeInformada = texto(captura.unidade).toLocaleLowerCase() || grupo.unidade; const quantidadeInformada = numero(captura.quantidade); const quantidade = grupo.unidade === "kg" && unidadeInformada === "g" ? quantidadeInformada / 1000 : grupo.unidade === "g" && unidadeInformada === "kg" ? quantidadeInformada * 1000 : quantidadeInformada; const custo = numero(captura.custo) || 0; const codigoItem = proximoCodigo(existentes); const observacoes = `Captura assistida do Brewfather · origem: tela · unidade informada: ${unidadeInformada}`;
      const criado = await supabase.from("itens").insert({ nome, tipo: "ingrediente", categoria: grupo.nome, codigo_item: codigoItem, codigo_grupo: grupo.codigo, codigo_unidade: grupo.unidade, estoque_minimo: 0, custo_referencia: custo, observacoes }).select("id,codigo_item,codigo_grupo").single(); if (criado.error || !criado.data) throw new Error(`Não foi possível importar ${nome}.`); existentes.push({ id: criado.data.id, nome, tipo: "ingrediente", observacoes, codigo_item: codigoItem }); importados += 1;
      if (corpo.incluirSaldo !== false && quantidade > 0) { const lote = await supabase.from("lotes_itens").insert({ id_item: criado.data.id, codigo_item: criado.data.codigo_item, codigo_grupo: criado.data.codigo_grupo, codigo_lote: `CAP-${codigoItem}`, custo_unitario: custo, recebido_em: new Date().toISOString().slice(0, 10), observacoes }).select("id").single(); if (lote.error || !lote.data) throw new Error(`O item ${nome} foi criado, mas o lote não pôde ser criado.`); const movimento = await supabase.from("movimentacoes_estoque").insert({ id_item: criado.data.id, codigo_item: criado.data.codigo_item, codigo_grupo: criado.data.codigo_grupo, id_lote: lote.data.id, tipo_movimentacao: "entrada_manual", quantidade, custo_unitario: custo, ocorrido_em: new Date().toISOString(), tabela_origem: "captura_brewfather", id_origem: lote.data.id, observacoes }); if (movimento.error) throw new Error(`O item ${nome} foi criado, mas o saldo não pôde ser registrado.`); }
    }
    return NextResponse.json({ imported: importados, skipped: ignorados });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível importar a captura." }, { status: 502 }); }
}
