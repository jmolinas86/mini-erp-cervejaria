import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { alternarItem, criarItem, editarItem } from "./actions";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  nome: string;
  codigo_item: string;
  codigo_grupo: string;
  tipo: "ingrediente" | "embalagem" | "produto_acabado";
  categoria: string;
  codigo_unidade: string;
  estoque_minimo: number | string;
  custo_referencia: number | string | null;
  observacoes: string | null;
  imagem_url: string | null;
  ativo: boolean;
};

type Unidade = { codigo: string; nome: string; casas_decimais: number };
type Grupo = { codigo: string; nome: string; codigo_categoria: string };

const tipoLabel: Record<Item["tipo"], string> = {
  ingrediente: "Ingrediente",
  embalagem: "Embalagem",
  produto_acabado: "Produto acabado"
};

function valor(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function FormularioEdicaoItem({ item, listaGrupos, listaUnidades, categoriaGrupo, fecharHref }: { item: Item; listaGrupos: Grupo[]; listaUnidades: Unidade[]; categoriaGrupo: Map<string, string>; fecharHref: string }) {
  return <form className="form-grid item-edit-form" action={editarItem} encType="multipart/form-data">
    <input type="hidden" name="id" value={item.id} />
    <label className="form-field"><span>Código do item</span><input name="codigo_item" defaultValue={item.codigo_item} readOnly /></label>
    <label className="form-field"><span>Nome</span><input name="nome" defaultValue={item.nome} required /></label>
    <label className="form-field"><span>Tipo</span><select name="tipo" defaultValue={item.tipo}>{Object.entries(tipoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="form-field"><span>Grupo</span><select name="codigo_grupo" defaultValue={item.codigo_grupo}>{listaGrupos.map((grupo) => <option value={grupo.codigo} key={grupo.codigo}>{grupo.codigo} · {grupo.nome} ({categoriaGrupo.get(grupo.codigo_categoria) ?? grupo.codigo_categoria})</option>)}</select></label>
    <label className="form-field"><span>Unidade</span><select name="codigo_unidade" defaultValue={item.codigo_unidade}>{listaUnidades.map((unidade) => <option key={unidade.codigo} value={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label>
    <label className="form-field"><span>Estoque mínimo</span><input name="estoque_minimo" type="number" min="0" step="0.001" defaultValue={valor(item.estoque_minimo)} required /></label>
    <label className="form-field"><span>Custo referência</span><input name="custo_referencia" type="number" min="0" step="0.0001" defaultValue={valor(item.custo_referencia)} /></label>
    <label className="form-field form-field-wide"><span>Substituir imagem</span><input name="imagem" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />{item.imagem_url ? <img className="item-edit-preview" src={item.imagem_url} alt={`Imagem atual de ${item.nome}`} /> : <small>Nenhuma imagem cadastrada.</small>}</label>
    <label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} defaultValue={item.observacoes ?? ""} /></label>
    <div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar alterações</button><Link className="button secondary" href={fecharHref}>Cancelar</Link></div>
  </form>;
}

export default async function ItensPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; editar?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Fitens");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;

  let itensQuery = supabase
    .from("itens")
    .select("id,nome,codigo_item,codigo_grupo,tipo,categoria,codigo_unidade,estoque_minimo,custo_referencia,observacoes,imagem_url,ativo")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  const busca = params.q?.trim();
  if (busca) itensQuery = itensQuery.or(`nome.ilike.%${busca}%,codigo_item.ilike.%${busca}%`);

  const [{ data: itens, error: erroItens }, { data: unidades, error: erroUnidades }, { data: grupos, error: erroGrupos }] = await Promise.all([
    itensQuery,
    supabase.from("unidades").select("codigo,nome,casas_decimais").order("codigo"),
    supabase.from("grupos_itens").select("codigo,nome,codigo_categoria").eq("ativo", true).order("nome")
  ]);

  const listaItens = (itens ?? []) as Item[];
  const listaUnidades = (unidades ?? []) as Unidade[];
  const listaGrupos = (grupos ?? []) as Grupo[];
  const erro = erroItens?.message ?? erroUnidades?.message ?? erroGrupos?.message;
  const categoriaGrupo = new Map([["ING", "Ingredientes"], ["EMB", "Embalagens"], ["PA", "Produtos acabados"]]);
  const maiorCodigoItem = listaItens.reduce((maior, item) => {
    const codigo = Number(item.codigo_item);
    return Number.isInteger(codigo) && codigo > maior ? codigo : maior;
  }, 0);
  const proximoCodigoItem = String(maiorCodigoItem + 1).padStart(4, "0");
  const itemEditando = params.editar ? listaItens.find((item) => item.id === params.editar) ?? null : null;
  const fecharEditarHref = params.q ? `/cadastros/itens?q=${encodeURIComponent(params.q)}` : "/cadastros/itens";
  const queryBusca = params.q ? `q=${encodeURIComponent(params.q)}&` : "";

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

        {itemEditando ? <div className="item-modal-backdrop"><section className="item-edit-modal" role="dialog" aria-modal="true" aria-labelledby="editar-item-titulo"><div className="item-modal-header"><div><p className="eyebrow">Catálogo de itens</p><h2 id="editar-item-titulo">Editar item</h2><p className="intro">Atualize os dados de {itemEditando.nome}.</p></div><Link className="item-modal-close" href={fecharEditarHref} aria-label="Fechar edição">×</Link></div><FormularioEdicaoItem item={itemEditando} listaGrupos={listaGrupos} listaUnidades={listaUnidades} categoriaGrupo={categoriaGrupo} fecharHref={fecharEditarHref} /></section></div> : null}

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Novo registro</p><h2>Cadastrar item</h2></div><span className="status-pill configured">{listaGrupos.length} grupos ativos</span></div>
          <form className="form-grid" action={criarItem} encType="multipart/form-data">
            <label className="form-field"><span>Nome *</span><input name="nome" required placeholder="Ex.: Malte Pilsen" /></label>
            <label className="form-field"><span>Código do item *</span><input name="codigo_item" required inputMode="numeric" pattern="[0-9]{4,12}" defaultValue={proximoCodigoItem} /><small>Gerado automaticamente a partir do maior código cadastrado; você pode editar.</small></label>
            <label className="form-field"><span>Tipo *</span><select name="tipo" required defaultValue="ingrediente">{Object.entries(tipoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="form-field"><span>Grupo *</span><select name="codigo_grupo" required defaultValue=""><option value="" disabled>Selecione o grupo</option>{listaGrupos.map((grupo) => <option value={grupo.codigo} key={grupo.codigo}>{grupo.codigo} · {grupo.nome} ({categoriaGrupo.get(grupo.codigo_categoria) ?? grupo.codigo_categoria})</option>)}</select></label>
            <label className="form-field"><span>Unidade *</span><select name="codigo_unidade" required defaultValue=""><option value="" disabled>Selecione</option>{listaUnidades.map((unidade) => <option key={unidade.codigo} value={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label>
            <label className="form-field"><span>Estoque mínimo *</span><input name="estoque_minimo" type="number" min="0" step="0.001" defaultValue="0" required /></label>
            <label className="form-field"><span>Custo de referência</span><input name="custo_referencia" type="number" min="0" step="0.0001" placeholder="0,00" /></label>
            <label className="form-field form-field-wide"><span>Imagem do item</span><input name="imagem" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><small>Opcional · JPG, PNG, WEBP ou GIF até 5 MB.</small></label>
            <label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Informações úteis para o uso do item" /></label>
            <div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar item</button></div>
          </form>
        </section>

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Catálogo atual</p><h2>{listaItens.length} itens encontrados</h2></div><form className="filter-form" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nome ou código" /><button className="button secondary" type="submit">Buscar</button></form></div>
          <div className="table-wrap"><table><thead><tr><th>Código / item</th><th>Grupo</th><th>Unidade</th><th>Mínimo</th><th>Custo ref.</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {listaItens.map((item) => <tr key={item.id}>
              <td><span className="item-catalog-cell">{item.imagem_url ? <img className="item-thumbnail" src={item.imagem_url} alt="" loading="lazy" /> : <span className="item-thumbnail item-thumbnail-placeholder">▣</span>}<span><strong>{item.codigo_item} · {item.nome}</strong><small>{tipoLabel[item.tipo]}</small></span></span></td><td>{item.codigo_grupo} · {item.categoria}</td><td>{item.codigo_unidade}</td><td>{valor(item.estoque_minimo)}</td><td>{item.custo_referencia === null ? "—" : `R$ ${valor(item.custo_referencia)}`}</td><td><span className={`table-pill ${item.ativo ? "ok" : "inativo"}`}>{item.ativo ? "Ativo" : "Inativo"}</span></td>
              <td><div className="table-actions"><Link className="button secondary" href={`/cadastros/itens?${queryBusca}editar=${item.id}`}>Editar</Link><form className="inline-form" action={alternarItem}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="ativo" value={String(!item.ativo)} /><button className="button secondary" type="submit">{item.ativo ? "Inativar item" : "Reativar item"}</button></form></div></td>
            </tr>)}
          </tbody></table></div>
        </section>
      </section>
    </main>
    </AppShell>
  );
}
