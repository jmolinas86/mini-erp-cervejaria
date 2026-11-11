"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ErroNfeXml, lerNfeXml } from "@/lib/nfe/xml";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NOTAS = "documentos-notas-entrada";
const TAMANHO_MAXIMO_XML = 5 * 1024 * 1024;

class ErroImportacao extends Error {}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resposta(message: string, error = false, nota?: string): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  if (nota) params.set("nota", nota);
  redirect(`/estoque/notas?${params.toString()}`);
}

async function autenticado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Festoque%2Fnotas");

  const authId = typeof data.claims.sub === "string" && isUuid(data.claims.sub)
    ? data.claims.sub
    : null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  let criadoPor: string | null = null;

  if (authId) {
    const { data: usuario } = await supabase
      .from("usuarios_app")
      .select("id")
      .eq("id_usuario_auth", authId)
      .maybeSingle();
    criadoPor = usuario?.id ?? null;
  }

  if (!criadoPor && email) {
    const { data: usuario } = await supabase
      .from("usuarios_app")
      .select("id")
      .eq("email", email)
      .eq("ativo", true)
      .maybeSingle();
    criadoPor = usuario?.id ?? null;
  }

  return { supabase, criadoPor };
}

function validarArquivo(value: FormDataEntryValue | null): asserts value is File {
  if (!(value instanceof File) || !value.name || value.size === 0) {
    throw new ErroImportacao("Selecione um arquivo XML da NF-e.");
  }
  if (value.size > TAMANHO_MAXIMO_XML) {
    throw new ErroImportacao("O XML deve ter no máximo 5 MB.");
  }
  if (!value.name.toLocaleLowerCase().endsWith(".xml")) {
    throw new ErroImportacao("O arquivo selecionado precisa ter a extensão .xml.");
  }
  const tiposPermitidos = new Set(["", "application/xml", "text/xml", "application/octet-stream"]);
  if (!tiposPermitidos.has(value.type.toLocaleLowerCase())) {
    throw new ErroImportacao("O tipo do arquivo selecionado não é XML.");
  }
}

async function limparImportacao(
  supabase: SupabaseClient,
  idNota: string | null,
  caminhoArquivo: string | null
) {
  if (caminhoArquivo) {
    await supabase.storage.from(BUCKET_NOTAS).remove([caminhoArquivo]);
  }
  if (idNota) {
    await supabase.from("notas_entrada").delete().eq("id", idNota);
  }
}

export async function importarXmlNfe(formData: FormData) {
  const { supabase, criadoPor } = await autenticado();
  const arquivo = formData.get("arquivo_xml");
  let idNota: string | null = null;
  let caminhoArquivo: string | null = null;

  try {
    validarArquivo(arquivo);
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const conteudo = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const hash = createHash("sha256").update(buffer).digest("hex");
    const nfe = lerNfeXml(conteudo);

    const [porChave, porHash] = await Promise.all([
      supabase.from("notas_entrada").select("id").eq("chave_acesso", nfe.chaveAcesso).maybeSingle(),
      supabase.from("notas_entrada").select("id").eq("arquivo_hash_sha256", hash).maybeSingle()
    ]);
    if (porChave.error || porHash.error) {
      throw new ErroImportacao("Não foi possível verificar se esta nota já foi importada.");
    }
    if (porChave.data || porHash.data) {
      throw new ErroImportacao("Esta nota fiscal já foi importada no HopFlow.");
    }

    const { data: fornecedor, error: erroFornecedor } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("cnpj", nfe.fornecedorCnpj)
      .maybeSingle();
    if (erroFornecedor) {
      throw new ErroImportacao("Não foi possível consultar o fornecedor da nota.");
    }

    const codigosProdutos = [...new Set(nfe.itens.map((item) => item.codigoProdutoFornecedor))];
    const mapeamentos = fornecedor && codigosProdutos.length
      ? await supabase
          .from("mapeamentos_itens_fornecedores")
          .select("codigo_produto_fornecedor,id_item,codigo_unidade_destino,fator_conversao")
          .eq("id_fornecedor", fornecedor.id)
          .eq("ativo", true)
          .in("codigo_produto_fornecedor", codigosProdutos)
      : { data: [], error: null };
    if (mapeamentos.error) {
      throw new ErroImportacao("Não foi possível consultar o mapeamento dos itens do fornecedor.");
    }
    const mapeamentoPorCodigo = new Map(
      (mapeamentos.data ?? []).map((item) => [item.codigo_produto_fornecedor, item])
    );

    const { data: nota, error: erroNota } = await supabase
      .from("notas_entrada")
      .insert({
        id_fornecedor: fornecedor?.id ?? null,
        origem_documento: "xml",
        status: "rascunho",
        chave_acesso: nfe.chaveAcesso,
        modelo_documento: nfe.modeloDocumento,
        numero_documento: nfe.numeroDocumento,
        serie_documento: nfe.serieDocumento,
        emitida_em: nfe.emitidaEm,
        fornecedor_cnpj: nfe.fornecedorCnpj,
        fornecedor_razao_social: nfe.fornecedorRazaoSocial,
        fornecedor_inscricao_estadual: nfe.fornecedorInscricaoEstadual,
        valor_produtos: nfe.valorProdutos,
        valor_frete: nfe.valorFrete,
        valor_seguro: nfe.valorSeguro,
        valor_desconto: nfe.valorDesconto,
        valor_outras_despesas: nfe.valorOutrasDespesas,
        valor_total: nfe.valorTotal,
        arquivo_nome: arquivo.name.slice(0, 255),
        arquivo_hash_sha256: hash,
        criado_por: criadoPor
      })
      .select("id")
      .single();
    if (erroNota || !nota) {
      if (erroNota?.code === "23505") {
        throw new ErroImportacao("Esta nota fiscal já foi importada no HopFlow.");
      }
      throw new ErroImportacao("Não foi possível criar o registro da nota fiscal.");
    }
    idNota = nota.id;
    caminhoArquivo = `${nota.id}/${hash}.xml`;

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET_NOTAS)
      .upload(caminhoArquivo, buffer, { contentType: "application/xml", upsert: false });
    if (erroUpload) {
      throw new ErroImportacao("Não foi possível guardar o XML original da nota.");
    }

    const itens = nfe.itens.map((item) => {
      const mapeamento = mapeamentoPorCodigo.get(item.codigoProdutoFornecedor);
      const fator = mapeamento ? Number(mapeamento.fator_conversao) : 1;
      const quantidadeConvertida = mapeamento ? item.quantidadeComercial * fator : null;
      return {
        id_nota_entrada: nota.id,
        numero_item: item.numeroItem,
        codigo_produto_fornecedor: item.codigoProdutoFornecedor,
        ean_gtin: item.eanGtin,
        descricao_produto: item.descricaoProduto,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade_comercial: item.unidadeComercial,
        quantidade_comercial: item.quantidadeComercial,
        valor_unitario_comercial: item.valorUnitarioComercial,
        valor_produtos: item.valorProdutos,
        valor_frete: item.valorFrete,
        valor_seguro: item.valorSeguro,
        valor_desconto: item.valorDesconto,
        valor_outras_despesas: item.valorOutrasDespesas,
        id_item: mapeamento?.id_item ?? null,
        codigo_unidade_destino: mapeamento?.codigo_unidade_destino ?? null,
        fator_conversao: fator,
        quantidade_convertida: quantidadeConvertida,
        custo_unitario_convertido: quantidadeConvertida && quantidadeConvertida > 0
          ? item.valorLiquido / quantidadeConvertida
          : null
      };
    });
    const { error: erroItens } = await supabase.from("itens_notas_entrada").insert(itens);
    if (erroItens) {
      throw new ErroImportacao("A nota foi lida, mas não foi possível salvar todos os itens.");
    }

    const { error: erroConclusao } = await supabase
      .from("notas_entrada")
      .update({ status: "em_conferencia", arquivo_caminho: caminhoArquivo })
      .eq("id", nota.id);
    if (erroConclusao) {
      throw new ErroImportacao("Não foi possível concluir a importação para conferência.");
    }
  } catch (error) {
    await limparImportacao(supabase, idNota, caminhoArquivo);
    const message = error instanceof ErroImportacao || error instanceof ErroNfeXml
      ? error.message
      : "Não foi possível importar este XML. Verifique o arquivo e tente novamente.";
    resposta(message, true);
  }

  revalidatePath("/estoque/notas");
  resposta("XML importado. Confira os dados antes de lançar a entrada no estoque.", false, idNota ?? undefined);
}
