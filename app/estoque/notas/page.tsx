import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { decodificarEntidadesXmlBasicas } from "@/lib/nfe/xml";
import { createClient } from "@/lib/supabase/server";
import { importarXmlNfe } from "./actions";

export const dynamic = "force-dynamic";

type NotaEntrada = {
  id: string;
  status: string;
  chave_acesso: string | null;
  numero_documento: string | null;
  serie_documento: string | null;
  emitida_em: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_razao_social: string | null;
  valor_total: number | string;
  arquivo_nome: string | null;
  criado_em: string;
};

type ItemNota = {
  id: string;
  id_nota_entrada: string;
  numero_item: number;
  codigo_produto_fornecedor: string | null;
  descricao_produto: string;
  unidade_comercial: string;
  quantidade_comercial: number | string;
  valor_liquido: number | string;
  id_item: string | null;
};

function moeda(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return (Number.isFinite(number) ? number : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function decimal(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return (Number.isFinite(number) ? number : 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 6
  });
}

function data(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "—";
}

function cnpj(value: string | null) {
  if (!value || value.length !== 14) return value ?? "—";
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export default async function NotasEntradaPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; nota?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=%2Festoque%2Fnotas");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const { data: notasData, error: erroNotas } = await supabase
    .from("notas_entrada")
    .select("id,status,chave_acesso,numero_documento,serie_documento,emitida_em,fornecedor_cnpj,fornecedor_razao_social,valor_total,arquivo_nome,criado_em")
    .order("criado_em", { ascending: false })
    .limit(30);
  const notas = (notasData ?? []) as NotaEntrada[];
  const idsNotas = notas.map((nota) => nota.id);
  const { data: itensData } = idsNotas.length
    ? await supabase
        .from("itens_notas_entrada")
        .select("id,id_nota_entrada,numero_item,codigo_produto_fornecedor,descricao_produto,unidade_comercial,quantidade_comercial,valor_liquido,id_item")
        .in("id_nota_entrada", idsNotas)
        .order("numero_item")
    : { data: [] };
  const itens = (itensData ?? []) as ItemNota[];
  const itensPorNota = new Map<string, ItemNota[]>();
  for (const item of itens) {
    const atuais = itensPorNota.get(item.id_nota_entrada) ?? [];
    atuais.push(item);
    itensPorNota.set(item.id_nota_entrada, atuais);
  }

  return (
    <AppShell active="estoque" userEmail={email} contextLabel="Estoque" contextCurrent="Notas de entrada">
      <main className="page-shell invoice-page">
        <section className="page-content">
          <div className="invoice-header">
            <div>
              <p className="eyebrow">Compras · XML da NF-e</p>
              <h1>Notas de entrada</h1>
              <p className="intro">Importe o XML autorizado e confira os dados antes de alterar o estoque.</p>
            </div>
            <Link className="button secondary" href="/estoque">← Voltar ao estoque</Link>
          </div>

          {params.error ? <p className="form-message error">{params.error}</p> : null}
          {params.message ? <p className="form-message success">{params.message}</p> : null}
          {erroNotas ? <p className="form-message error">Não foi possível carregar as notas importadas.</p> : null}

          <section className="invoice-import-card">
            <div className="invoice-import-copy">
              <span className="invoice-import-icon" aria-hidden="true">XML</span>
              <div>
                <h2>Importar nota fiscal</h2>
                <p>Use o XML autorizado completo da NF-e ou NFC-e. O arquivo fica privado e a importação não movimenta o estoque.</p>
              </div>
            </div>
            <form action={importarXmlNfe} className="invoice-upload-form" encType="multipart/form-data">
              <label className="invoice-file-field">
                <span>Arquivo XML *</span>
                <input name="arquivo_xml" type="file" accept=".xml,application/xml,text/xml" required />
                <small>Somente XML autorizado, com até 5 MB.</small>
              </label>
              <button className="button primary" type="submit">Ler e salvar para conferência</button>
            </form>
            <ol className="invoice-flow">
              <li className="active"><b>1</b><span><strong>Importar</strong><small>Leitura do XML</small></span></li>
              <li><b>2</b><span><strong>Conferir</strong><small>Vincular itens e unidades</small></span></li>
              <li><b>3</b><span><strong>Confirmar</strong><small>Gerar lotes e entrada</small></span></li>
            </ol>
          </section>

          <section className="invoice-list-card">
            <div className="invoice-list-heading">
              <div>
                <h2>Notas importadas</h2>
                <p>As notas abaixo aguardam conferência. Nenhuma delas altera o saldo nesta fase.</p>
              </div>
              <span>{notas.length} {notas.length === 1 ? "nota" : "notas"}</span>
            </div>

            {notas.length ? <div className="invoice-list">{notas.map((nota) => {
              const itensNota = itensPorNota.get(nota.id) ?? [];
              const vinculados = itensNota.filter((item) => item.id_item).length;
              const aberta = params.nota === nota.id;
              return (
                <details className={`invoice-row ${aberta ? "selected" : ""}`} key={nota.id} open={aberta}>
                  <summary>
                    <span className="invoice-document-icon" aria-hidden="true">▤</span>
                    <span className="invoice-main-data">
                      <strong>{nota.fornecedor_razao_social ? decodificarEntidadesXmlBasicas(nota.fornecedor_razao_social) : "Fornecedor não informado"}</strong>
                      <small>CNPJ {cnpj(nota.fornecedor_cnpj)} · NF {nota.numero_documento ?? "—"} / Série {nota.serie_documento ?? "—"}</small>
                    </span>
                    <span><small>Emissão</small><strong>{data(nota.emitida_em)}</strong></span>
                    <span><small>Itens vinculados</small><strong>{vinculados} de {itensNota.length}</strong></span>
                    <span><small>Valor total</small><strong>{moeda(nota.valor_total)}</strong></span>
                    <span className={`invoice-status ${nota.status}`}>{nota.status === "em_conferencia" ? "Em conferência" : nota.status}</span>
                    <span className="invoice-chevron" aria-hidden="true">⌄</span>
                  </summary>
                  <div className="invoice-row-details">
                    <div className="invoice-file-meta">
                      <span><strong>Arquivo original</strong>{nota.arquivo_nome ?? "—"}</span>
                      <span><strong>Importado em</strong>{data(nota.criado_em)}</span>
                      <span><strong>Chave de acesso</strong><code>{nota.chave_acesso ?? "—"}</code></span>
                      <Link className="button primary" href={`/estoque/notas/${nota.id}`}>Conferir nota →</Link>
                    </div>
                    <div className="table-wrap">
                      <table className="invoice-items-table">
                        <thead><tr><th>#</th><th>Código</th><th>Descrição do XML</th><th>Quantidade</th><th>Valor líquido</th><th>Vínculo</th></tr></thead>
                        <tbody>{itensNota.map((item) => <tr key={item.id}>
                          <td>{item.numero_item}</td>
                          <td>{item.codigo_produto_fornecedor ?? "—"}</td>
                          <td><strong>{item.descricao_produto}</strong></td>
                          <td>{decimal(item.quantidade_comercial)} {item.unidade_comercial}</td>
                          <td>{moeda(item.valor_liquido)}</td>
                          <td><span className={`invoice-link-state ${item.id_item ? "linked" : "pending"}`}>{item.id_item ? "Vinculado" : "Pendente"}</span></td>
                        </tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                </details>
              );
            })}</div> : <div className="invoice-empty"><span aria-hidden="true">▤</span><strong>Nenhuma nota importada</strong><p>Selecione acima o primeiro XML autorizado para iniciar a conferência.</p></div>}
          </section>
        </section>
      </main>
    </AppShell>
  );
}
