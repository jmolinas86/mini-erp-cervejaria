import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { alternarGrupo, criarGrupo, editarGrupo } from "./actions";

export const dynamic = "force-dynamic";
type Grupo = { codigo: string; nome: string; codigo_categoria: string; ativo: boolean };
type Categoria = { codigo: string; nome: string };

export default async function GruposPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Fgrupos");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;
  const [{ data: grupos, error }, { data: categorias }] = await Promise.all([
    supabase.from("grupos_itens").select("codigo,nome,codigo_categoria,ativo").order("ativo", { ascending: false }).order("nome"),
    supabase.from("categorias_itens").select("codigo,nome").eq("ativo", true).order("nome")
  ]);
  const lista = (grupos ?? []) as Grupo[];
  const listaCategorias = (categorias ?? []) as Categoria[];
  const categoriaNome = new Map(listaCategorias.map((categoria) => [categoria.codigo, categoria.nome]));

  return <AppShell active="cadastros" userEmail={email}><main className="page-shell"><section className="page-content"><div className="page-header"><div><p className="eyebrow">Cadastros · Grupos</p><h1>Organização do catálogo.</h1><p className="intro">Cada grupo pertence a uma categoria e pode ser usado como referência nos itens, lotes e movimentações.</p></div><div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/cadastros/itens">Itens</Link></div></div>{params.error ? <p className="form-message error">{params.error}</p> : null}{params.message ? <p className="form-message success">{params.message}</p> : null}{error ? <p className="form-message error">Não foi possível carregar os grupos.</p> : null}<section className="panel-card"><div className="section-header"><div><p className="eyebrow">Novo registro</p><h2>Cadastrar grupo</h2></div><span className="status-pill configured">{listaCategorias.length} categorias</span></div><form className="form-grid" action={criarGrupo}><label className="form-field"><span>Código do grupo *</span><input name="codigo" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,20}" placeholder="Ex.: MAL" /></label><label className="form-field"><span>Nome *</span><input name="nome" required placeholder="Ex.: Malte" /></label><label className="form-field"><span>Categoria *</span><select name="codigo_categoria" required defaultValue=""><option value="" disabled>Selecione a categoria</option>{listaCategorias.map((categoria) => <option value={categoria.codigo} key={categoria.codigo}>{categoria.codigo} · {categoria.nome}</option>)}</select></label><div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar grupo</button></div></form></section><section className="panel-card"><div className="section-header"><div><p className="eyebrow">Lista atual</p><h2>{lista.length} grupos encontrados</h2></div></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Grupo</th><th>Categoria</th><th>Status</th><th>Ações</th></tr></thead><tbody>{lista.map((grupo) => <tr key={grupo.codigo}><td><strong>{grupo.codigo}</strong></td><td>{grupo.nome}</td><td>{grupo.codigo_categoria} · {categoriaNome.get(grupo.codigo_categoria) ?? "—"}</td><td><span className={`table-pill ${grupo.ativo ? "ok" : "inativo"}`}>{grupo.ativo ? "Ativo" : "Inativo"}</span></td><td><details className="row-details"><summary>Editar</summary><form className="details-form" action={editarGrupo}><input type="hidden" name="codigo" value={grupo.codigo} /><label className="form-field"><span>Código do grupo</span><input value={grupo.codigo} readOnly /></label><label className="form-field"><span>Nome</span><input name="nome" defaultValue={grupo.nome} required /></label><label className="form-field"><span>Categoria</span><select name="codigo_categoria" defaultValue={grupo.codigo_categoria}>{listaCategorias.map((categoria) => <option value={categoria.codigo} key={categoria.codigo}>{categoria.codigo} · {categoria.nome}</option>)}</select></label><button className="button primary" type="submit">Salvar alterações</button></form><form className="inline-form" action={alternarGrupo}><input type="hidden" name="codigo" value={grupo.codigo} /><input type="hidden" name="ativo" value={String(!grupo.ativo)} /><button className="button secondary" type="submit">{grupo.ativo ? "Inativar grupo" : "Reativar grupo"}</button></form></details></td></tr>)}</tbody></table></div></section></section></main></AppShell>;
}
