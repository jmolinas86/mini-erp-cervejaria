import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { registrarEntrada, registrarMovimentacao } from "./actions";

export const dynamic = "force-dynamic";

type Saldo = {
  id_item: string;
  nome_item: string;
  tipo_item: string;
  categoria: string;
  codigo_unidade: string;
  id_lote: string | null;
  codigo_lote: string | null;
  validade: string | null;
  custo_unitario: number | string | null;
  quantidade_saldo: number | string | null;
  estoque_minimo: number | string;
  status_estoque: string;
};
type Item = { id: string; nome: string; codigo_unidade: string };
type Fornecedor = { id: string; nome: string };
type Unidade = { codigo: string; nome: string; tipo: string; unidade_base: string; fator_para_base: number | string };
type Lote = { id: string; id_item: string; codigo_lote: string; custo_unitario: number | string; validade: string | null };
type Movimento = { id: string; id_item: string; id_lote: string | null; tipo_movimentacao: string; quantidade: number | string; custo_unitario: number | string | null; ocorrido_em: string; observacoes: string | null };

const tipoLabel: Record<string, string> = {
  compra: "Compra",
  entrada_manual: "Entrada manual",
  saida_manual: "Saída manual",
  ajuste_entrada: "Ajuste de entrada",
  ajuste_saida: "Ajuste de saída",
  perda: "Perda"
};
const tiposEntrada = new Set(["compra", "entrada_manual", "ajuste_entrada"]);

function numero(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function decimal(value: number | string | null | undefined, digits = 2) {
  return numero(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function dataCurta(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "—";
}

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=%2Festoque");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const [{ data: saldos, error: erroSaldos }, { data: itens }, { data: fornecedores }, { data: lotes }, { data: movimentos }, { data: unidades }] = await Promise.all([
    supabase.from("vw_saldos_estoque").select("id_item,nome_item,tipo_item,categoria,codigo_unidade,id_lote,codigo_lote,validade,custo_unitario,quantidade_saldo,estoque_minimo,status_estoque").order("status_estoque").order("nome_item"),
    supabase.from("itens").select("id,nome,codigo_unidade").eq("ativo", true).order("nome"),
    supabase.from("fornecedores").select("id,nome").eq("ativo", true).order("nome"),
    supabase.from("lotes_itens").select("id,id_item,codigo_lote,custo_unitario,validade").order("codigo_lote"),
    supabase.from("movimentacoes_estoque").select("id,id_item,id_lote,tipo_movimentacao,quantidade,custo_unitario,ocorrido_em,observacoes").order("ocorrido_em", { ascending: false }).limit(20),
    supabase.from("unidades").select("codigo,nome,tipo,unidade_base,fator_para_base").order("tipo").order("codigo")
  ]);

  const listaSaldos = (saldos ?? []) as Saldo[];
  const listaItens = (itens ?? []) as Item[];
  const listaFornecedores = (fornecedores ?? []) as Fornecedor[];
  const listaLotes = (lotes ?? []) as Lote[];
  const listaMovimentos = (movimentos ?? []) as Movimento[];
  const listaUnidades = (unidades ?? []) as Unidade[];
  const busca = params.q?.trim().toLocaleLowerCase();
  const saldosFiltrados = listaSaldos.filter((saldo) => (!busca || `${saldo.nome_item} ${saldo.codigo_lote ?? ""}`.toLocaleLowerCase().includes(busca)) && (!params.status || saldo.status_estoque === params.status));
  const itensCriticos = listaSaldos.filter((saldo) => saldo.status_estoque !== "ok").length;
  const valorEstoque = listaSaldos.reduce((total, saldo) => total + numero(saldo.quantidade_saldo) * numero(saldo.custo_unitario), 0);
  const nomeItem = new Map(listaItens.map((item) => [item.id, item.nome]));

  return (
    <AppShell active="estoque" userEmail={email}>
      <main className="page-shell">
        <section className="page-content">
          <div className="page-header"><div><p className="eyebrow">Controle operacional</p><h1>Estoque.</h1><p className="intro">Acompanhe lotes, validade, custos e movimentações de insumos, embalagens e produtos acabados.</p></div><div className="page-header-actions"><a className="button primary" href="#nova-entrada">+ Nova entrada</a><a className="button secondary" href="#nova-movimentacao">Registrar baixa</a><Link className="button secondary" href="/">Painel</Link></div></div>
          {params.error ? <p className="form-message error">{params.error}</p> : null}
          {params.message ? <p className="form-message success">{params.message}</p> : null}
          {erroSaldos ? <p className="form-message error">Não foi possível carregar os saldos do estoque.</p> : null}

          <div className="metric-grid"><div className="metric-card"><span className="metric-icon green">▣</span><div><span className="card-label">Itens cadastrados</span><strong>{listaItens.length}</strong><small>ativos para movimentação</small></div></div><div className="metric-card"><span className="metric-icon red">!</span><div><span className="card-label">Estoque crítico</span><strong>{itensCriticos}</strong><small>abaixo do mínimo ou vazio</small></div></div><div className="metric-card"><span className="metric-icon amber">$</span><div><span className="card-label">Valor em estoque</span><strong>R$ {decimal(valorEstoque)}</strong><small>estimado pelos custos dos lotes</small></div></div></div>

          <section className="panel-card" id="nova-entrada"><div className="section-header"><div><p className="eyebrow">Entrada de compra</p><h2>Novo lote</h2><p className="section-help">Informe a quantidade na unidade da compra; o saldo será convertido para a unidade-base do item.</p></div><span className="status-pill configured">Conversão automática</span></div><form className="form-grid" action={registrarEntrada}><label className="form-field"><span>Item *</span><select name="id_item" required defaultValue=""><option value="" disabled>Selecione o item</option>{listaItens.map((item) => <option value={item.id} key={item.id}>{item.nome} · base: {item.codigo_unidade}</option>)}</select></label><label className="form-field"><span>Unidade da entrada *</span><select name="codigo_unidade_entrada" required defaultValue=""><option value="" disabled>Selecione a unidade</option>{listaUnidades.map((unidade) => <option value={unidade.codigo} key={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label><label className="form-field"><span>Fornecedor</span><select name="id_fornecedor" defaultValue=""><option value="">Não informado</option>{listaFornecedores.map((fornecedor) => <option value={fornecedor.id} key={fornecedor.id}>{fornecedor.nome}</option>)}</select></label><label className="form-field"><span>Código do lote *</span><input name="codigo_lote" required placeholder="Ex.: MAL-2609" /></label><label className="form-field"><span>Quantidade *</span><input name="quantidade" type="number" min="0.001" step="0.001" required placeholder="0,000" /></label><label className="form-field"><span>Custo por unidade informada *</span><input name="custo_unitario" type="number" min="0" step="0.0001" required placeholder="R$ 0,00" /></label><label className="form-field"><span>Recebido em *</span><input name="recebido_em" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="form-field"><span>Validade</span><input name="validade" type="date" /></label><label className="form-field form-field-wide"><span>Observações</span><textarea name="observacoes" rows={2} placeholder="Nota fiscal, condição de pagamento ou localização" /></label><div className="form-actions form-field-wide"><button className="button primary" type="submit">Salvar entrada</button></div></form></section>

          <section className="panel-card" id="nova-movimentacao"><div className="section-header"><div><p className="eyebrow">Baixa e ajustes</p><h2>Registrar movimentação</h2><p className="section-help">A unidade escolhida também será convertida para a unidade-base do lote.</p></div><span className="status-pill pending">Saídas validam o saldo</span></div><form className="form-grid" action={registrarMovimentacao}><label className="form-field"><span>Lote *</span><select name="id_lote" required defaultValue=""><option value="" disabled>Selecione o lote</option>{listaLotes.map((lote) => <option value={lote.id} key={lote.id}>{lote.codigo_lote} · {nomeItem.get(lote.id_item) ?? "Item"}</option>)}</select></label><label className="form-field"><span>Unidade informada *</span><select name="codigo_unidade_entrada" required defaultValue=""><option value="" disabled>Selecione a unidade</option>{listaUnidades.map((unidade) => <option value={unidade.codigo} key={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label><label className="form-field"><span>Tipo *</span><select name="tipo_movimentacao" required defaultValue="saida_manual"><option value="saida_manual">Saída manual</option><option value="perda">Perda</option><option value="entrada_manual">Entrada manual</option><option value="ajuste_entrada">Ajuste de entrada</option><option value="ajuste_saida">Ajuste de saída</option></select></label><label className="form-field"><span>Quantidade *</span><input name="quantidade" type="number" min="0.001" step="0.001" required placeholder="0,000" /></label><label className="form-field"><span>Data *</span><input name="ocorrido_em" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="form-field"><span>Custo por unidade informada</span><input name="custo_unitario" type="number" min="0" step="0.0001" placeholder="Usa o custo do lote" /></label><label className="form-field form-field-wide"><span>Motivo / observações</span><textarea name="observacoes" rows={2} placeholder="Ex.: quebra, inventário ou uso fora da produção" /></label><div className="form-actions form-field-wide"><button className="button secondary" type="submit">Registrar movimentação</button></div></form></section>

          <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Posição atual</p><h2>Saldo por lote</h2></div><form className="filter-form" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar item ou lote" /><select name="status" defaultValue={params.status ?? ""}><option value="">Todos os status</option><option value="ok">OK</option><option value="abaixo_minimo">Abaixo do mínimo</option><option value="vazio">Vazio</option></select><button className="button secondary" type="submit">Filtrar</button></form></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Lote</th><th>Validade</th><th>Saldo</th><th>Mínimo</th><th>Custo atual</th><th>Status</th></tr></thead><tbody>{saldosFiltrados.map((saldo) => <tr key={`${saldo.id_item}-${saldo.id_lote ?? "sem-lote"}`}><td><strong>{saldo.nome_item}</strong><span>{saldo.categoria}</span></td><td>{saldo.codigo_lote ?? "Sem lote"}</td><td>{dataCurta(saldo.validade)}</td><td><strong>{decimal(saldo.quantidade_saldo, 3)} {saldo.codigo_unidade}</strong></td><td>{decimal(saldo.estoque_minimo, 3)} {saldo.codigo_unidade}</td><td>R$ {decimal(saldo.custo_unitario, 4)}</td><td><span className={`table-pill ${saldo.status_estoque}`}>{saldo.status_estoque === "abaixo_minimo" ? "Abaixo do mínimo" : saldo.status_estoque === "vazio" ? "Vazio" : "OK"}</span></td></tr>)}</tbody></table></div><p className="table-footnote">Mostrando {saldosFiltrados.length} de {listaSaldos.length} posições.</p></section>

          <section className="panel-card"><div className="section-header"><div><p className="eyebrow">Auditoria</p><h2>Movimentações recentes</h2></div><span className="status-pill configured">Histórico preservado</span></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Item / lote</th><th>Quantidade</th><th>Custo unitário</th><th>Observação</th></tr></thead><tbody>{listaMovimentos.map((movimento) => <tr key={movimento.id}><td>{dataCurta(movimento.ocorrido_em)}</td><td><span className={`movement-pill ${tiposEntrada.has(movimento.tipo_movimentacao) ? "entrada" : "saida"}`}>{tipoLabel[movimento.tipo_movimentacao] ?? movimento.tipo_movimentacao}</span></td><td><strong>{nomeItem.get(movimento.id_item) ?? "Item"}</strong><span>{listaLotes.find((lote) => lote.id === movimento.id_lote)?.codigo_lote ?? "Sem lote"}</span></td><td>{tiposEntrada.has(movimento.tipo_movimentacao) ? "+" : "−"}{decimal(movimento.quantidade, 3)}</td><td>{movimento.custo_unitario === null ? "—" : `R$ ${decimal(movimento.custo_unitario, 4)}`}</td><td>{movimento.observacoes ?? "—"}</td></tr>)}</tbody></table></div></section>
        </section>
      </main>
    </AppShell>
  );
}
