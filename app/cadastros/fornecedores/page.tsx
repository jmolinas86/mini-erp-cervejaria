import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { alternarFornecedor, criarFornecedor, editarFornecedor } from "./actions";

export const dynamic = "force-dynamic";

type Fornecedor = {
  id: string;
  nome: string;
  nome_contato: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export default async function FornecedoresPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Ffornecedores");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;

  let fornecedoresQuery = supabase
    .from("fornecedores")
    .select("id,nome,nome_contato,email,telefone,observacoes,ativo")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });
  const busca = params.q?.trim();
  if (busca) fornecedoresQuery = fornecedoresQuery.ilike("nome", `%${busca}%`);
  const { data: fornecedores, error } = await fornecedoresQuery;
  const lista = (fornecedores ?? []) as Fornecedor[];

  return (
    <AppShell active="cadastros" userEmail={email}>
    <main className="page-shell">
      <section className="page-content">
        <div className="page-header">
          <div><p className="eyebrow">Cadastros · Fornecedores</p><h1>Parceiros de compra.</h1><p className="intro">Registre os fornecedores dos insumos e embalagens, com os contatos essenciais para a rotina da cervejaria.</p></div>
          <div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/">Painel</Link></div>
        </div>
        {params.error ? <p className="form-message error">{params.error}</p> : null}
        {params.message ? <p className="form-message success">{params.message}</p> : null}
        {error ? <p className="form-message error">Não foi possível carregar os fornecedores.</p> : null}

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Novo registro</p><h2>Cadastrar fornecedor</h2></div><span className="status-pill configured">Cadastro simples</span></div>
          <form className="form-grid" action={criarFornecedor}>
            <label className="form-field"><span>Nome *</span><input name="nome" required placeholder="Ex.: Casa do Malte" /></label>
            <label className="form-field"><span>Nome do contato</span><input name="nome_contato" placeholder="Ex.: João" /></label>
            <label className="form-field"><span>E-mail</span><input name="email" type="email" placeholder="contato@fornecedor.com" /></label>
            <label className="form-field"><span>Telefone</span><input name="telefone" placeholder="(00) 00000-0000" /></label>
            <label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Prazo, condição de pagamento ou outras notas" /></label>
            <div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar fornecedor</button></div>
          </form>
        </section>

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Lista atual</p><h2>{lista.length} fornecedores encontrados</h2></div><form className="filter-form" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nome" /><button className="button secondary" type="submit">Buscar</button></form></div>
          <div className="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Contato</th><th>E-mail</th><th>Telefone</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {lista.map((fornecedor) => <tr key={fornecedor.id}>
              <td><strong>{fornecedor.nome}</strong><span>{fornecedor.observacoes ?? "Sem observações"}</span></td><td>{fornecedor.nome_contato ?? "—"}</td><td>{fornecedor.email ?? "—"}</td><td>{fornecedor.telefone ?? "—"}</td><td><span className={`table-pill ${fornecedor.ativo ? "ok" : "inativo"}`}>{fornecedor.ativo ? "Ativo" : "Inativo"}</span></td>
              <td><details className="row-details"><summary>Editar</summary><form className="details-form" action={editarFornecedor}><input type="hidden" name="id" value={fornecedor.id} /><label className="form-field"><span>Nome</span><input name="nome" defaultValue={fornecedor.nome} required /></label><label className="form-field"><span>Nome do contato</span><input name="nome_contato" defaultValue={fornecedor.nome_contato ?? ""} /></label><label className="form-field"><span>E-mail</span><input name="email" type="email" defaultValue={fornecedor.email ?? ""} /></label><label className="form-field"><span>Telefone</span><input name="telefone" defaultValue={fornecedor.telefone ?? ""} /></label><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} defaultValue={fornecedor.observacoes ?? ""} /></label><button className="button primary" type="submit">Salvar alterações</button></form><form className="inline-form" action={alternarFornecedor}><input type="hidden" name="id" value={fornecedor.id} /><input type="hidden" name="ativo" value={String(!fornecedor.ativo)} /><button className="button secondary" type="submit">{fornecedor.ativo ? "Inativar fornecedor" : "Reativar fornecedor"}</button></form></details></td>
            </tr>)}
          </tbody></table></div>
        </section>
      </section>
    </main>
    </AppShell>
  );
}
