import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return new Response("Não autenticado", { status: 401 });
  const tipo = new URL(request.url).searchParams.get("tipo") ?? "custos";
  let headers: string[] = [];
  let rows: unknown[][] = [];

  if (tipo === "estoque") {
    const { data, error } = await supabase.from("vw_saldos_estoque").select("nome_item,categoria,codigo_lote,codigo_unidade,quantidade_saldo,estoque_minimo,status_estoque").order("nome_item");
    if (error) return new Response(error.message, { status: 500 });
    headers = ["Item", "Categoria", "Lote", "Unidade", "Saldo", "Mínimo", "Status"];
    rows = (data ?? []).map((item) => [item.nome_item, item.categoria, item.codigo_lote, item.codigo_unidade, item.quantidade_saldo, item.estoque_minimo, item.status_estoque]);
  } else if (tipo === "producao") {
    const { data, error } = await supabase.from("brassagens").select("numero_brassagem,status,etapa_atual,volume_previsto_litros,volume_final_litros,iniciada_em,finalizada_em").order("criado_em", { ascending: false });
    if (error) return new Response(error.message, { status: 500 });
    headers = ["Brassagem", "Status", "Etapa", "Volume previsto (L)", "Volume final (L)", "Iniciada em", "Finalizada em"];
    rows = (data ?? []).map((item) => [item.numero_brassagem, item.status, item.etapa_atual, item.volume_previsto_litros, item.volume_final_litros, item.iniciada_em, item.finalizada_em]);
  } else {
    const { data, error } = await supabase.from("vw_custos_brassagem").select("numero_brassagem,status,volume_previsto_litros,volume_final_litros,perda_litros,percentual_perda,custo_insumos,custo_extra,custo_total,custo_por_litro").order("numero_brassagem");
    if (error) return new Response(error.message, { status: 500 });
    headers = ["Brassagem", "Status", "Volume previsto (L)", "Volume final (L)", "Perda (L)", "Perda (%)", "Custo insumos", "Custos extras", "Custo total", "Custo por litro"];
    rows = (data ?? []).map((item) => [item.numero_brassagem, item.status, item.volume_previsto_litros, item.volume_final_litros, item.perda_litros, item.percentual_perda, item.custo_insumos, item.custo_extra, item.custo_total, item.custo_por_litro]);
  }

  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  return new Response(`\ufeff${content}\r\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mini-erp-${tipo}.csv"` } });
}
