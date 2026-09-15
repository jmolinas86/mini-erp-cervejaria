import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { alternarItem, criarItem, editarItem } from "./actions";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  nome: string;
  tipo: "ingrediente" | "embalagem" | "produto_acabado";
  categoria: string;
  codigo_unidade: string;
  estoque_minimo: number | string;
  custo_referencia: number | string | null;
  observacoes: string | null;
  ativo: boolean;
};

type Unidade = { codigo: string; nome: string; casas_decimais: number };

const tipoLabel: Record<Item["tipo"], string> = {
  ingrediente: "Ingrediente",
  embalagem: "Embalagem",
  produto_acabado: "Produto acabado"
};

function valor(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export default async function ItensPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Fitens");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;

  let itensQuery = supabase
    .from("itens")
    .select("id,nome,tipo,categoria,codigo_unidade,estoque_minimo,custo_referencia,observacoes,ativo")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  const busca = params.q?.trim();
  if (busca) itensQuery = itensQuery.ilike("nome", `%${busca}%`);

  const [{ data: itens, error: erroItens }, { data: unidades, error: erroUnidades }] = await Promise.all([
    itensQuery,
    supabase.from("unidades").select("codigo,nome,casas_decimais").order("codigo")
  ]);

  const listaItens = (itens ?? []) as Item[];
  const listaUnidades = (unidades ?? []) as Unidade[];
  const erro = erroItens?.message ?? erroUnidades?.message;

  return (
    <AppShell active="cadastros" userEmail={email}>
    <main className="page-shell">
      <section className="page-content">
        <div className="page-header">
          <div><p className="eyebrow">Cadastros · Itens</p><h1>Catálogo de itens.</h1><p className="intro">Mantenha insumos, embalagens e produtos acabados prontos para o estoque e as receitas.</p></div>
          <div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/">Painel</Link></div>
        </div>

        {params.error ? <p className="form-message error">{params.error}</p> : null}
        {params.message ? <p className="form-message success">{params.message}</p> : null}
        {erro ? <p className="form-message error">Não foi possível carregar os dados do cadastro.</p> : null}

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Novo registro</p><h2>Cadastrar item</h2></div><span className="status-pill configured">{listaUnidades.length} unidades disponíveis</span></div>
          <form className="form-grid" action={criarItem}>
            <label className="form-field"><span>Nome *</span><input name="nome" required placeholder="Ex.: Malte Pilsen" /></label>
            <label className="form-field"><span>Tipo *</span><select name="tipo" required defaultValue="ingrediente">{Object.entries(tipoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="form-field"><span>Categoria *</span><input name="categoria" required placeholder="Ex.: Malte" /></label>
            <label className="form-field"><span>Unidade *</span><select name="codigo_unidade" required defaultValue=""><option value="" disabled>Selecione</option>{listaUnidades.map((unidade) => <option key={unidade.codigo} value={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label>
            <label className="form-field"><span>Estoque mínimo *</span><input name="estoque_minimo" type="number" min="0" step="0.001" defaultValue="0" required /></label>
            <label className="form-field"><span>Custo de referência</span><input name="custo_referencia" type="number" min="0" step="0.0001" placeholder="0,00" /></label>
            <label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Informações úteis para o uso do item" /></label>
            <div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar item</button></div>
          </form>
        </section>

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Catálogo atual</p><h2>{listaItens.length} itens encontrados</h2></div><form className="filter-form" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nome" /><button className="button secondary" type="submit">Buscar</button></form></div>
          <div className="table-wrap"><table><thead><tr><th>Item</th><th>Tipo</th><th>Unidade</th><th>Mínimo</th><th>Custo ref.</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {listaItens.map((item) => <tr key={item.id}>
              <td><strong>{item.nome}</strong><span>{item.categoria}</span></td><td>{tipoLabel[item.tipo]}</td><td>{item.codigo_unidade}</td><td>{valor(item.estoque_minimo)}</td><td>{item.custo_referencia === null ? "—" : `R$ ${valor(item.custo_referencia)}`}</td><td><span className={`table-pill ${item.ativo ? "ok" : "inativo"}`}>{item.ativo ? "Ativo" : "Inativo"}</span></td>
              <td><details className="row-details"><summary>Editar</summary><form className="details-form" action={editarItem}><input type="hidden" name="id" value={item.id} /><label className="form-field"><span>Nome</span><input name="nome" defaultValue={item.nome} required /></label><label className="form-field"><span>Tipo</span><select name="tipo" defaultValue={item.tipo}>{Object.entries(tipoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field"><span>Categoria</span><input name="categoria" defaultValue={item.categoria} required /></label><label className="form-field"><span>Unidade</span><select name="codigo_unidade" defaultValue={item.codigo_unidade}>{listaUnidades.map((unidade) => <option key={unidade.codigo} value={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label><label className="form-field"><span>Estoque mínimo</span><input name="estoque_minimo" type="number" min="0" step="0.001" defaultValue={valor(item.estoque_minimo)} required /></label><label className="form-field"><span>Custo referência</span><input name="custo_referencia" type="number" min="0" step="0.0001" defaultValue={valor(item.custo_referencia)} /></label><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} defaultValue={item.observacoes ?? ""} /></label><button className="button primary" type="submit">Salvar alterações</button></form><form className="inline-form" action={alternarItem}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="ativo" value={String(!item.ativo)} /><button className="button secondary" type="submit">{item.ativo ? "Inativar item" : "Reativar item"}</button></form></details></td>
            </tr>)}
          </tbody></table></div>
        </section>
      </section>
    </main>
    </AppShell>
  );
}
