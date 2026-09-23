import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarInventarioBrewfather, BrewfatherError, marcadorBrewfather, type InsumoBrewfather } from "@/lib/brewfather/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

function respostaErro(erro: unknown) { return erro instanceof BrewfatherError ? NextResponse.json({ error: erro.message }, { status: erro.status }) : NextResponse.json({ error: "Não foi possível consultar o Brewfather agora." }, { status: 502 }); }

function estadoImportacao(item: InsumoBrewfather, existentes: Array<{ nome: string; tipo: string; observacoes: string | null }>) {
  const marcador = marcadorBrewfather(item);
  if (existentes.some((registro) => registro.observacoes?.includes(marcador))) return "importado" as const;
  if (existentes.some((registro) => registro.tipo === "ingrediente" && registro.nome.trim().toLocaleLowerCase() === item.nome.trim().toLocaleLowerCase())) return "nome_existente" as const;
  return "novo" as const;
}

export async function GET() {
  const supabase = await autenticado();
  if (!supabase) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  try {
    const [inventario, consulta] = await Promise.all([buscarInventarioBrewfather(), supabase.from("itens").select("nome,tipo,observacoes")]);
    if (consulta.error) throw new Error("Não foi possível consultar o catálogo atual do HopFlow.");
    return NextResponse.json({ items: inventario.map((item) => ({ ...item, status: estadoImportacao(item, consulta.data ?? []) })) });
  } catch (erro) { return respostaErro(erro); }
}

function numeroCodigoLivre(existentes: Array<{ codigo_item: string }>) {
  const usados = new Set(existentes.map((item) => Number(item.codigo_item)).filter((item) => Number.isInteger(item) && item > 0));
  let proximo = 1; while (usados.has(proximo)) proximo += 1; return String(proximo).padStart(4, "0");
}

async function fornecedorId(supabase: Awaited<ReturnType<typeof createClient>>, nome: string | null) {
  if (!nome) return null;
  const existente = await supabase.from("fornecedores").select("id").eq("nome", nome).maybeSingle();
  if (existente.data?.id) return existente.data.id;
  const criado = await supabase.from("fornecedores").insert({ nome, observacoes: "Fornecedor importado do Brewfather." }).select("id").single();
  return criado.data?.id ?? null;
}

async function importarItem(supabase: Awaited<ReturnType<typeof createClient>>, item: InsumoBrewfather, incluirSaldo: boolean, existentes: Array<{ id: string; nome: string; tipo: string; observacoes: string | null; codigo_item: string }>) {
  if (existentes.some((registro) => registro.observacoes?.includes(marcadorBrewfather(item)) || (registro.tipo === "ingrediente" && registro.nome.trim().toLocaleLowerCase() === item.nome.trim().toLocaleLowerCase()))) return "ignorado" as const;
  const codigoItem = numeroCodigoLivre(existentes);
  const dadosItem = { nome: item.nome, tipo: "ingrediente" as const, categoria: item.grupoNome, codigo_item: codigoItem, codigo_grupo: item.grupoCodigo, codigo_unidade: item.codigoUnidade, estoque_minimo: 0, custo_referencia: item.custoReferencia, observacoes: `${marcadorBrewfather(item)} ${item.observacaoOrigem}` };
  const criado = await supabase.from("itens").insert(dadosItem).select("id,codigo_item,codigo_grupo").single();
  if (criado.error || !criado.data) throw new Error(`Não foi possível importar o item ${item.nome}.`);
  existentes.push({ id: criado.data.id, nome: item.nome, tipo: "ingrediente", observacoes: dadosItem.observacoes, codigo_item: codigoItem });
  if (!incluirSaldo || item.quantidadeEstoque <= 0) return "criado" as const;
  const idFornecedor = await fornecedorId(supabase, item.fornecedor);
  const codigoLote = `BF-${item.colecao.slice(0, 3).toUpperCase()}-${item.idExterno.slice(-20)}`.slice(0, 80);
  const lote = await supabase.from("lotes_itens").insert({ id_item: criado.data.id, codigo_item: criado.data.codigo_item, codigo_grupo: criado.data.codigo_grupo, id_fornecedor: idFornecedor, codigo_lote: codigoLote, custo_unitario: item.custoReferencia ?? 0, recebido_em: new Date().toISOString().slice(0, 10), observacoes: `${item.observacaoOrigem}. Saldo importado sem custo informado.` }).select("id").single();
  if (lote.error || !lote.data) throw new Error(`O item ${item.nome} foi criado, mas o lote não pôde ser criado.`);
  const movimento = await supabase.from("movimentacoes_estoque").insert({ id_item: criado.data.id, codigo_item: criado.data.codigo_item, codigo_grupo: criado.data.codigo_grupo, id_lote: lote.data.id, tipo_movimentacao: "entrada_manual", quantidade: item.quantidadeEstoque, custo_unitario: item.custoReferencia ?? 0, ocorrido_em: new Date().toISOString(), tabela_origem: "importacao_brewfather", id_origem: lote.data.id, observacoes: `${item.observacaoOrigem}. Unidade convertida para ${item.codigoUnidade}.` });
  if (movimento.error) throw new Error(`O item ${item.nome} foi criado, mas o saldo não pôde ser registrado.`);
  return "criado_com_saldo" as const;
}

export async function POST(request: Request) {
  const supabase = await autenticado();
  if (!supabase) return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  try {
    const corpo = await request.json() as { ids?: unknown; incluirSaldo?: unknown };
    const ids = Array.isArray(corpo.ids) ? corpo.ids.filter((id): id is string => typeof id === "string") : [];
    if (!ids.length) return NextResponse.json({ error: "Selecione ao menos um insumo para importar." }, { status: 400 });
    const inventario = await buscarInventarioBrewfather();
    const selecionados = inventario.filter((item) => ids.includes(`${item.colecao}:${item.idExterno}`));
    const consulta = await supabase.from("itens").select("id,nome,tipo,observacoes,codigo_item");
    if (consulta.error) throw new Error("Não foi possível consultar o catálogo atual do HopFlow.");
    const existentes = (consulta.data ?? []) as Array<{ id: string; nome: string; tipo: string; observacoes: string | null; codigo_item: string }>;
    const incluirSaldo = corpo.incluirSaldo !== false;
    let criados = 0; let comSaldo = 0; let ignorados = 0;
    for (const item of selecionados) { const resultado = await importarItem(supabase, item, incluirSaldo, existentes); if (resultado === "ignorado") ignorados += 1; else { criados += 1; if (resultado === "criado_com_saldo") comSaldo += 1; } }
    return NextResponse.json({ imported: criados, withStock: comSaldo, skipped: ignorados });
  } catch (erro) { return respostaErro(erro); }
}
