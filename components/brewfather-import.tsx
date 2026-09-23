"use client";

import { useMemo, useState } from "react";

type ItemImportacao = { idExterno: string; colecao: string; nome: string; fornecedor: string | null; grupoNome: string; codigoUnidade: string; quantidadeEstoque: number; status: "novo" | "nome_existente" | "importado" };
const nomesColecao: Record<string, string> = { fermentables: "Maltes", hops: "Lúpulos", miscs: "Diversos e sais", yeasts: "Leveduras" };
const nomesStatus: Record<ItemImportacao["status"], string> = { novo: "Novo", nome_existente: "Nome já cadastrado", importado: "Já importado" };

export function BrewfatherImport() {
  const [itens, setItens] = useState<ItemImportacao[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [incluirSaldo, setIncluirSaldo] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const novos = useMemo(() => itens.filter((item) => item.status === "novo"), [itens]);
  const chave = (item: ItemImportacao) => `${item.colecao}:${item.idExterno}`;

  async function consultar() {
    setCarregando(true); setErro(""); setMensagem("");
    try {
      const resposta = await fetch("/api/integracoes/brewfather", { cache: "no-store" });
      const corpo = await resposta.json() as { items?: ItemImportacao[]; error?: string };
      if (!resposta.ok) throw new Error(corpo.error ?? "Não foi possível consultar o Brewfather.");
      const lista = corpo.items ?? [];
      setItens(lista); setSelecionados(lista.filter((item) => item.status === "novo").map(chave));
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível consultar o Brewfather."); }
    finally { setCarregando(false); }
  }

  function alternarTodos() { setSelecionados(selecionados.length === novos.length ? [] : novos.map(chave)); }
  function alternar(item: ItemImportacao) { const id = chave(item); setSelecionados((atual) => atual.includes(id) ? atual.filter((valor) => valor !== id) : [...atual, id]); }

  async function importar() {
    setImportando(true); setErro(""); setMensagem("");
    try {
      const resposta = await fetch("/api/integracoes/brewfather", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: selecionados, incluirSaldo }) });
      const corpo = await resposta.json() as { imported?: number; withStock?: number; skipped?: number; error?: string };
      if (!resposta.ok) throw new Error(corpo.error ?? "Não foi possível importar os insumos.");
      setMensagem(`${corpo.imported ?? 0} item(ns) importado(s), ${corpo.withStock ?? 0} com saldo e ${corpo.skipped ?? 0} ignorado(s) por duplicidade.`);
      await consultar();
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível importar os insumos."); }
    finally { setImportando(false); }
  }

  return <div className="brewfather-import">
    <div className="brewfather-import-actions"><div><p className="eyebrow">Conexão segura</p><h2>Importar do Brewfather</h2><p className="section-help">Busque maltes, lúpulos, leveduras, sais e outros insumos do seu inventário. A chave nunca vai para o navegador.</p></div><button className="button primary" type="button" onClick={consultar} disabled={carregando}>{carregando ? "Consultando…" : "Buscar inventário"}</button></div>
    {erro ? <p className="form-message error">{erro}</p> : null}
    {mensagem ? <p className="form-message success">{mensagem}</p> : null}
    {itens.length ? <><div className="brewfather-toolbar"><label className="brewfather-check"><input type="checkbox" checked={novos.length > 0 && selecionados.length === novos.length} onChange={alternarTodos} /> Selecionar novos ({novos.length})</label><label className="brewfather-check"><input type="checkbox" checked={incluirSaldo} onChange={(event) => setIncluirSaldo(event.target.checked)} /> Trazer saldo atual do Brewfather</label><button className="button primary" type="button" onClick={importar} disabled={importando || selecionados.length === 0}>{importando ? "Importando…" : `Importar selecionados (${selecionados.length})`}</button></div><div className="table-wrap"><table className="brewfather-table"><thead><tr><th></th><th>Insumo</th><th>Grupo</th><th>Fornecedor</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{itens.map((item) => <tr key={chave(item)}><td><input type="checkbox" disabled={item.status !== "novo"} checked={selecionados.includes(chave(item))} onChange={() => alternar(item)} aria-label={`Selecionar ${item.nome}`} /></td><td><strong>{item.nome}</strong><small>{nomesColecao[item.colecao] ?? item.colecao}</small></td><td>{item.grupoNome}</td><td>{item.fornecedor ?? "—"}</td><td>{item.quantidadeEstoque.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {item.codigoUnidade}</td><td><span className={`table-pill ${item.status === "novo" ? "ok" : "inativo"}`}>{nomesStatus[item.status]}</span></td></tr>)}</tbody></table></div></> : <div className="brewfather-empty"><strong>Ainda não há uma prévia carregada.</strong><span>Use “Buscar inventário” para consultar sua conta do Brewfather.</span></div>}
  </div>;
}
