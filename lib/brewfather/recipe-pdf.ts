import pdfParse from "pdf-parse/lib/pdf-parse.js";

export type IngredienteImportado = {
  nome: string;
  grupo: "Malte" | "Lúpulo" | "Levedura" | "Diversos";
  codigoGrupo: "MAL" | "LUP" | "LEV" | "DIV";
  quantidade: number;
  unidade: string;
  etapa: "mostura" | "fervura" | "fermentacao";
  observacoes: string | null;
  itemExistente?: boolean;
  cadastrar?: boolean;
};

export type ReceitaImportada = {
  nome: string;
  estilo: string | null;
  volumeLitros: number;
  og: number | null;
  fg: number | null;
  abv: number | null;
  ibu: number | null;
  ingredientes: IngredienteImportado[];
};

function numero(valor: string) {
  const limpo = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
  const resultado = Number(limpo);
  return Number.isFinite(resultado) ? resultado : 0;
}

function numeroDecimal(valor: string) {
  const resultado = Number(valor.replace(",", "."));
  return Number.isFinite(resultado) ? resultado : 0;
}

function normalizarUnidade(unidade: string) {
  return unidade.trim().toLocaleLowerCase();
}

export function unidadesCompativeis(origem: string, destino: string) {
  const a = normalizarUnidade(origem);
  const b = normalizarUnidade(destino);
  if (a === b) return true;
  return (a === "g" || a === "kg") && (b === "g" || b === "kg")
    || (a === "ml" || a === "l") && (b === "ml" || b === "l");
}

export function converterQuantidade(quantidade: number, origem: string, destino: string) {
  const a = normalizarUnidade(origem);
  const b = normalizarUnidade(destino);
  if (a === b) return quantidade;
  if (a === "kg" && b === "g") return quantidade * 1000;
  if (a === "g" && b === "kg") return quantidade / 1000;
  if (a === "l" && b === "ml") return quantidade * 1000;
  if (a === "ml" && b === "l") return quantidade / 1000;
  return quantidade;
}

function linhasComTexto(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function grupo(nome: string) {
  const normalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalizado.includes("lupulo") || normalizado.includes("hop")) return { nome: "Lúpulo" as const, codigo: "LUP" as const };
  if (normalizado.includes("levedura") || normalizado.includes("yeast")) return { nome: "Levedura" as const, codigo: "LEV" as const };
  if (normalizado.includes("malte") || normalizado.includes("malt")) return { nome: "Malte" as const, codigo: "MAL" as const };
  return { nome: "Diversos" as const, codigo: "DIV" as const };
}

function limparNome(nome: string) {
  return nome
    .replace(/\s+\d+(?:[.,]\d+)?\s*EBC.*$/i, "")
    .replace(/\s+\([\d.,]+%\).*$/, "")
    .replace(/\s+-\s*$/, "")
    .trim();
}

function extrairLinhas(texto: string) {
  const linhas = linhasComTexto(texto);
  const resultado: string[] = [];
  let linhaAtual = "";
  for (const linha of linhas) {
    if (/^(Generated|www\.brewfather|Autor:|Tipo:|IBU|BU\/GU|Cor\s*:|Carbonata|Densidade|Volume|Água|Temp\.|Tempo de Fervura|Eficiência|Perfil|Medidas|Relação SO\/CL|pH da Mostura)/i.test(linha)) continue;
    if (/^(Fermentáveis|Lúpulos|Diversos|Levedura)\b/i.test(linha)) {
      if (linhaAtual) resultado.push(linhaAtual);
      linhaAtual = linha;
      resultado.push(linha);
      linhaAtual = "";
      continue;
    }
    if (/^(Mostura|Lavagem)\s+-\s+[\d.,]+\s*(?:g|kg|ml|l)\s*-/i.test(linha) || /^\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|pct|pkg|un)\s+-/i.test(linha) || /-\s+\d+(?:[.,]\d+)?\s*(?:g|kg)\s+-/i.test(linha)) {
      resultado.push(linha);
    }
  }
  return resultado;
}

function parseIngredientes(linhas: string[]) {
  const ingredientes: IngredienteImportado[] = [];
  let secao: "fermentaveis" | "lupulos" | "diversos" | "levedura" | null = null;
  for (const linha of linhas) {
    if (/^Fermentáveis\b/i.test(linha)) { secao = "fermentaveis"; continue; }
    if (/^Lúpulos\b/i.test(linha)) { secao = "lupulos"; continue; }
    if (/^Diversos\b/i.test(linha)) { secao = "diversos"; continue; }
    if (/^Levedura\b/i.test(linha)) { secao = "levedura"; continue; }

    if (secao === "fermentaveis") {
      const encontrado = linha.match(/^([\d.,]+)\s*(kg|g|ml|l)\s*-\s*(.+)$/i);
      if (!encontrado) continue;
      ingredientes.push({ nome: limparNome(encontrado[3]), grupo: "Malte", codigoGrupo: "MAL", quantidade: numero(encontrado[1]), unidade: encontrado[2].toLowerCase(), etapa: "mostura", observacoes: null });
      continue;
    }

    if (secao === "lupulos") {
      const encontrado = linha.match(/-\s*([\d.,]+)\s*(g|kg)\s*-\s*(.+?)\s*-\s*[\d.,]+\s*%/i);
      if (!encontrado) continue;
      const nome = limparNome(encontrado[3]);
      ingredientes.push({ nome, grupo: "Lúpulo", codigoGrupo: "LUP", quantidade: numero(encontrado[1]), unidade: encontrado[2].toLowerCase(), etapa: "fervura", observacoes: linha.split(" - ")[0] || null });
      continue;
    }

    if (secao === "diversos") {
      const encontrado = linha.match(/^(Mostura|Lavagem)\s*-\s*([\d.,]+)\s*(g|kg|ml|l)\s*-\s*(.+)$/i);
      if (!encontrado) continue;
      ingredientes.push({ nome: limparNome(encontrado[4]), grupo: "Diversos", codigoGrupo: "DIV", quantidade: numero(encontrado[2]), unidade: encontrado[3].toLowerCase(), etapa: "mostura", observacoes: encontrado[1] });
      continue;
    }

    if (secao === "levedura") {
      const encontrado = linha.match(/^([\d.,]+)\s*(pct|pkg|un|g|kg)\s*-\s*(.+)$/i);
      if (!encontrado) continue;
      ingredientes.push({ nome: limparNome(encontrado[3]), grupo: "Levedura", codigoGrupo: "LEV", quantidade: numero(encontrado[1]), unidade: encontrado[2].toLowerCase() === "pkg" ? "pct" : encontrado[2].toLowerCase(), etapa: "fermentacao", observacoes: null });
    }
  }
  return ingredientes.filter((item) => item.nome && item.quantidade > 0);
}

function chaveIngrediente(nome: string) {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}

/**
 * O Brewfather imprime cada adição de lúpulo em uma linha diferente. Como o
 * HopFlow controla a receita (e não o cronograma de processo), as adições do
 * mesmo lúpulo devem virar um único ingrediente com a quantidade total.
 */
export function consolidarIngredientes(ingredientes: IngredienteImportado[]) {
  const agrupados = new Map<string, IngredienteImportado>();
  for (const ingrediente of ingredientes) {
    const eLupulo = ingrediente.grupo === "Lúpulo";
    const unidadeMassa = ingrediente.unidade === "g" || ingrediente.unidade === "kg";
    const chave = eLupulo
      ? `${ingrediente.codigoGrupo}:${chaveIngrediente(ingrediente.nome)}:${unidadeMassa ? "massa" : ingrediente.unidade}`
      : `${ingrediente.codigoGrupo}:${chaveIngrediente(ingrediente.nome)}:${ingrediente.unidade}:${ingrediente.etapa}`;
    const atual = agrupados.get(chave);
    if (!atual) {
      agrupados.set(chave, { ...ingrediente });
      continue;
    }

    const quantidadeAtual = atual.unidade === "kg" ? atual.quantidade * 1000 : atual.quantidade;
    const quantidadeNova = ingrediente.unidade === "kg" ? ingrediente.quantidade * 1000 : ingrediente.quantidade;
    atual.quantidade = quantidadeAtual + quantidadeNova;
    if (eLupulo && unidadeMassa) atual.unidade = "g";
    atual.observacoes = [atual.observacoes, ingrediente.observacoes].filter(Boolean).join(" · ") || null;
    atual.itemExistente = Boolean(atual.itemExistente && ingrediente.itemExistente);
    atual.cadastrar = Boolean(atual.cadastrar || ingrediente.cadastrar);
  }
  return Array.from(agrupados.values());
}

export async function extrairTextoPdf(buffer: ArrayBuffer) {
  const resultado = await pdfParse(Buffer.from(buffer));
  return resultado.text;
}

export function interpretarReceita(texto: string): ReceitaImportada {
  const linhas = linhasComTexto(texto);
  const tituloComAbv = linhas.find((linha) => /\s-\s*[\d.,]+%\s*$/.test(linha)) ?? "";
  const titulo = tituloComAbv.replace(/\s-\s*[\d.,]+%\s*$/, "").trim() || "Receita importada do Brewfather";
  const volumeLinha = linhas.find((linha) => /Volume do Lote/i.test(linha));
  const volume = volumeLinha ? numeroDecimal(volumeLinha.match(/Volume do Lote\s*:?\s*([\d.,]+)\s*L/i)?.[1] ?? "0") : 0;
  const og = numeroDecimal(linhas.find((linha) => /Densidade Original/i.test(linha))?.match(/:\s*([\d.,]+)/)?.[1] ?? "0") || null;
  const fg = numeroDecimal(linhas.find((linha) => /Densidade Final/i.test(linha))?.match(/:\s*([\d.,]+)/)?.[1] ?? "0") || null;
  const ibu = numeroDecimal(linhas.find((linha) => /^IBU\b/i.test(linha))?.match(/:\s*([\d.,]+)/)?.[1] ?? "0") || null;
  const abv = numeroDecimal(tituloComAbv.match(/([\d.,]+)%/)?.[1] ?? "0") || null;
  const ingredientes = consolidarIngredientes(parseIngredientes(extrairLinhas(texto)));
  return { nome: titulo, estilo: null, volumeLitros: volume, og, fg, abv, ibu, ingredientes };
}
