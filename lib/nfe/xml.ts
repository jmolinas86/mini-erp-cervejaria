import { XMLParser } from "fast-xml-parser";
import { SyntaxValidator } from "fast-xml-validator";

type XmlNode = Record<string, unknown>;

export type ItemNfeImportado = {
  numeroItem: number;
  codigoProdutoFornecedor: string;
  eanGtin: string | null;
  descricaoProduto: string;
  ncm: string | null;
  cfop: string | null;
  unidadeComercial: string;
  quantidadeComercial: number;
  valorUnitarioComercial: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorLiquido: number;
};

export type NfeImportada = {
  chaveAcesso: string;
  modeloDocumento: string;
  numeroDocumento: string;
  serieDocumento: string;
  emitidaEm: string;
  fornecedorCnpj: string;
  fornecedorRazaoSocial: string;
  fornecedorInscricaoEstadual: string | null;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorTotal: number;
  itens: ItemNfeImportado[];
};

export class ErroNfeXml extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroNfeXml";
  }
}

function objeto(value: unknown): XmlNode | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as XmlNode
    : null;
}

function texto(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function textoObrigatorio(value: unknown, campo: string) {
  const result = texto(value);
  if (!result) throw new ErroNfeXml(`O XML não contém ${campo}.`);
  return result;
}

function numero(value: unknown, campo: string, obrigatorio = false) {
  const raw = texto(value).replace(",", ".");
  if (!raw && !obrigatorio) return 0;
  const result = Number(raw);
  if (!Number.isFinite(result) || result < 0) {
    throw new ErroNfeXml(`O campo ${campo} possui um valor inválido.`);
  }
  return result;
}

function dataEmIso(value: unknown) {
  const raw = textoObrigatorio(value, "a data de emissão");
  const normalizada = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T12:00:00-03:00`
    : raw;
  const result = new Date(normalizada);
  if (Number.isNaN(result.getTime())) {
    throw new ErroNfeXml("A data de emissão da nota é inválida.");
  }
  return result.toISOString();
}

function somenteDigitos(value: unknown) {
  return texto(value).replace(/\D/g, "");
}

function valorLiquido(item: Omit<ItemNfeImportado, "valorLiquido">) {
  return item.valorProdutos + item.valorFrete + item.valorSeguro
    + item.valorOutrasDespesas - item.valorDesconto;
}

/**
 * Lê somente XML autorizado de NF-e/NFC-e. O parser mantém todos os valores
 * como texto para não perder zeros de chaves, CNPJ, NCM e códigos de produto.
 */
export function lerNfeXml(xml: string): NfeImportada {
  if (!xml.trim()) throw new ErroNfeXml("O arquivo XML está vazio.");
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
    throw new ErroNfeXml("O XML contém declarações não permitidas.");
  }

  try {
    SyntaxValidator.validate(xml, {
      allowBooleanAttributes: false,
      docType: { maxEntityCount: 0, maxEntitySize: 0 }
    });
  } catch {
    throw new ErroNfeXml("O arquivo não possui uma estrutura XML válida.");
  }

  let raiz: XmlNode;
  try {
    raiz = objeto(new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      processEntities: false,
      isArray: (tagName) => tagName === "det"
    }).parse(xml)) ?? {};
  } catch {
    throw new ErroNfeXml("Não foi possível interpretar o XML enviado.");
  }

  const processo = objeto(raiz.nfeProc);
  const nfe = objeto(processo?.NFe ?? raiz.NFe);
  const infNfe = objeto(nfe?.infNFe);
  const protocolo = objeto(objeto(processo?.protNFe)?.infProt);
  if (!processo || !infNfe || !protocolo) {
    throw new ErroNfeXml("Envie o XML autorizado completo da nota (arquivo nfeProc). O XML de envio não possui protocolo de autorização.");
  }

  const statusAutorizacao = texto(protocolo.cStat);
  if (!new Set(["100", "150"]).has(statusAutorizacao)) {
    throw new ErroNfeXml(`A nota não está autorizada pela SEFAZ (status ${statusAutorizacao || "não informado"}).`);
  }

  const ide = objeto(infNfe.ide);
  const emitente = objeto(infNfe.emit);
  const total = objeto(objeto(infNfe.total)?.ICMSTot);
  if (!ide || !emitente || !total) {
    throw new ErroNfeXml("O XML não contém identificação, emitente ou totais da nota.");
  }

  const modeloDocumento = textoObrigatorio(ide.mod, "o modelo do documento");
  if (!new Set(["55", "65"]).has(modeloDocumento)) {
    throw new ErroNfeXml(`O modelo ${modeloDocumento} não é uma NF-e ou NFC-e compatível.`);
  }

  const chaveAcesso = somenteDigitos(texto(infNfe["@_Id"]).replace(/^NFe/i, "") || protocolo.chNFe);
  if (!/^\d{44}$/.test(chaveAcesso)) {
    throw new ErroNfeXml("A chave de acesso da nota não possui 44 dígitos.");
  }

  const fornecedorCnpj = somenteDigitos(emitente.CNPJ);
  if (!/^\d{14}$/.test(fornecedorCnpj)) {
    throw new ErroNfeXml("O CNPJ do emitente não possui 14 dígitos.");
  }

  const detalhes = Array.isArray(infNfe.det)
    ? infNfe.det
    : infNfe.det ? [infNfe.det] : [];
  if (!detalhes.length) throw new ErroNfeXml("A nota não contém itens.");

  const itens = detalhes.map((detalhe, index): ItemNfeImportado => {
    const det = objeto(detalhe);
    const produto = objeto(det?.prod);
    if (!det || !produto) {
      throw new ErroNfeXml(`O item ${index + 1} está incompleto.`);
    }

    const numeroItem = Number(texto(det["@_nItem"]) || index + 1);
    if (!Number.isInteger(numeroItem) || numeroItem <= 0) {
      throw new ErroNfeXml(`O número do item ${index + 1} é inválido.`);
    }

    const quantidadeComercial = numero(produto.qCom, `quantidade do item ${numeroItem}`, true);
    if (quantidadeComercial <= 0) {
      throw new ErroNfeXml(`A quantidade do item ${numeroItem} deve ser maior que zero.`);
    }

    const ean = texto(produto.cEAN);
    const ncm = somenteDigitos(produto.NCM);
    const cfop = somenteDigitos(produto.CFOP);
    const base = {
      numeroItem,
      codigoProdutoFornecedor: textoObrigatorio(produto.cProd, `o código do item ${numeroItem}`),
      eanGtin: ean && !/^SEM GTIN$/i.test(ean) ? ean : null,
      descricaoProduto: textoObrigatorio(produto.xProd, `a descrição do item ${numeroItem}`),
      ncm: /^\d{8}$/.test(ncm) ? ncm : null,
      cfop: /^\d{4}$/.test(cfop) ? cfop : null,
      unidadeComercial: textoObrigatorio(produto.uCom, `a unidade do item ${numeroItem}`),
      quantidadeComercial,
      valorUnitarioComercial: numero(produto.vUnCom, `valor unitário do item ${numeroItem}`, true),
      valorProdutos: numero(produto.vProd, `valor dos produtos do item ${numeroItem}`, true),
      valorFrete: numero(produto.vFrete, `frete do item ${numeroItem}`),
      valorSeguro: numero(produto.vSeg, `seguro do item ${numeroItem}`),
      valorDesconto: numero(produto.vDesc, `desconto do item ${numeroItem}`),
      valorOutrasDespesas: numero(produto.vOutro, `outras despesas do item ${numeroItem}`)
    };

    const liquido = valorLiquido(base);
    if (liquido < 0) {
      throw new ErroNfeXml(`O valor líquido do item ${numeroItem} é negativo.`);
    }
    return { ...base, valorLiquido: liquido };
  });

  return {
    chaveAcesso,
    modeloDocumento,
    numeroDocumento: textoObrigatorio(ide.nNF, "o número da nota"),
    serieDocumento: textoObrigatorio(ide.serie, "a série da nota"),
    emitidaEm: dataEmIso(ide.dhEmi ?? ide.dEmi),
    fornecedorCnpj,
    fornecedorRazaoSocial: textoObrigatorio(emitente.xNome, "a razão social do emitente"),
    fornecedorInscricaoEstadual: texto(emitente.IE) || null,
    valorProdutos: numero(total.vProd, "valor total dos produtos", true),
    valorFrete: numero(total.vFrete, "valor total do frete"),
    valorSeguro: numero(total.vSeg, "valor total do seguro"),
    valorDesconto: numero(total.vDesc, "valor total do desconto"),
    valorOutrasDespesas: numero(total.vOutro, "valor total de outras despesas"),
    valorTotal: numero(total.vNF, "valor total da nota", true),
    itens
  };
}
