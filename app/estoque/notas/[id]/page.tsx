import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InvoiceItemConferenceForm, type OpcaoItemConferencia, type UnidadeConferencia } from "@/components/invoice-item-conference-form";
import { SearchableSelect } from "@/components/searchable-select";
import { decodificarEntidadesXmlBasicas } from "@/lib/nfe/xml";
import { createClient } from "@/lib/supabase/server";
import { criarFornecedorDaNota, criarItemDaNota, desvincularItemNota, vincularFornecedorNota } from "./actions";

export const dynamic = "force-dynamic";

type NotaEntrada = {
  id: string;
  id_fornecedor: string | null;
  status: string;
  numero_documento: string | null;
  serie_documento: string | null;
  emitida_em: string | null;
  chave_acesso: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_razao_social: string | null;
  valor_produtos: number | string;
  valor_frete: number | string;
  valor_desconto: number | string;
  valor_total: number | string;
};

type LinhaNota = {
  id: string;
  numero_item: number;
  codigo_produto_fornecedor: string | null;
  descricao_produto: string;
  unidade_comercial: string;
  quantidade_comercial: number | string;
  valor_unitario_comercial: number | string;
  valor_liquido: number | string;
  id_item: string | null;
  codigo_unidade_destino: string | null;
  fator_conversao: number | string;
  quantidade_convertida: number | string | null;
  custo_unitario_convertido: number | string | null;
  ignorado: boolean;
};

type Item = {
  id: string;
  nome: string;
  codigo_item: string;
  codigo_grupo: string;
  codigo_unidade: string;
  ativo: boolean;
};

type Unidade = {
  codigo: string;
  nome: string;
  tipo: string;
  unidade_base: string;
  fator_para_base: number | string;
};

type Grupo = { codigo: string; nome: string; codigo_categoria: string };
type Fornecedor = { id: string; nome: string; cnpj: string | null; ativo: boolean };

function n(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moeda(value: number | string | null | undefined) {
  return n(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function decimal(value: number | string | null | undefined, digits = 6) {
  return n(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function data(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "—";
}

function cnpj(value: string | null) {
  return value?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") ?? "—";
}

function inferirGrupo(descricao: string) {
  const nome = descricao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  if (nome.includes("lupulo")) return "LUP";
  if (nome.includes("fermento") || nome.includes("levedura")) return "LEV";
  if (nome.includes("malte")) return "MAL";
  if (nome.includes("garrafa") || nome.includes("tampa") || nome.includes("lata")) return "EMB";
  if (nome.includes("sanit") || nome.includes("peracet")) return "SAN";
  return "DIV";
}

function inferirUnidade(descricao: string, unidadeXml: string, unidades: Unidade[]) {
  const match = descricao.match(/\d+(?:[.,]\d+)?\s*(kg|g|ml|l)\b/i);
  if (match && unidades.some((unidade) => unidade.codigo === match[1].toLocaleLowerCase())) return match[1].toLocaleLowerCase();
  const alias = unidadeXml.normalize("NFD").replace(/[\u0300-\u036f.]/g, "").toLocaleLowerCase();
  const codigo = ["un", "und", "unid", "unidade"].includes(alias) ? "un" : ["pac", "pct", "pcte", "pacote"].includes(alias) ? "pct" : alias;
  return unidades.some((unidade) => unidade.codigo === codigo) ? codigo : unidades[0]?.codigo ?? "";
}

function sugerirFator(descricao: string, unidadeXml: string, unidadeDestino: string, unidades: Unidade[]) {
  const destino = unidades.find((unidade) => unidade.codigo === unidadeDestino);
  if (!destino) return 1;
  const aliases: Record<string, string> = { und: "un", unid: "un", unidade: "un", pac: "pct", pcte: "pct", pacote: "pct" };
  const raw = unidadeXml.normalize("NFD").replace(/[\u0300-\u036f.]/g, "").toLocaleLowerCase();
  const origem = unidades.find((unidade) => unidade.codigo === (aliases[raw] ?? raw));
  if (origem && origem.tipo === destino.tipo && origem.unidade_base === destino.unidade_base) return n(origem.fator_para_base) / n(destino.fator_para_base);
  const match = descricao.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i);
  const descrita = match ? unidades.find((unidade) => unidade.codigo === match[2].toLocaleLowerCase()) : null;
  if (match && descrita && descrita.tipo === destino.tipo && descrita.unidade_base === destino.unidade_base) {
    return Number(match[1].replace(",", ".")) * n(descrita.fator_para_base) / n(destino.fator_para_base);
  }
  return 1;
}

export default async function ConferenciaNotaPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string; novo_item?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/login?next=${encodeURIComponent(`/estoque/notas/${id}`)}`);
  const email = typeof claims.claims.email === "string" ? claims.claims.email : undefined;

  const [notaResult, linhasResult, itensResult, unidadesResult, gruposResult, fornecedoresResult] = await Promise.all([
    supabase.from("notas_entrada").select("id,id_fornecedor,status,numero_documento,serie_documento,emitida_em,chave_acesso,fornecedor_cnpj,fornecedor_razao_social,valor_produtos,valor_frete,valor_desconto,valor_total").eq("id", id).maybeSingle(),
    supabase.from("itens_notas_entrada").select("id,numero_item,codigo_produto_fornecedor,descricao_produto,unidade_comercial,quantidade_comercial,valor_unitario_comercial,valor_liquido,id_item,codigo_unidade_destino,fator_conversao,quantidade_convertida,custo_unitario_convertido,ignorado").eq("id_nota_entrada", id).order("numero_item"),
    supabase.from("itens").select("id,nome,codigo_item,codigo_grupo,codigo_unidade,ativo").order("codigo_item"),
    supabase.from("unidades").select("codigo,nome,tipo,unidade_base,fator_para_base").order("codigo"),
    supabase.from("grupos_itens").select("codigo,nome,codigo_categoria").eq("ativo", true).order("nome"),
    supabase.from("fornecedores").select("id,nome,cnpj,ativo").order("nome")
  ]);
  if (!notaResult.data) notFound();
  const nota = notaResult.data as NotaEntrada;
  const linhas = (linhasResult.data ?? []) as LinhaNota[];
  const itens = (itensResult.data ?? []) as Item[];
  const unidades = (unidadesResult.data ?? []) as Unidade[];
  const grupos = (gruposResult.data ?? []) as Grupo[];
  const fornecedores = (fornecedoresResult.data ?? []) as Fornecedor[];
  const errosCarga = [notaResult.error, linhasResult.error, itensResult.error, unidadesResult.error, gruposResult.error, fornecedoresResult.error].filter(Boolean);
  const idsAtuais = new Set(linhas.map((linha) => linha.id_item).filter(Boolean));
  const itensDisponiveis = itens.filter((item) => item.ativo || idsAtuais.has(item.id));
  const opcoesItens: OpcaoItemConferencia[] = itensDisponiveis.map((item) => ({
    id: item.id,
    codigo: item.codigo_item,
    nome: item.nome,
    grupo: item.codigo_grupo,
    unidade: item.codigo_unidade
  }));
  const unidadesConferencia: UnidadeConferencia[] = unidades.map((unidade) => ({
    codigo: unidade.codigo,
    tipo: unidade.tipo,
    unidadeBase: unidade.unidade_base,
    fatorParaBase: n(unidade.fator_para_base)
  }));
  const itemPorId = new Map(itens.map((item) => [item.id, item]));
  const fornecedorAtual = fornecedores.find((fornecedor) => fornecedor.id === nota.id_fornecedor) ?? null;
  const fornecedoresDisponiveis = fornecedores.filter((fornecedor) => fornecedor.ativo || fornecedor.id === nota.id_fornecedor);
  const resolvidos = linhas.filter((linha) => linha.ignorado || Boolean(linha.id_item && linha.codigo_unidade_destino && linha.quantidade_convertida !== null)).length;
  const pronto = Boolean(nota.id_fornecedor) && linhas.length > 0 && resolvidos === linhas.length;
  const progresso = linhas.length ? Math.round((resolvidos / linhas.length) * 100) : 0;
  const maiorCodigo = itens.reduce((maior, item) => Math.max(maior, Number(item.codigo_item) || 0), 0);
  const proximoCodigo = String(maiorCodigo + 1).padStart(4, "0");
  const linhaNovoItem = query.novo_item ? linhas.find((linha) => linha.id === query.novo_item) ?? null : null;
  const nomeEmitente = decodificarEntidadesXmlBasicas(nota.fornecedor_razao_social ?? "Fornecedor não informado");

  return (
    <AppShell active="estoque" userEmail={email} contextLabel="Estoque" contextCurrent="Conferência da NF-e">
      <main className="page-shell invoice-conference-page">
        <section className="page-content">
          <div className="invoice-conference-header">
            <div>
              <p className="eyebrow">Nota de entrada · Conferência</p>
              <h1>NF {nota.numero_documento ?? "—"}</h1>
              <p className="intro">{nomeEmitente} · Emitida em {data(nota.emitida_em)}</p>
            </div>
            <div className="invoice-conference-header-actions">
              <span className={`invoice-ready-state ${pronto ? "ready" : "pending"}`}>{pronto ? "✓ Pronta para confirmar" : `${resolvidos} de ${linhas.length} itens resolvidos`}</span>
              <Link className="button secondary" href="/estoque/notas">← Voltar às notas</Link>
            </div>
          </div>

          {query.error ? <p className="form-message error">{query.error}</p> : null}
          {query.message ? <p className="form-message success">{query.message}</p> : null}
          {errosCarga.length ? <p className="form-message error">Alguns dados da conferência não puderam ser carregados.</p> : null}
          {nota.status !== "em_conferencia" ? <p className="form-message error">Esta nota não está mais disponível para edição.</p> : null}

          <section className="invoice-conference-summary">
            <div className="invoice-progress-card">
              <div><span>Progresso da conferência</span><strong>{progresso}%</strong></div>
              <div className="invoice-progress-track" role="progressbar" aria-label="Progresso da conferência" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso}><i style={{ width: `${progresso}%` }} /></div>
              <small>Resolva cada linha vinculando um item ou marcando-a para ignorar.</small>
            </div>
            <dl>
              <div><dt>Produtos</dt><dd>{moeda(nota.valor_produtos)}</dd></div>
              <div><dt>Frete</dt><dd>{moeda(nota.valor_frete)}</dd></div>
              <div><dt>Desconto</dt><dd>− {moeda(nota.valor_desconto)}</dd></div>
              <div className="total"><dt>Total da nota</dt><dd>{moeda(nota.valor_total)}</dd></div>
            </dl>
          </section>

          <section className={`invoice-supplier-card ${nota.id_fornecedor ? "resolved" : "pending"}`}>
            <div className="invoice-supplier-heading">
              <span aria-hidden="true">♙</span>
              <div><p className="eyebrow">Fornecedor</p><h2>{nomeEmitente}</h2><small>CNPJ {cnpj(nota.fornecedor_cnpj)}</small></div>
              <b>{nota.id_fornecedor ? `Vinculado: ${fornecedorAtual?.nome ?? "Fornecedor"}` : "Vínculo pendente"}</b>
            </div>
            {!nota.id_fornecedor && nota.status === "em_conferencia" ? <div className="invoice-supplier-actions">
              <form action={vincularFornecedorNota}>
                <input type="hidden" name="id_nota" value={nota.id} />
                <SearchableSelect name="id_fornecedor" required placeholder="Selecione um fornecedor existente" options={fornecedoresDisponiveis.map((fornecedor) => ({ value: fornecedor.id, label: `${fornecedor.nome}${fornecedor.cnpj ? ` · ${cnpj(fornecedor.cnpj)}` : ""}`, searchText: `${fornecedor.nome} ${fornecedor.cnpj ?? ""}` }))} />
                <button className="button secondary" type="submit">Vincular fornecedor</button>
              </form>
              <span>ou</span>
              <form action={criarFornecedorDaNota}><input type="hidden" name="id_nota" value={nota.id} /><button className="button primary" type="submit">＋ Cadastrar usando o XML</button></form>
            </div> : null}
          </section>

          <div className="invoice-items-heading">
            <div><p className="eyebrow">Itens da nota</p><h2>Vincule os produtos ao catálogo</h2><p>O fator representa quantas unidades do estoque existem em uma unidade comprada.</p></div>
            <span>{linhas.length} linhas</span>
          </div>

          <div className="invoice-conference-list">{linhas.map((linha) => {
            const itemAtual = linha.id_item ? itemPorId.get(linha.id_item) ?? null : null;
            const vinculoCompleto = Boolean(linha.id_item && linha.codigo_unidade_destino && linha.quantidade_convertida !== null);
            const estado = linha.ignorado ? "ignored" : vinculoCompleto ? "linked" : "pending";
            return <article className={`invoice-conference-item ${estado}`} id={`item-nota-${linha.id}`} key={linha.id}>
              <header>
                <span className="invoice-line-number">{linha.numero_item}</span>
                <div><h3>{decodificarEntidadesXmlBasicas(linha.descricao_produto)}</h3><p>Código do fornecedor: {linha.codigo_produto_fornecedor ?? "—"}</p></div>
                <dl><div><dt>Compra</dt><dd>{decimal(linha.quantidade_comercial)} {linha.unidade_comercial}</dd></div><div><dt>Valor unitário</dt><dd>{moeda(linha.valor_unitario_comercial)}</dd></div><div><dt>Valor líquido</dt><dd>{moeda(linha.valor_liquido)}</dd></div></dl>
                <span className={`invoice-link-state ${estado}`}>{linha.ignorado ? "Ignorado" : vinculoCompleto ? "Conferido" : "Pendente"}</span>
              </header>
              {itemAtual ? <div className="invoice-current-link"><span>Vínculo atual: <strong>{itemAtual.codigo_item} · {itemAtual.nome}</strong> · {decimal(linha.quantidade_convertida)} {linha.codigo_unidade_destino} a {moeda(linha.custo_unitario_convertido)} / {linha.codigo_unidade_destino}</span>{nota.status === "em_conferencia" ? <form action={desvincularItemNota}><input type="hidden" name="id_nota" value={nota.id} /><input type="hidden" name="id_item_nota" value={linha.id} /><button className="invoice-unlink-button" type="submit">Desvincular</button></form> : null}</div> : null}
              {nota.status === "em_conferencia" ? <div className="invoice-item-workspace">
                <InvoiceItemConferenceForm
                  key={`${linha.id}:${linha.id_item ?? "sem-item"}:${linha.fator_conversao}:${linha.ignorado}`}
                  idNota={nota.id}
                  idItemNota={linha.id}
                  descricao={decodificarEntidadesXmlBasicas(linha.descricao_produto)}
                  unidadeXml={linha.unidade_comercial}
                  quantidadeXml={n(linha.quantidade_comercial)}
                  valorLiquido={n(linha.valor_liquido)}
                  itens={opcoesItens}
                  unidades={unidadesConferencia}
                  idItemAtual={linha.id_item}
                  fatorAtual={n(linha.fator_conversao) || 1}
                  ignoradoAtual={linha.ignorado}
                />
                <div className="invoice-new-item-callout"><span>Não encontrou o produto?</span><Link href={`/estoque/notas/${nota.id}?novo_item=${linha.id}#item-nota-${linha.id}`}>＋ Cadastrar novo item</Link></div>
              </div> : null}
            </article>;
          })}</div>

          <section className={`invoice-phase4-card ${pronto ? "ready" : "locked"}`}>
            <span aria-hidden="true">{pronto ? "✓" : "⌛"}</span>
            <div><h2>{pronto ? "Conferência concluída" : "Confirmação ainda bloqueada"}</h2><p>{pronto ? "Fornecedor e itens estão resolvidos. A criação dos lotes e movimentos será liberada na Fase 4." : "Vincule o fornecedor e resolva todas as linhas. Nenhum saldo será alterado durante esta conferência."}</p></div>
            <button className="button primary" type="button" disabled>Confirmar entrada · Fase 4</button>
          </section>
        </section>

        {linhaNovoItem ? (() => {
          const unidadeSugerida = inferirUnidade(linhaNovoItem.descricao_produto, linhaNovoItem.unidade_comercial, unidades);
          const fatorSugerido = sugerirFator(linhaNovoItem.descricao_produto, linhaNovoItem.unidade_comercial, unidadeSugerida, unidades);
          const quantidadeConvertida = n(linhaNovoItem.quantidade_comercial) * fatorSugerido;
          const custoSugerido = quantidadeConvertida > 0 ? n(linhaNovoItem.valor_liquido) / quantidadeConvertida : 0;
          const grupoSugerido = inferirGrupo(linhaNovoItem.descricao_produto);
          return <div className="item-modal-backdrop"><section className="item-edit-modal invoice-create-item-modal" role="dialog" aria-modal="true" aria-labelledby="criar-item-nota-titulo">
            <div className="item-modal-header"><div><p className="eyebrow">Conferência da nota</p><h2 id="criar-item-nota-titulo">Cadastrar item do XML</h2><p className="intro">Revise os dados sugeridos antes de criar o item.</p></div><Link className="item-modal-close" href={`/estoque/notas/${nota.id}#item-nota-${linhaNovoItem.id}`} aria-label="Fechar cadastro">×</Link></div>
            <form className="form-grid" action={criarItemDaNota}>
              <input type="hidden" name="id_nota" value={nota.id} /><input type="hidden" name="id_item_nota" value={linhaNovoItem.id} /><input type="hidden" name="numero_nota" value={nota.numero_documento ?? ""} />
              <label className="form-field form-field-wide"><span>Nome *</span><input name="nome" defaultValue={decodificarEntidadesXmlBasicas(linhaNovoItem.descricao_produto)} required autoFocus /></label>
              <label className="form-field"><span>Código do item *</span><input name="codigo_item" inputMode="numeric" pattern="[0-9]{4,12}" defaultValue={proximoCodigo} required /><small>Próximo código livre sugerido.</small></label>
              <label className="form-field"><span>Grupo *</span><select name="codigo_grupo" defaultValue={grupoSugerido} required>{grupos.map((grupo) => <option key={grupo.codigo} value={grupo.codigo}>{grupo.codigo} · {grupo.nome}</option>)}</select></label>
              <label className="form-field"><span>Unidade de estoque *</span><select name="codigo_unidade" defaultValue={unidadeSugerida} required>{unidades.map((unidade) => <option key={unidade.codigo} value={unidade.codigo}>{unidade.codigo} · {unidade.nome}</option>)}</select></label>
              <label className="form-field"><span>Estoque mínimo *</span><input name="estoque_minimo" type="number" min="0" step="0.001" defaultValue="0" required /></label>
              <label className="form-field"><span>Fator de conversão *</span><input name="fator_conversao" type="number" min="0.00000001" step="0.00000001" defaultValue={fatorSugerido} required /><small>Compra: {decimal(linhaNovoItem.quantidade_comercial)} {linhaNovoItem.unidade_comercial} → sugestão de {decimal(quantidadeConvertida)} {unidadeSugerida}.</small></label>
              <div className="invoice-modal-cost"><span>Custo unitário estimado</span><strong>{moeda(custoSugerido)} / {unidadeSugerida}</strong></div>
              <div className="form-actions form-field-wide"><button className="button primary" type="submit">Criar e vincular item</button><Link className="button secondary" href={`/estoque/notas/${nota.id}#item-nota-${linhaNovoItem.id}`}>Cancelar</Link></div>
            </form>
          </section></div>;
        })() : null}
      </main>
    </AppShell>
  );
}
