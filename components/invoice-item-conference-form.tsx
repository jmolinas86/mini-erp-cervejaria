"use client";

import { useMemo, useState } from "react";
import { salvarConferenciaItem } from "@/app/estoque/notas/[id]/actions";

export type OpcaoItemConferencia = {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  unidade: string;
};

export type UnidadeConferencia = {
  codigo: string;
  tipo: string;
  unidadeBase: string;
  fatorParaBase: number;
};

function normalizar(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function numeroNaDescricao(descricao: string) {
  const match = descricao.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i);
  if (!match) return null;
  const quantidade = Number(match[1].replace(",", "."));
  return Number.isFinite(quantidade) && quantidade > 0
    ? { quantidade, unidade: match[2].toLocaleLowerCase() }
    : null;
}

function aliasUnidade(value: string) {
  const unidade = normalizar(value.trim()).replaceAll(".", "");
  if (["kg", "kgs", "quilo", "quilos"].includes(unidade)) return "kg";
  if (["g", "gr", "grama", "gramas"].includes(unidade)) return "g";
  if (["l", "lt", "litro", "litros"].includes(unidade)) return "l";
  if (["ml", "mililitro", "mililitros"].includes(unidade)) return "ml";
  if (["un", "und", "unid", "unidade", "unidades"].includes(unidade)) return "un";
  if (["pct", "pac", "pcte", "pacote", "pacotes"].includes(unidade)) return "pct";
  return unidade;
}

export function sugerirFatorConversao(
  unidadeXml: string,
  descricao: string,
  unidadeDestino: string,
  unidades: UnidadeConferencia[]
) {
  const destino = unidades.find((unidade) => unidade.codigo === unidadeDestino);
  if (!destino) return 1;
  const origem = unidades.find((unidade) => unidade.codigo === aliasUnidade(unidadeXml));
  if (origem && origem.tipo === destino.tipo && origem.unidadeBase === destino.unidadeBase) {
    return origem.fatorParaBase / destino.fatorParaBase;
  }

  const embalagemDescrita = numeroNaDescricao(descricao);
  if (embalagemDescrita) {
    const unidadeDescricao = unidades.find((unidade) => unidade.codigo === embalagemDescrita.unidade);
    if (unidadeDescricao && unidadeDescricao.tipo === destino.tipo && unidadeDescricao.unidadeBase === destino.unidadeBase) {
      return embalagemDescrita.quantidade * unidadeDescricao.fatorParaBase / destino.fatorParaBase;
    }
  }
  return 1;
}

function formatar(value: number, digits = 4) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function InvoiceItemConferenceForm({
  idNota,
  idItemNota,
  descricao,
  unidadeXml,
  quantidadeXml,
  valorLiquido,
  itens,
  unidades,
  idItemAtual,
  fatorAtual,
  ignoradoAtual
}: {
  idNota: string;
  idItemNota: string;
  descricao: string;
  unidadeXml: string;
  quantidadeXml: number;
  valorLiquido: number;
  itens: OpcaoItemConferencia[];
  unidades: UnidadeConferencia[];
  idItemAtual: string | null;
  fatorAtual: number;
  ignoradoAtual: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [idItem, setIdItem] = useState(idItemAtual ?? "");
  const [ignorado, setIgnorado] = useState(ignoradoAtual);
  const itemSelecionado = itens.find((item) => item.id === idItem) ?? null;
  const fatorInicial = Number.isFinite(fatorAtual) && fatorAtual > 0 ? fatorAtual : 1;
  const [fator, setFator] = useState(fatorInicial);

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return itens;
    return itens.filter((item) => normalizar(`${item.codigo} ${item.nome} ${item.grupo}`).includes(termo));
  }, [busca, itens]);

  const opcoes = itemSelecionado && !itensFiltrados.some((item) => item.id === itemSelecionado.id)
    ? [itemSelecionado, ...itensFiltrados]
    : itensFiltrados;
  const quantidadeConvertida = quantidadeXml * fator;
  const custoUnitario = quantidadeConvertida > 0 ? valorLiquido / quantidadeConvertida : 0;

  function selecionarItem(value: string) {
    setIdItem(value);
    const selecionado = itens.find((item) => item.id === value);
    if (selecionado && value !== idItemAtual) {
      setFator(sugerirFatorConversao(unidadeXml, descricao, selecionado.unidade, unidades));
    }
  }

  return (
    <form className="invoice-conference-form" action={salvarConferenciaItem}>
      <input type="hidden" name="id_nota" value={idNota} />
      <input type="hidden" name="id_item_nota" value={idItemNota} />
      <input type="hidden" name="codigo_unidade_destino" value={itemSelecionado?.unidade ?? ""} />
      <label className="invoice-ignore-check">
        <input name="ignorado" type="checkbox" checked={ignorado} onChange={(event) => setIgnorado(event.target.checked)} />
        <span>Ignorar este item</span>
      </label>
      <label className="form-field invoice-item-search">
        <span>Item do HopFlow *</span>
        <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por código ou parte do nome" disabled={ignorado} />
        <select name="id_item" value={idItem} onChange={(event) => selecionarItem(event.target.value)} required={!ignorado} disabled={ignorado}>
          <option value="">Selecione um item</option>
          {opcoes.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome} ({item.unidade})</option>)}
        </select>
      </label>
      <label className="form-field">
        <span>Unidade de destino</span>
        <input value={itemSelecionado?.unidade ?? "Selecione o item"} readOnly disabled={ignorado} />
      </label>
      <label className="form-field">
        <span>Fator de conversão *</span>
        <input name="fator_conversao" type="number" min="0.00000001" step="0.00000001" value={fator} onChange={(event) => setFator(Number(event.target.value))} required={!ignorado} disabled={ignorado} />
        <small>1 {unidadeXml} equivale a {formatar(fator, 8)} {itemSelecionado?.unidade ?? "unidade(s)"}.</small>
      </label>
      <div className="invoice-conversion-preview">
        <span>Entrada convertida</span>
        <strong>{ignorado ? "Item ignorado" : `${formatar(quantidadeConvertida, 6)} ${itemSelecionado?.unidade ?? "—"}`}</strong>
        {!ignorado && itemSelecionado ? <small>Custo calculado: R$ {formatar(custoUnitario, 6)} / {itemSelecionado.unidade}</small> : null}
      </div>
      <button className="button primary" type="submit">Salvar vínculo</button>
    </form>
  );
}
