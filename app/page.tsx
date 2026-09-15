import { SupabaseStatus } from "@/components/supabase-status";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SaldoEstoque = {
  id_item: string;
  nome_item: string;
  tipo_item: string;
  categoria: string | null;
  codigo_unidade: string;
  codigo_lote: string | null;
  validade: string | null;
  quantidade_saldo: number | string | null;
  estoque_minimo: number | string | null;
  status_estoque: string;
};

type BrassagemResumo = {
  id: string;
  numero_brassagem: string;
  status: string;
  etapa_atual: string;
  volume_previsto_litros: number | string;
  volume_final_litros: number | string | null;
  iniciada_em: string | null;
};

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number | string | null | undefined, digits = 1) {
  return numero(value).toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function dataCurta(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function rotuloStatus(value: string) {
  const labels: Record<string, string> = {
    abaixo_minimo: "Abaixo do mínimo",
    cancelada: "Cancelada",
    em_andamento: "Em andamento",
    finalizada: "Finalizada",
    ok: "OK",
    rascunho: "Rascunho",
    vazio: "Vazio"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const [
    { data: saldos, error: erroSaldos },
    { data: brassagens, error: erroBrassagens }
  ] = await Promise.all([
    supabase
      .from("vw_saldos_estoque")
      .select(
        "id_item,nome_item,tipo_item,categoria,codigo_unidade,codigo_lote,validade,quantidade_saldo,estoque_minimo,status_estoque"
      )
      .order("status_estoque", { ascending: true })
      .order("nome_item", { ascending: true })
      .limit(8),
    supabase
      .from("brassagens")
      .select(
        "id,numero_brassagem,status,etapa_atual,volume_previsto_litros,volume_final_litros,iniciada_em"
      )
      .order("iniciada_em", { ascending: false })
      .limit(5)
  ]);

  const saldosEstoque = (saldos ?? []) as SaldoEstoque[];
  const brassagensResumo = (brassagens ?? []) as BrassagemResumo[];
  const itensUnicos = new Set(saldosEstoque.map((saldo) => saldo.id_item)).size;
  const itensCriticos = saldosEstoque.filter(
    (saldo) => saldo.status_estoque !== "ok"
  ).length;
  const brassagensAbertas = brassagensResumo.filter(
    (brassagem) =>
      !["finalizada", "cancelada"].includes(brassagem.status)
  ).length;
  const erros = [erroSaldos?.message, erroBrassagens?.message].filter(Boolean);

  return (
    <AppShell active="painel" userEmail={email}>
    <main className="page-shell">
      <section className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Mini ERP Cervejaria</p>
            <h1>Painel inicial da operação.</h1>
            <p className="intro">
              Sessão autenticada como {email}. Esta tela já lê dados reais do
              Supabase com as tabelas em português.
            </p>
          </div>
          <div className="page-header-actions">
            <Link className="button secondary" href="/cadastros">
              Cadastros
            </Link>
            <form action="/auth/signout" method="post">
              <button className="button secondary" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>

        <div className="card-grid">
          <div className="dark-card">
            <p className="card-label">Itens com saldo</p>
            <p className="card-title">{itensUnicos}</p>
            <p className="card-text">Insumos e embalagens vindos da view de estoque.</p>
          </div>
          <div className="dark-card">
            <p className="card-label">Estoque crítico</p>
            <p className="card-title">{itensCriticos}</p>
            <p className="card-text">Itens vazios ou abaixo do mínimo configurado.</p>
          </div>
          <div className="dark-card">
            <p className="card-label">Brassagens abertas</p>
            <p className="card-title">{brassagensAbertas}</p>
            <p className="card-text">
              Produções ainda em rascunho ou em andamento.
            </p>
          </div>
        </div>

        {erros.length > 0 ? (
          <section className="alert-card">
            <p className="card-label">Atenção</p>
            <h2>Não foi possível carregar todos os dados.</h2>
            <p>{erros.join(" ")}</p>
          </section>
        ) : null}

        <section className="panel-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Estoque</p>
              <h2>Saldos por lote</h2>
            </div>
            <span className="status-pill configured">Consulta autenticada</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Lote</th>
                  <th>Saldo</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {saldosEstoque.map((saldo) => (
                  <tr key={`${saldo.id_item}-${saldo.codigo_lote ?? "sem-lote"}`}>
                    <td>
                      <strong>{saldo.nome_item}</strong>
                      <span>{saldo.categoria ?? rotuloStatus(saldo.tipo_item)}</span>
                    </td>
                    <td>{saldo.codigo_lote ?? "Sem lote"}</td>
                    <td>
                      {decimal(saldo.quantidade_saldo, 3)} {saldo.codigo_unidade}
                    </td>
                    <td>
                      {decimal(saldo.estoque_minimo, 3)} {saldo.codigo_unidade}
                    </td>
                    <td>
                      <span className={`table-pill ${saldo.status_estoque}`}>
                        {rotuloStatus(saldo.status_estoque)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Produção</p>
              <h2>Brassagens recentes</h2>
            </div>
          </div>

          <div className="batch-list">
            {brassagensResumo.map((brassagem) => (
              <article className="batch-card" key={brassagem.id}>
                <div>
                  <p className="card-label">{dataCurta(brassagem.iniciada_em)}</p>
                  <h3>{brassagem.numero_brassagem}</h3>
                  <p>
                    {rotuloStatus(brassagem.status)} ·{" "}
                    {rotuloStatus(brassagem.etapa_atual)}
                  </p>
                </div>
                <div className="batch-volume">
                  <strong>
                    {decimal(
                      brassagem.volume_final_litros ??
                        brassagem.volume_previsto_litros,
                      1
                    )}{" "}
                    L
                  </strong>
                  <span>
                    {brassagem.volume_final_litros ? "Volume final" : "Previsto"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SupabaseStatus />
      </section>
    </main>
    </AppShell>
  );
}
