"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReceitaImportada } from "@/lib/brewfather/recipe-pdf";

export function BrewfatherRecipeImport() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [receita, setReceita] = useState<ReceitaImportada | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [cadastrarNovos, setCadastrarNovos] = useState<number[]>([]);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function analisar() {
    if (!arquivo) return;
    setCarregando(true); setErro(""); setReceita(null);
    try {
      const formulario = new FormData();
      formulario.append("arquivo", arquivo);
      const resposta = await fetch("/api/integracoes/brewfather/receita-pdf", { method: "POST", body: formulario });
      const corpo = await resposta.json() as { receita?: ReceitaImportada; error?: string };
      if (!resposta.ok || !corpo.receita) throw new Error(corpo.error ?? "Não foi possível ler o PDF.");
      const novos = corpo.receita.ingredientes.map((item, indice) => item.itemExistente ? -1 : indice).filter((indice) => indice >= 0);
      setReceita(corpo.receita); setNome(corpo.receita.nome); setSelecionados(corpo.receita.ingredientes.map((_, indice) => indice)); setCadastrarNovos(novos);
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível ler o PDF."); }
    finally { setCarregando(false); }
  }

  async function salvar() {
    if (!receita || !nome.trim() || !selecionados.length) return;
    const ingredientesParaSalvar = selecionados.filter((indice) => receita.ingredientes[indice].itemExistente || cadastrarNovos.includes(indice));
    if (!ingredientesParaSalvar.length) return;
    setSalvando(true); setErro("");
    try {
      const resposta = await fetch("/api/integracoes/brewfather/receita-importar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...receita, nome: nome.trim(), ingredientes: selecionados.map((indice) => ({ ...receita.ingredientes[indice], cadastrar: receita.ingredientes[indice].itemExistente || cadastrarNovos.includes(indice) })) }) });
      const corpo = await resposta.json() as { id?: string; error?: string };
      if (!resposta.ok || !corpo.id) throw new Error(corpo.error ?? "Não foi possível salvar a receita.");
      router.push(`/receitas?message=Receita importada do Brewfather com sucesso.`);
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível salvar a receita."); }
    finally { setSalvando(false); }
  }

  const ingredientesParaSalvar = receita ? selecionados.filter((indice) => receita.ingredientes[indice].itemExistente || cadastrarNovos.includes(indice)) : [];
  return <section className="recipe-import-panel"><div className="recipe-import-heading"><div><p className="eyebrow">Importador</p><h2>Importar receita do Brewfather</h2><p>Envie o PDF impresso pelo Brewfather. O HopFlow lê somente maltes, lúpulos, sais, levedura e diversos.</p></div><span className="recipe-import-badge">PDF</span></div><div className="recipe-import-file"><input type="file" accept="application/pdf,.pdf" onChange={(event) => setArquivo(event.target.files?.[0] ?? null)} /><button className="button secondary" type="button" disabled={!arquivo || carregando} onClick={analisar}>{carregando ? "Lendo PDF…" : "Analisar receita"}</button></div>{erro ? <p className="form-message error">{erro}</p> : null}{receita ? <><label className="form-field recipe-import-name"><span>Nome que será salvo</span><input value={nome} onChange={(event) => setNome(event.target.value)} /></label><div className="recipe-import-summary"><span>{receita.ingredientes.length} ingrediente(s) encontrado(s)</span><span>{receita.volumeLitros.toLocaleString("pt-BR")} L</span></div><div className="table-wrap"><table className="brewfather-table recipe-import-table"><thead><tr><th></th><th>Ingrediente</th><th>Grupo</th><th>Quantidade</th><th>Etapa</th><th>Catálogo</th></tr></thead><tbody>{receita.ingredientes.map((item, indice) => <tr key={`${item.nome}-${indice}`}><td><input type="checkbox" checked={selecionados.includes(indice)} onChange={() => setSelecionados((atual) => atual.includes(indice) ? atual.filter((valor) => valor !== indice) : [...atual, indice])} /></td><td><strong>{item.nome}</strong><small>{item.observacoes ?? ""}</small></td><td>{item.grupo}</td><td>{item.quantidade.toLocaleString("pt-BR")} {item.unidade}</td><td>{item.etapa}</td><td>{item.itemExistente ? <span className="table-pill ok">Cadastrado</span> : <label className="recipe-import-register"><input type="checkbox" checked={cadastrarNovos.includes(indice)} onChange={() => setCadastrarNovos((atual) => atual.includes(indice) ? atual.filter((valor) => valor !== indice) : [...atual, indice])} /> Cadastrar item</label>}</td></tr>)}</tbody></table></div><div className="recipe-import-footer"><span>{ingredientesParaSalvar.length} ingrediente(s) serão salvos. Os novos desmarcados ficarão fora da receita.</span><button className="button primary" type="button" disabled={salvando || !nome.trim() || !ingredientesParaSalvar.length} onClick={salvar}>{salvando ? "Salvando…" : `Salvar receita (${ingredientesParaSalvar.length})`}</button></div></> : null}</section>;
}
