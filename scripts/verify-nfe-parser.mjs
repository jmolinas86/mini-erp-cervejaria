import assert from "node:assert/strict";
import { lerNfeXml } from "../lib/nfe/xml.ts";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35261112345678000195550010000001231000001234" versao="4.00">
      <ide><mod>55</mod><serie>1</serie><nNF>123</nNF><dhEmi>2026-11-11T10:30:00-03:00</dhEmi></ide>
      <emit><CNPJ>12345678000195</CNPJ><xNome>Fornecedor Teste</xNome><IE>123456789</IE></emit>
      <det nItem="1"><prod><cProd>MAL-01</cProd><cEAN>SEM GTIN</cEAN><xProd>Malte Pilsen</xProd><NCM>11071010</NCM><CFOP>5102</CFOP><uCom>KG</uCom><qCom>25.000000</qCom><vUnCom>8.00000000</vUnCom><vProd>200.00</vProd></prod></det>
      <det nItem="2"><prod><cProd>LUP-02</cProd><cEAN>7891234567890</cEAN><xProd>Lúpulo Citra</xProd><NCM>12102010</NCM><CFOP>5102</CFOP><uCom>KG</uCom><qCom>1.000000</qCom><vUnCom>120.00000000</vUnCom><vProd>120.00</vProd><vFrete>10.00</vFrete></prod></det>
      <total><ICMSTot><vProd>320.00</vProd><vFrete>10.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vOutro>0.00</vOutro><vNF>330.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
  <protNFe><infProt><chNFe>35261112345678000195550010000001231000001234</chNFe><cStat>100</cStat></infProt></protNFe>
</nfeProc>`;

const nota = lerNfeXml(xml);
assert.equal(nota.chaveAcesso, "35261112345678000195550010000001231000001234");
assert.equal(nota.fornecedorCnpj, "12345678000195");
assert.equal(nota.itens.length, 2);
assert.equal(nota.itens[0].quantidadeComercial, 25);
assert.equal(nota.itens[0].eanGtin, null);
assert.equal(nota.itens[1].valorLiquido, 130);
assert.equal(nota.valorTotal, 330);

console.log("Parser de NF-e validado com 2 itens.");
