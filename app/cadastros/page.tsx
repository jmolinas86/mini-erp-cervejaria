import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CadastrosPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login?next=%2Fcadastros");
  }

  const [{ count: totalItens }, { count: totalFornecedores }, { count: totalUnidades }] =
    await Promise.all([
      supabase.from("itens").select("id", { count: "exact", head: true }),
      supabase.from("fornecedores").select("id", { count: "exact", head: true }),
      supabase.from("unidades").select("codigo", { count: "exact", head: true })
    ]);

  return (
    <main className="page-shell">
      <section className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Fase 5 · Cadastros</p>
            <h1>Dados que alimentam a operação.</h1>
            <p className="intro">
              Cadastre insumos, embalagens, produtos e fornecedores antes de
              movimentar o estoque ou montar uma receita.
            </p>
          </div>
          <Link className="button secondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <div className="card-grid">
          <Link className="dark-card link-card" href="/cadastros/itens">
            <p className="card-label">Catálogo</p>
            <p className="card-title">{totalItens ?? 0} itens</p>
            <p className="card-text">Insumos, embalagens e produtos acabados com unidade e estoque mínimo.</p>
            <span className="card-link">Gerenciar itens →</span>
          </Link>
          <Link className="dark-card link-card" href="/cadastros/fornecedores">
            <p className="card-label">Compras</p>
            <p className="card-title">{totalFornecedores ?? 0} fornecedores</p>
            <p className="card-text">Contatos simples para registrar a origem dos lotes e acompanhar custos.</p>
            <span className="card-link">Gerenciar fornecedores →</span>
          </Link>
          <div className="dark-card">
            <p className="card-label">Unidades</p>
            <p className="card-title">{totalUnidades ?? 0} disponíveis</p>
            <p className="card-text">Unidades padrão do ERP, prontas para uso nos itens e receitas.</p>
            <span className="card-link muted-link">Consulta no cadastro de itens</span>
          </div>
        </div>

        <section className="panel-card">
          <div className="section-header"><div><p className="eyebrow">Próximo fluxo</p><h2>Ordem recomendada</h2></div></div>
          <ol className="step-list">
            <li><strong>Itens:</strong> cadastre os insumos e embalagens usados.</li>
            <li><strong>Fornecedores:</strong> registre quem fornece cada lote.</li>
            <li><strong>Estoque:</strong> na próxima fase, lance lotes e entradas.</li>
            <li><strong>Receitas:</strong> monte versões usando os itens ativos.</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
