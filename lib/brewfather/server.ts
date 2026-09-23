export const colecoesBrewfather = ["fermentables", "hops", "miscs", "yeasts"] as const;
export type ColecaoBrewfather = (typeof colecoesBrewfather)[number];

export type InsumoBrewfather = {
  idExterno: string;
  colecao: ColecaoBrewfather;
  nome: string;
  fornecedor: string | null;
  grupoCodigo: "MAL" | "LUP" | "LEV" | "DIV";
  grupoNome: string;
  codigoUnidade: "kg" | "g" | "un";
  quantidadeEstoque: number;
  unidadeEstoque: string;
  custoReferencia: number | null;
  observacaoOrigem: string;
};

export class BrewfatherError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.name = "BrewfatherError"; this.status = status; }
}

function credenciais() {
  const userId = process.env.BREWFATHER_USER_ID?.trim();
  const apiKey = process.env.BREWFATHER_API_KEY?.trim();
  if (!userId || !apiKey) throw new BrewfatherError("Configure BREWFATHER_USER_ID e BREWFATHER_API_KEY no ambiente do HopFlow.", 503);
  return { userId, apiKey };
}

function texto(valor: unknown) {
  if (typeof valor === "string") return valor.trim();
  if (valor && typeof valor === "object" && "name" in valor) {
    const nome = (valor as { name?: unknown }).name;
    return typeof nome === "string" ? nome.trim() : "";
  }
  return "";
}

function numero(valor: unknown) {
  const resultado = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

function grupoParaColecao(colecao: ColecaoBrewfather): InsumoBrewfather["grupoCodigo"] {
  if (colecao === "fermentables") return "MAL";
  if (colecao === "hops") return "LUP";
  if (colecao === "yeasts") return "LEV";
  return "DIV";
}

function grupoNome(codigo: InsumoBrewfather["grupoCodigo"]) { return { MAL: "Malte", LUP: "Lúpulo", LEV: "Levedura", DIV: "Diversos" }[codigo]; }
function unidadeParaColecao(colecao: ColecaoBrewfather): InsumoBrewfather["codigoUnidade"] { return colecao === "fermentables" ? "kg" : colecao === "yeasts" ? "un" : "g"; }

function normalizar(colecao: ColecaoBrewfather, bruto: Record<string, unknown>): InsumoBrewfather | null {
  const nome = texto(bruto.name);
  const idExterno = texto(bruto._id) || texto(bruto.id);
  if (!nome || !idExterno) return null;
  const grupoCodigo = grupoParaColecao(colecao);
  const codigoUnidade = unidadeParaColecao(colecao);
  const estoqueOriginal = numero(bruto.inventory) ?? 0;
  const custoReferencia = numero(bruto.costPerUnit) ?? numero(bruto.cost) ?? numero(bruto.price);
  const fornecedor = texto(bruto.supplier) || texto(bruto.brand) || null;
  return { idExterno, colecao, nome, fornecedor, grupoCodigo, grupoNome: grupoNome(grupoCodigo), codigoUnidade, quantidadeEstoque: Math.max(0, codigoUnidade === "kg" ? estoqueOriginal / 1000 : estoqueOriginal), unidadeEstoque: colecao === "fermentables" ? "g" : codigoUnidade, custoReferencia: custoReferencia !== null && custoReferencia >= 0 ? custoReferencia : null, observacaoOrigem: `Importado do Brewfather · ${colecao} · ID ${idExterno}` };
}

async function buscarColecao(colecao: ColecaoBrewfather, auth: string) {
  const itens: InsumoBrewfather[] = [];
  let startAfter: string | undefined;
  for (let pagina = 0; pagina < 100; pagina += 1) {
    const url = new URL(`https://api.brewfather.app/v2/inventory/${colecao}`);
    url.searchParams.set("complete", "true"); url.searchParams.set("limit", "50");
    if (startAfter) url.searchParams.set("start_after", startAfter);
    const resposta = await fetch(url, { headers: { authorization: `Basic ${auth}` }, cache: "no-store" });
    if (resposta.status === 429) { const espera = resposta.headers.get("retry-after"); throw new BrewfatherError(`O Brewfather limitou as consultas. Tente novamente${espera ? ` em ${espera} segundos` : " mais tarde"}.`, 429); }
    if (!resposta.ok) {
      if (resposta.status === 401) throw new BrewfatherError("O usuário ou a chave da API do Brewfather são inválidos.");
      if (resposta.status === 403) throw new BrewfatherError("A chave do Brewfather precisa da permissão inventory.read.");
      throw new BrewfatherError(`O Brewfather respondeu com erro ${resposta.status}.`);
    }
    const corpo: unknown = await resposta.json();
    const paginaItens = Array.isArray(corpo) ? corpo : corpo && typeof corpo === "object" && Array.isArray((corpo as { data?: unknown }).data) ? (corpo as { data: unknown[] }).data : [];
    const normalizados = paginaItens.flatMap((item) => item && typeof item === "object" ? [normalizar(colecao, item as Record<string, unknown>)] : []).filter((item): item is InsumoBrewfather => Boolean(item));
    itens.push(...normalizados);
    if (paginaItens.length < 50) break;
    const ultimo = paginaItens[paginaItens.length - 1];
    const proximo = ultimo && typeof ultimo === "object" ? texto((ultimo as Record<string, unknown>)._id) : "";
    if (!proximo) break;
    startAfter = proximo;
  }
  return itens;
}

export async function buscarInventarioBrewfather() {
  const { userId, apiKey } = credenciais();
  const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  const paginas = await Promise.all(colecoesBrewfather.map((colecao) => buscarColecao(colecao, auth)));
  return paginas.flat();
}

export function marcadorBrewfather(item: Pick<InsumoBrewfather, "colecao" | "idExterno">) { return `[Brewfather:${item.colecao}:${item.idExterno}]`; }
