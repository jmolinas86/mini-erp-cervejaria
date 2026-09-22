import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { adicionarInsumo, alternarReceita, criarReceita, criarVersao, editarInsumo, removerInsumo } from "./actions";

export const dynamic = "force-dynamic";

type Receita = { id: string; nome: string; estilo: string | null; volume_previsto_litros: number | string; observacoes: string | null; ativo: boolean };
type Versao = { id: string; id_receita: string; numero_versao: number; og_previsto: number | string | null; fg_previsto: number | string | null; abv_previsto: number | string | null; ibu_previsto: number | string | null; observacoes: string | null; ativo: boolean };
type Insumo = { id: string; id_versao_receita: string; id_item: string; etapa: string; quantidade_prevista: number | string; ordem: number; observacoes: string | null };
type Item = { id: string; nome: string; codigo_item: string; categoria: string; codigo_unidade: string; tipo: string; ativo: boolean };

const etapaLabel: Record<string, string> = { planejamento: "Planejamento", mostura: "Mostura", fervura: "Fervura", fermentacao: "Fermentação", envase: "Envase" };

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number | string | null | undefined, digits = 2) {
  return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function ReceitasPage({ searchParams }: { searchParams: Promise<{ receita?: string; versao?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=%2Freceitas");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const [{ data: receitas, error: erroReceitas }, { data: versoes }, { data: insumos }, { data: itens }] = await Promise.all([
    supabase.from("receitas").select("id,nome,estilo,volume_previsto_litros,observacoes,ativo").order("ativo", { ascending: false }).order("nome"),
    supabase.from("versoes_receitas").select("id,id_receita,numero_versao,og_previsto,fg_previsto,abv_previsto,ibu_previsto,observacoes,ativo").order("numero_versao", { ascending: false }),
    supabase.from("insumos_receita").select("id,id_versao_receita,id_item,etapa,quantidade_prevista,ordem,observacoes").order("ordem"),
    supabase.from("itens").select("id,nome,codigo_item,categoria,codigo_unidade,tipo,ativo").eq("ativo", true).eq("tipo", "ingrediente").order("nome")
  ]);

  const listaReceitas = (receitas ?? []) as Receita[];
  const listaVersoes = (versoes ?? []) as Versao[];
  const listaInsumos = (insumos ?? []) as Insumo[];
  const listaItens = (itens ?? []) as Item[];
  const itemPorId = new Map(listaItens.map((item) => [item.id, item]));
  const receitaSelecionada = (params.receita ? listaReceitas.find((receita) => receita.id === params.receita) : null) ?? listaReceitas[0] ?? null;
  const versoesDaReceita = receitaSelecionada ? listaVersoes.filter((versao) => versao.id_receita === receitaSelecionada.id) : [];
  const versaoSelecionada = (params.versao ? versoesDaReceita.find((versao) => versao.id === params.versao) : null) ?? versoesDaReceita[0] ?? null;
  const insumosDaVersao = versaoSelecionada ? listaInsumos.filter((insumo) => insumo.id_versao_receita === versaoSelecionada.id) : [];
  const linkReceita = (id: string, versao?: string) => `/receitas?receita=${id}${versao ? `&versao=${versao}` : ""}`;

  return <AppShell active="receitas" userEmail={email}><main className="page-shell"><section className="page-content">
    <div className="page-header"><div><p className="eyebrow">Fase 7 · Receitas</p><h1>Receitas da cervejaria.</h1><p className="intro">Organize versões, metas e insumos previstos para cada brassagem.</p></div><div className="page-header-actions"><Link className="button secondary" href="/">Painel</Link><Link className="button secondary" href="/estoque">Estoque</Link></div></div>
    {params.error ? <p className="form-message error">{params.error}</p> : null}{params.message ? <p className="form-message success">{params.message}</p> : null}{erroReceitas ? <p className="form-message error">Não foi possível carregar as receitas.</p> : null}

    <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Novo registro</p><h2>Cadastrar receita</h2><p className="section-help">A primeira versão é criada automaticamente junto com a receita.</p></div><span className="status-pill configured">{listaReceitas.length} receitas</span></div><form className="form-grid" action={criarReceita}><label className="form-field"><span>Nome *</span><input name="nome" required placeholder="Ex.: IPA Citra 20 L" /></label><label className="form-field"><span>Estilo</span><input name="estilo" placeholder="Ex.: American IPA" /></label><label className="form-field"><span>Volume previsto (L) *</span><input name="volume_previsto_litros" type="number" min="0.001" step="0.001" required placeholder="20" /></label><label className="form-field"><span>OG prevista</span><input name="og_previsto" type="number" min="0.9" max="2" step="0.001" placeholder="1.060" /></label><label className="form-field"><span>FG prevista</span><input name="fg_previsto" type="number" min="0.9" max="2" step="0.001" placeholder="1.012" /></label><label className="form-field"><span>ABV previsto (%)</span><input name="abv_previsto" type="number" min="0" step="0.01" placeholder="6,3" /></label><label className="form-field"><span>IBU previsto</span><input name="ibu_previsto" type="number" min="0" step="0.01" placeholder="60" /></label><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Perfil, cuidados ou notas da receita" /></label><div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar receita</button></div></form></section>

    <div className="recipe-layout"><section className="panel-card recipe-list-card"><div className="section-header"><div><p className="eyebrow">Catálogo</p><h2>Receitas cadastradas</h2></div><span className="status-pill configured">{listaReceitas.filter((receita) => receita.ativo).length} ativas</span></div>{listaReceitas.length ? <div className="recipe-list">{listaReceitas.map((receita) => { const primeiraVersao = listaVersoes.find((versao) => versao.id_receita === receita.id); const selecionada = receita.id === receitaSelecionada?.id; return <Link className={`recipe-list-item ${selecionada ? "selected" : ""}`} href={linkReceita(receita.id, primeiraVersao?.id)} key={receita.id}><span className="recipe-list-icon">♨</span><span><strong>{receita.nome}</strong><small>{receita.estilo || "Estilo não informado"} · {decimal(receita.volume_previsto_litros, 1)} L</small></span><span className={`table-pill ${receita.ativo ? "ok" : "inativo"}`}>{receita.ativo ? "Ativa" : "Inativa"}</span></Link>; })}</div> : <p className="detail-empty">Nenhuma receita cadastrada ainda.</p>}</section>

      <aside className="panel-card recipe-detail-card">{receitaSelecionada && versaoSelecionada ? <><div className="recipe-detail-heading"><div><p className="eyebrow">Receita selecionada</p><h2>{receitaSelecionada.nome}</h2><p>{receitaSelecionada.estilo || "Estilo não informado"} · {decimal(receitaSelecionada.volume_previsto_litros, 1)} L</p></div><form action={alternarReceita}><input type="hidden" name="id" value={receitaSelecionada.id} /><input type="hidden" name="ativo" value={String(!receitaSelecionada.ativo)} /><button className="button secondary" type="submit">{receitaSelecionada.ativo ? "Inativar" : "Reativar"}</button></form></div>
        <div className="recipe-version-tabs">{versoesDaReceita.map((versao) => <Link className={versao.id === versaoSelecionada.id ? "active" : ""} href={linkReceita(receitaSelecionada.id, versao.id)} key={versao.id}>Versão {versao.numero_versao}</Link>)}<details className="recipe-version-details"><summary>＋ Nova versão</summary><form className="details-form" action={criarVersao}><input type="hidden" name="id_receita" value={receitaSelecionada.id} /><label className="form-field"><span>OG prevista</span><input name="og_previsto" type="number" min="0.9" max="2" step="0.001" /></label><label className="form-field"><span>FG prevista</span><input name="fg_previsto" type="number" min="0.9" max="2" step="0.001" /></label><label className="form-field"><span>ABV previsto (%)</span><input name="abv_previsto" type="number" min="0" step="0.01" /></label><label className="form-field"><span>IBU previsto</span><input name="ibu_previsto" type="number" min="0" step="0.01" /></label><button className="button primary" type="submit">Criar versão</button></form></details></div>
        <div className="recipe-metrics"><div><span>OG</span><strong>{versaoSelecionada.og_previsto ? decimal(versaoSelecionada.og_previsto, 3) : "—"}</strong></div><div><span>FG</span><strong>{versaoSelecionada.fg_previsto ? decimal(versaoSelecionada.fg_previsto, 3) : "—"}</strong></div><div><span>ABV</span><strong>{versaoSelecionada.abv_previsto ? `${decimal(versaoSelecionada.abv_previsto, 2)}%` : "—"}</strong></div><div><span>IBU</span><strong>{versaoSelecionada.ibu_previsto ? decimal(versaoSelecionada.ibu_previsto, 0) : "—"}</strong></div></div>
        <div className="recipe-section-heading"><div><p className="eyebrow">Composição</p><h3>Insumos previstos · versão {versaoSelecionada.numero_versao}</h3></div><span>{insumosDaVersao.length} itens</span></div>
        {insumosDaVersao.length ? <div className="recipe-input-list">{insumosDaVersao.map((insumo) => { const item = itemPorId.get(insumo.id_item); return <details className="recipe-input-row" key={insumo.id}><summary><span className="recipe-input-name"><strong>{item?.nome ?? "Item removido"}</strong><small>{item?.codigo_item ?? "—"} · {etapaLabel[insumo.etapa] ?? insumo.etapa}</small></span><b>{decimal(insumo.quantidade_prevista, 3)} {item?.codigo_unidade ?? ""}</b></summary><div className="recipe-input-edit"><form action={editarInsumo}><input type="hidden" name="id" value={insumo.id} /><input type="hidden" name="id_versao_receita" value={versaoSelecionada.id} /><label className="form-field"><span>Etapa</span><select name="etapa" defaultValue={insumo.etapa}><option value="planejamento">Planejamento</option><option value="mostura">Mostura</option><option value="fervura">Fervura</option><option value="fermentacao">Fermentação</option><option value="envase">Envase</option></select></label><label className="form-field"><span>Quantidade ({item?.codigo_unidade ?? "unidade"})</span><input name="quantidade_prevista" type="number" min="0.001" step="0.001" defaultValue={numero(insumo.quantidade_prevista)} required /></label><label className="form-field"><span>Ordem</span><input name="ordem" type="number" min="0" step="1" defaultValue={insumo.ordem} /></label><button className="button secondary" type="submit">Salvar</button></form><form action={removerInsumo}><input type="hidden" name="id" value={insumo.id} /><input type="hidden" name="id_versao_receita" value={versaoSelecionada.id} /><button className="text-danger-button" type="submit">Remover insumo</button></form></div></details>; })}</div> : <p className="detail-empty">Adicione os insumos previstos para começar a montar esta receita.</p>}
        <form className="recipe-add-input" action={adicionarInsumo}><input type="hidden" name="id_versao_receita" value={versaoSelecionada.id} /><label className="form-field"><span>Insumo</span><select name="id_item" required defaultValue=""><option value="" disabled>Selecione um ingrediente</option>{listaItens.map((item) => <option value={item.id} key={item.id}>{item.codigo_item} · {item.nome} ({item.codigo_unidade})</option>)}</select></label><label className="form-field"><span>Etapa</span><select name="etapa" defaultValue="planejamento"><option value="planejamento">Planejamento</option><option value="mostura">Mostura</option><option value="fervura">Fervura</option><option value="fermentacao">Fermentação</option><option value="envase">Envase</option></select></label><label className="form-field"><span>Quantidade</span><input name="quantidade_prevista" type="number" min="0.001" step="0.001" required placeholder="0,000" /></label><label className="form-field"><span>Ordem</span><input name="ordem" type="number" min="0" step="1" defaultValue="10" /></label><div className="form-actions"><button className="button primary" type="submit">＋ Adicionar insumo</button></div></form>
      </> : <div className="recipe-empty"><strong>Crie sua primeira receita</strong><span>A receita aparecerá aqui com suas versões e composição.</span></div>}</aside>
    </div>
  </section></main></AppShell>;
}
