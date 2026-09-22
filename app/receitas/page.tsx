import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { adicionarInsumo, criarReceita, editarInsumo, removerInsumo } from "./actions";

export const dynamic = "force-dynamic";

type Receita = { id: string; nome: string; estilo: string | null; volume_previsto_litros: number | string; observacoes: string | null; ativo: boolean };
type Versao = { id: string; id_receita: string; numero_versao: number; og_previsto: number | string | null; fg_previsto: number | string | null; abv_previsto: number | string | null; ibu_previsto: number | string | null; observacoes: string | null; ativo: boolean };
type Insumo = { id: string; id_versao_receita: string; id_item: string; etapa: string; quantidade_prevista: number | string; ordem: number; observacoes: string | null };
type Item = { id: string; nome: string; codigo_item: string; categoria: string; codigo_unidade: string; tipo: string; ativo: boolean };
type Lote = { id_item: string; custo_unitario: number | string | null; recebido_em: string | null };

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number | string | null | undefined, digits = 2) {
  return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function moeda(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function semAcentos(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function grupoItem(item: Item | undefined) {
  const categoria = semAcentos(item?.categoria ?? "").toLowerCase();
  if (categoria.includes("malte")) return "maltes";
  if (categoria.includes("lup")) return "lupulos";
  return "aditivos";
}

const grupos = [
  { id: "maltes", titulo: "Maltes", icone: "🌾", acao: "Adicionar malte" },
  { id: "lupulos", titulo: "Lúpulos", icone: "🌿", acao: "Adicionar lúpulo" },
  { id: "aditivos", titulo: "Levedura e aditivos", icone: "🧪", acao: "Adicionar levedura ou aditivo" }
];

export default async function ReceitasPage({ searchParams }: { searchParams: Promise<{ receita?: string; versao?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=%2Freceitas");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const [{ data: receitas, error: erroReceitas }, { data: versoes }, { data: insumos }, { data: itens }, { data: lotes }] = await Promise.all([
    supabase.from("receitas").select("id,nome,estilo,volume_previsto_litros,observacoes,ativo").order("ativo", { ascending: false }).order("nome"),
    supabase.from("versoes_receitas").select("id,id_receita,numero_versao,og_previsto,fg_previsto,abv_previsto,ibu_previsto,observacoes,ativo").order("numero_versao", { ascending: false }),
    supabase.from("insumos_receita").select("id,id_versao_receita,id_item,etapa,quantidade_prevista,ordem,observacoes").order("ordem"),
    supabase.from("itens").select("id,nome,codigo_item,categoria,codigo_unidade,tipo,ativo").eq("ativo", true).eq("tipo", "ingrediente").order("nome"),
    supabase.from("lotes_itens").select("id_item,custo_unitario,recebido_em").order("recebido_em", { ascending: false })
  ]);

  const listaReceitas = (receitas ?? []) as Receita[];
  const listaVersoes = (versoes ?? []) as Versao[];
  const listaInsumos = (insumos ?? []) as Insumo[];
  const listaItens = (itens ?? []) as Item[];
  const listaLotes = (lotes ?? []) as Lote[];
  const itemPorId = new Map(listaItens.map((item) => [item.id, item]));
  const custoPorItem = new Map<string, number>();
  for (const lote of listaLotes) if (!custoPorItem.has(lote.id_item)) custoPorItem.set(lote.id_item, numero(lote.custo_unitario));

  const receitaSelecionada = params.receita ? listaReceitas.find((receita) => receita.id === params.receita) ?? null : null;
  const versoesDaReceita = receitaSelecionada ? listaVersoes.filter((versao) => versao.id_receita === receitaSelecionada.id) : [];
  const versaoSelecionada = (params.versao ? versoesDaReceita.find((versao) => versao.id === params.versao) : null) ?? versoesDaReceita[0] ?? null;
  const insumosDaVersao = versaoSelecionada ? listaInsumos.filter((insumo) => insumo.id_versao_receita === versaoSelecionada.id) : [];
  const receitaNova = !receitaSelecionada;
  const linkReceita = (id: string, versao?: string) => `/receitas?receita=${id}${versao ? `&versao=${versao}` : ""}`;
  const custoIngredientes = insumosDaVersao.reduce((total, insumo) => total + numero(insumo.quantidade_prevista) * (custoPorItem.get(insumo.id_item) ?? 0), 0);
  const custoPorLitro = receitaSelecionada && numero(receitaSelecionada.volume_previsto_litros) > 0 ? custoIngredientes / numero(receitaSelecionada.volume_previsto_litros) : 0;
  const itensDisponiveis = insumosDaVersao.length > 0 && insumosDaVersao.every((insumo) => custoPorItem.has(insumo.id_item));

  return <AppShell active="receitas" userEmail={email} contextLabel="Receitas" contextCurrent={receitaNova ? "Nova receita" : receitaSelecionada.nome}><main className="page-shell recipe-editor-page"><section className="page-content">
    <div className="recipe-editor-header"><div><div className="recipe-title-line"><h1>{receitaNova ? "Nova receita" : receitaSelecionada.nome}</h1><span className="recipe-draft-pill">● Rascunho</span></div><p className="intro">Cadastre os parâmetros, ingredientes e etapas de produção</p></div><div className="recipe-editor-actions"><Link className="button secondary" href="/receitas">Cancelar</Link><button className="button secondary" type="submit" form="recipe-info-form" disabled={!receitaNova}>Salvar rascunho</button><button className="button primary" type="submit" form="recipe-info-form" disabled={!receitaNova}>▣ &nbsp; Salvar receita</button></div></div>
    {params.error ? <p className="form-message error">{params.error}</p> : null}{params.message ? <p className="form-message success">{params.message}</p> : null}{erroReceitas ? <p className="form-message error">Não foi possível carregar as receitas.</p> : null}

    <div className="recipe-stepper" aria-label="Etapas da receita"><span className="completed"><b>✓</b> Informações</span><i /><span className="current"><b>2</b> Ingredientes</span><i /><span><b>3</b> Processo</span><i /><span><b>4</b> Custos</span></div>

    <div className="recipe-builder-grid"><div className="recipe-builder-main">
      <section className="recipe-card"><div className="recipe-card-heading"><div><span className="recipe-heading-icon">▤</span><div><h2>Informações da receita</h2><p>Defina os dados principais desta receita</p></div></div><span className="recipe-edit-mark">⌕</span></div><form id="recipe-info-form" className="recipe-info-form" action={criarReceita}><label className="form-field"><span>Nome da receita</span><input name="nome" required defaultValue={receitaSelecionada?.nome ?? ""} placeholder="Ex.: IPA Citra 20 L" readOnly={!receitaNova} /></label><label className="form-field"><span>Estilo</span><select name="estilo" defaultValue={receitaSelecionada?.estilo ?? ""} disabled={!receitaNova}><option value="">Selecione o estilo</option><option>American IPA</option><option>India Pale Ale</option><option>Pale Ale</option><option>Stout</option><option>Pilsen</option></select></label><label className="form-field form-volume-field"><span>Volume final</span><span className="input-with-unit"><input name="volume_previsto_litros" type="number" min="0.001" step="0.001" required defaultValue={receitaSelecionada ? numero(receitaSelecionada.volume_previsto_litros) : ""} placeholder="20,0" readOnly={!receitaNova} /><em>L</em></span></label><label className="form-field"><span>Eficiência</span><span className="input-with-unit"><input name="eficiencia" type="number" min="0" max="100" step="1" defaultValue="72" readOnly={!receitaNova} /><em>%</em></span></label><label className="form-field"><span>OG prevista</span><input name="og_previsto" type="number" min="0.9" max="2" step="0.001" defaultValue={versaoSelecionada?.og_previsto ? numero(versaoSelecionada.og_previsto) : ""} placeholder="1.060" readOnly={!receitaNova} /></label><label className="form-field"><span>FG prevista</span><input name="fg_previsto" type="number" min="0.9" max="2" step="0.001" defaultValue={versaoSelecionada?.fg_previsto ? numero(versaoSelecionada.fg_previsto) : ""} placeholder="1.012" readOnly={!receitaNova} /></label><label className="form-field"><span>ABV previsto</span><span className="input-with-unit"><input name="abv_previsto" type="number" min="0" step="0.01" defaultValue={versaoSelecionada?.abv_previsto ? numero(versaoSelecionada.abv_previsto) : ""} placeholder="6,3" readOnly={!receitaNova} /><em>%</em></span></label><label className="form-field"><span>IBU previsto</span><input name="ibu_previsto" type="number" min="0" step="0.01" defaultValue={versaoSelecionada?.ibu_previsto ? numero(versaoSelecionada.ibu_previsto) : ""} placeholder="60" readOnly={!receitaNova} /></label><div className="recipe-tags form-field-wide"><span>Tags</span><div><b>IPA ×</b><b>Cítrica ×</b><input placeholder="Adicione uma tag..." readOnly /></div></div><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} defaultValue={receitaSelecionada?.observacoes ?? ""} placeholder="Perfil, cuidados ou notas da receita" readOnly={!receitaNova} /></label></form></section>

      <section className="recipe-card recipe-ingredients-card"><div className="recipe-card-heading"><div><span className="recipe-heading-icon green">♧</span><div><h2>Ingredientes</h2><p>Defina os itens e quantidades previstos</p></div></div>{versaoSelecionada ? <span className="recipe-outline-action">＋ &nbsp; Adicionar ingrediente</span> : <span className="recipe-outline-action muted">Salve a receita primeiro</span>}</div>{grupos.map((grupo) => { const itensGrupo = insumosDaVersao.filter((insumo) => grupoItem(itemPorId.get(insumo.id_item)) === grupo.id); const itensDisponiveisDoGrupo = listaItens.filter((item) => grupoItem(item) === grupo.id); const subtotal = itensGrupo.reduce((total, insumo) => total + numero(insumo.quantidade_prevista) * (custoPorItem.get(insumo.id_item) ?? 0), 0); return <div className="ingredient-group" key={grupo.id}><div className="ingredient-group-heading"><span><b>{grupo.icone}</b><strong>{grupo.titulo}</strong></span><span>Subtotal: {moeda(subtotal)}　⌃</span></div><div className="ingredient-table-head"><span>Ingrediente</span><span>Fornecedor</span><span>Quantidade</span><span>Custo</span><span>Ações</span></div>{itensGrupo.length ? itensGrupo.map((insumo) => { const item = itemPorId.get(insumo.id_item); return <details className="ingredient-row" key={insumo.id}><summary><span className="ingredient-name"><b>{item?.nome ?? "Item removido"}</b><small>{item?.codigo_item ?? "—"}</small></span><span>{item?.categoria ?? "—"}</span><span>{decimal(insumo.quantidade_prevista, 3)} {item?.codigo_unidade ?? ""}</span><span>{moeda(numero(insumo.quantidade_prevista) * (custoPorItem.get(insumo.id_item) ?? 0))}</span><span className="ingredient-actions">⠿　⌫</span></summary><div className="ingredient-edit-row"><form action={editarInsumo}><input type="hidden" name="id" value={insumo.id} /><input type="hidden" name="id_versao_receita" value={versaoSelecionada?.id ?? ""} /><label className="form-field"><span>Etapa</span><select name="etapa" defaultValue={insumo.etapa}><option value="planejamento">Planejamento</option><option value="mostura">Mostura</option><option value="fervura">Fervura</option><option value="fermentacao">Fermentação</option><option value="envase">Envase</option></select></label><label className="form-field"><span>Quantidade</span><input name="quantidade_prevista" type="number" min="0.001" step="0.001" defaultValue={numero(insumo.quantidade_prevista)} required /></label><label className="form-field"><span>Ordem</span><input name="ordem" type="number" min="0" step="1" defaultValue={insumo.ordem} /></label><button className="button secondary" type="submit">Salvar</button></form><form action={removerInsumo}><input type="hidden" name="id" value={insumo.id} /><input type="hidden" name="id_versao_receita" value={versaoSelecionada?.id ?? ""} /><button className="text-danger-button" type="submit">Remover insumo</button></form></div></details>; }) : <div className="ingredient-empty">Nenhum ingrediente adicionado nesta categoria.</div>}{versaoSelecionada ? <details className="ingredient-add-control"><summary className="ingredient-add-link">＋ &nbsp; {grupo.acao}</summary><form action={adicionarInsumo}><input type="hidden" name="id_versao_receita" value={versaoSelecionada.id} /><label className="form-field"><span>Ingrediente</span><select name="id_item" required defaultValue=""><option value="" disabled>Selecione</option>{itensDisponiveisDoGrupo.map((item) => <option value={item.id} key={item.id}>{item.codigo_item} · {item.nome}</option>)}</select></label><label className="form-field"><span>Etapa</span><select name="etapa" defaultValue={grupo.id === "maltes" ? "mostura" : grupo.id === "lupulos" ? "fervura" : "fermentacao"}><option value="mostura">Mostura</option><option value="fervura">Fervura</option><option value="fermentacao">Fermentação</option><option value="envase">Envase</option></select></label><label className="form-field"><span>Quantidade</span><input name="quantidade_prevista" type="number" min="0.001" step="0.001" required /></label><label className="form-field"><span>Ordem</span><input name="ordem" type="number" min="0" step="1" defaultValue="10" /></label><button className="button primary" type="submit">Adicionar</button></form></details> : <span className="ingredient-add-link muted">Salve a receita para adicionar</span>}</div>; })}</section>

      <section className="recipe-card recipe-process-card"><div className="recipe-card-heading"><div><span className="recipe-heading-icon">☷</span><div><h2>Etapas do processo</h2><p>Configure o processo de produção desta receita</p></div></div><span className="recipe-config-link">⚙ &nbsp; Configurar etapas</span></div><div className="process-flow"><div><b>♧</b><span><strong>Mostura</strong><small>67 °C · 60 min</small></span></div><i>›</i><div><b>♨</b><span><strong>Fervura</strong><small>60 min</small></span></div><i>›</i><div><b>♨</b><span><strong>Fermentação</strong><small>19 °C · 5 dias</small></span></div><i>›</i><div><b>▣</b><span><strong>Envase</strong><small>A definir</small></span></div></div></section>
    </div>

    <aside className="recipe-summary-card"><div className="summary-title"><span className="summary-beer-icon">🍺</span><div><p className="eyebrow">Resumo da receita</p><h2>{receitaSelecionada?.nome ?? "Nova receita"}</h2><p>{receitaSelecionada?.estilo ?? "Escolha um estilo"}</p></div></div><div className="summary-metrics"><div><span>OG</span><strong>{versaoSelecionada?.og_previsto ? decimal(versaoSelecionada.og_previsto, 3) : "—"}</strong></div><div><span>FG</span><strong>{versaoSelecionada?.fg_previsto ? decimal(versaoSelecionada.fg_previsto, 3) : "—"}</strong></div><div><span>ABV</span><strong>{versaoSelecionada?.abv_previsto ? `${decimal(versaoSelecionada.abv_previsto, 1)}%` : "—"}</strong></div><div><span>IBU</span><strong>{versaoSelecionada?.ibu_previsto ? decimal(versaoSelecionada.ibu_previsto, 0) : "—"}</strong></div></div><div className="summary-color"><span>●</span><strong>Cor estimada<br /><b>— EBC</b></strong><i /><p>Defina a receita para estimar cor, aroma e amargor.</p></div><div className="summary-costs"><h3>♧ &nbsp; Custos estimados</h3><p><span>Ingredientes</span><b>{custoIngredientes ? moeda(custoIngredientes) : "—"}</b></p><p><span>Embalagens</span><b>—</b></p><div><span>Custo total estimado</span><strong>{custoIngredientes ? moeda(custoIngredientes) : "A calcular"}</strong></div><p className="summary-cost-per-liter"><span>Custo por litro</span><b>{custoPorLitro ? `${moeda(custoPorLitro)} / L` : "—"}</b></p></div><div className={`summary-stock ${itensDisponiveis ? "available" : "pending"}`}><span>{itensDisponiveis ? "✓" : "○"}</span><strong>{itensDisponiveis ? "Todos os ingredientes estão disponíveis em estoque" : "Revise os ingredientes e o estoque"}</strong></div><div className="summary-checklist"><h3>☷ &nbsp; Antes de salvar</h3><p className={receitaNova ? "pending" : "done"}><b>{receitaNova ? "○" : "✓"}</b> Informações básicas</p><p className={insumosDaVersao.length ? "done" : "pending"}><b>{insumosDaVersao.length ? "✓" : "○"}</b> Ingredientes</p><p className="pending"><b>○</b> Etapas do processo</p><p className="pending"><b>○</b> Custos revisados</p></div></aside></div>

    {listaReceitas.length ? <details className="recipe-catalog"><summary>Receitas cadastradas ({listaReceitas.length})</summary><div>{listaReceitas.map((receita) => <Link href={linkReceita(receita.id)} key={receita.id}>{receita.nome} <span>{receita.ativo ? "Ativa" : "Inativa"}</span></Link>)}</div></details> : null}
  </section></main></AppShell>;
}
