import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Unidade = { codigo: string; nome: string; tipo: string; unidade_base: string; fator_para_base: number | string; casas_decimais: number };

const tipoLabel: Record<string, string> = { mass: "Massa", volume: "Volume", count: "Contagem" };

export default async function UnidadesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fcadastros%2Funidades");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;
  const { data: unidades, error } = await supabase.from("unidades").select("codigo,nome,tipo,unidade_base,fator_para_base,casas_decimais").order("tipo").order("codigo");
  const lista = (unidades ?? []) as Unidade[];

  return <AppShell active="cadastros" userEmail={email}><main className="page-shell"><section className="page-content"><div className="page-header"><div><p className="eyebrow">Cadastros · Unidades</p><h1>Medidas padronizadas.</h1><p className="intro">A unidade-base fica gravada no item. Nas entradas e baixas, você pode informar uma medida compatível e o ERP converte automaticamente.</p></div><div className="page-header-actions"><Link className="button secondary" href="/cadastros">Cadastros</Link><Link className="button secondary" href="/estoque">Estoque</Link></div></div>{error ? <p className="form-message error">Não foi possível carregar as unidades.</p> : null}<section className="panel-card"><div className="section-header"><div><p className="eyebrow">Tabela de conversão</p><h2>{lista.length} unidades disponíveis</h2></div><span className="status-pill configured">Somente consulta</span></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Unidade</th><th>Grupo</th><th>Unidade-base</th><th>Fator</th><th>Exemplo</th></tr></thead><tbody>{lista.map((unidade) => { const fator = Number(unidade.fator_para_base); const exemplo = unidade.codigo === unidade.unidade_base ? `1 ${unidade.codigo} = 1 ${unidade.unidade_base}` : `1 ${unidade.codigo} = ${fator} ${unidade.unidade_base}`; return <tr key={unidade.codigo}><td><strong>{unidade.codigo}</strong></td><td>{unidade.nome}</td><td>{tipoLabel[unidade.tipo] ?? unidade.tipo}</td><td>{unidade.unidade_base}</td><td>{fator}</td><td>{exemplo}</td></tr>; })}</tbody></table></div><p className="section-help">Massas usam kg como base (1.000 g = 1 kg). Volumes usam l como base (1.000 ml = 1 l). Contagens só convertem entre a mesma unidade, pois pacote, cilindro e unidade não são equivalentes automaticamente.</p></section></section></main></AppShell>;
}
