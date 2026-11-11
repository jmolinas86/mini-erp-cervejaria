"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decodificarEntidadesXmlBasicas } from "@/lib/nfe/xml";
import { createClient } from "@/lib/supabase/server";

function texto(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function numero(formData: FormData, name: string, allowEmpty = false) {
  const raw = texto(formData, name).replace(",", ".");
  if (!raw && allowEmpty) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function retorno(idNota: string, message: string, error = false, ancora?: string): never {
  const params = new URLSearchParams(error ? { error: message } : { message });
  const hash = ancora ? `#item-nota-${encodeURIComponent(ancora)}` : "";
  redirect(`/estoque/notas/${idNota}?${params.toString()}${hash}`);
}

async function autenticado(idNota: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/login?next=${encodeURIComponent(`/estoque/notas/${idNota}`)}`);
  const authId = typeof data.claims.sub === "string" && isUuid(data.claims.sub) ? data.claims.sub : null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  let criadoPor: string | null = null;

  if (authId) {
    const { data: usuario } = await supabase.from("usuarios_app").select("id").eq("id_usuario_auth", authId).maybeSingle();
    criadoPor = usuario?.id ?? null;
  }
  if (!criadoPor && email) {
    const { data: usuario } = await supabase.from("usuarios_app").select("id").eq("email", email).eq("ativo", true).maybeSingle();
    criadoPor = usuario?.id ?? null;
  }
  return { supabase, criadoPor };
}

async function buscarNotaEmConferencia(supabase: SupabaseClient, idNota: string) {
  if (!isUuid(idNota)) return null;
  const { data } = await supabase
    .from("notas_entrada")
    .select("id,status,id_fornecedor,fornecedor_cnpj,fornecedor_razao_social,fornecedor_inscricao_estadual")
    .eq("id", idNota)
    .maybeSingle();
  return data?.status === "em_conferencia" ? data : null;
}

async function memorizarMapeamento(
  supabase: SupabaseClient,
  criadoPor: string | null,
  idFornecedor: string | null,
  linha: { codigo_produto_fornecedor: string | null; descricao_produto: string; unidade_comercial: string },
  idItem: string,
  unidadeDestino: string,
  fator: number
) {
  if (!idFornecedor || !linha.codigo_produto_fornecedor) return null;
  const { error } = await supabase.from("mapeamentos_itens_fornecedores").upsert({
    id_fornecedor: idFornecedor,
    codigo_produto_fornecedor: linha.codigo_produto_fornecedor,
    descricao_produto_fornecedor: linha.descricao_produto,
    unidade_fornecedor: linha.unidade_comercial,
    id_item: idItem,
    codigo_unidade_destino: unidadeDestino,
    fator_conversao: fator,
    ativo: true,
    criado_por: criadoPor
  }, { onConflict: "id_fornecedor,codigo_produto_fornecedor" });
  return error;
}

async function aplicarMapeamentosDoFornecedor(supabase: SupabaseClient, idNota: string, idFornecedor: string) {
  const [{ data: linhas }, { data: mapeamentos }] = await Promise.all([
    supabase
      .from("itens_notas_entrada")
      .select("id,codigo_produto_fornecedor,quantidade_comercial,valor_liquido,id_item,ignorado")
      .eq("id_nota_entrada", idNota),
    supabase
      .from("mapeamentos_itens_fornecedores")
      .select("codigo_produto_fornecedor,id_item,codigo_unidade_destino,fator_conversao")
      .eq("id_fornecedor", idFornecedor)
      .eq("ativo", true)
  ]);
  const mapa = new Map((mapeamentos ?? []).map((item) => [item.codigo_produto_fornecedor, item]));
  const atualizacoes = (linhas ?? [])
    .filter((linha) => !linha.id_item && !linha.ignorado && linha.codigo_produto_fornecedor && mapa.has(linha.codigo_produto_fornecedor))
    .map((linha) => {
      const mapeamento = mapa.get(linha.codigo_produto_fornecedor!)!;
      const fator = Number(mapeamento.fator_conversao);
      const quantidade = Number(linha.quantidade_comercial) * fator;
      return supabase.from("itens_notas_entrada").update({
        id_item: mapeamento.id_item,
        codigo_unidade_destino: mapeamento.codigo_unidade_destino,
        fator_conversao: fator,
        quantidade_convertida: quantidade,
        custo_unitario_convertido: quantidade > 0 ? Number(linha.valor_liquido) / quantidade : null
      }).eq("id", linha.id);
    });
  if (atualizacoes.length) await Promise.all(atualizacoes);
}

async function memorizarVinculosDaNota(
  supabase: SupabaseClient,
  criadoPor: string | null,
  idNota: string,
  idFornecedor: string
) {
  const { data: linhas } = await supabase
    .from("itens_notas_entrada")
    .select("codigo_produto_fornecedor,descricao_produto,unidade_comercial,id_item,codigo_unidade_destino,fator_conversao,ignorado")
    .eq("id_nota_entrada", idNota);
  const mapeamentos = (linhas ?? [])
    .filter((linha) => !linha.ignorado && linha.codigo_produto_fornecedor && linha.id_item && linha.codigo_unidade_destino)
    .map((linha) => ({
      id_fornecedor: idFornecedor,
      codigo_produto_fornecedor: linha.codigo_produto_fornecedor!,
      descricao_produto_fornecedor: linha.descricao_produto,
      unidade_fornecedor: linha.unidade_comercial,
      id_item: linha.id_item!,
      codigo_unidade_destino: linha.codigo_unidade_destino!,
      fator_conversao: Number(linha.fator_conversao),
      ativo: true,
      criado_por: criadoPor
    }));
  if (mapeamentos.length) {
    await supabase.from("mapeamentos_itens_fornecedores").upsert(mapeamentos, {
      onConflict: "id_fornecedor,codigo_produto_fornecedor"
    });
  }
}

export async function vincularFornecedorNota(formData: FormData) {
  const idNota = texto(formData, "id_nota");
  const idFornecedor = texto(formData, "id_fornecedor");
  if (!isUuid(idNota) || !isUuid(idFornecedor)) retorno(idNota || "invalida", "Selecione um fornecedor válido.", true);
  const { supabase, criadoPor } = await autenticado(idNota);
  const nota = await buscarNotaEmConferencia(supabase, idNota);
  if (!nota) retorno(idNota, "A nota não está disponível para conferência.", true);

  const { data: fornecedor, error } = await supabase
    .from("fornecedores")
    .select("id,cnpj,ativo")
    .eq("id", idFornecedor)
    .maybeSingle();
  if (error || !fornecedor || !fornecedor.ativo) retorno(idNota, "Fornecedor não encontrado ou inativo.", true);
  if (fornecedor.cnpj && fornecedor.cnpj !== nota.fornecedor_cnpj) {
    retorno(idNota, "O CNPJ do fornecedor selecionado é diferente do CNPJ da nota.", true);
  }
  if (!fornecedor.cnpj && nota.fornecedor_cnpj) {
    const { error: erroCnpj } = await supabase.from("fornecedores").update({ cnpj: nota.fornecedor_cnpj }).eq("id", fornecedor.id);
    if (erroCnpj) retorno(idNota, "Não foi possível associar o CNPJ ao fornecedor selecionado.", true);
  }
  const { error: erroNota } = await supabase.from("notas_entrada").update({ id_fornecedor: fornecedor.id }).eq("id", idNota);
  if (erroNota) retorno(idNota, "Não foi possível vincular o fornecedor à nota.", true);
  await memorizarVinculosDaNota(supabase, criadoPor, idNota, fornecedor.id);
  await aplicarMapeamentosDoFornecedor(supabase, idNota, fornecedor.id);
  revalidatePath(`/estoque/notas/${idNota}`);
  retorno(idNota, "Fornecedor vinculado. Mapeamentos conhecidos foram aplicados.");
}

export async function criarFornecedorDaNota(formData: FormData) {
  const idNota = texto(formData, "id_nota");
  if (!isUuid(idNota)) retorno(idNota || "invalida", "Nota inválida.", true);
  const { supabase, criadoPor } = await autenticado(idNota);
  const nota = await buscarNotaEmConferencia(supabase, idNota);
  if (!nota || !nota.fornecedor_cnpj || !/^\d{14}$/.test(nota.fornecedor_cnpj)) {
    retorno(idNota, "A nota não possui um CNPJ válido para criar o fornecedor.", true);
  }

  const nome = decodificarEntidadesXmlBasicas(nota.fornecedor_razao_social?.trim() || `Fornecedor ${nota.fornecedor_cnpj}`);
  const [{ data: porCnpj }, { data: porNome }] = await Promise.all([
    supabase.from("fornecedores").select("id,cnpj").eq("cnpj", nota.fornecedor_cnpj).maybeSingle(),
    supabase.from("fornecedores").select("id,cnpj").eq("nome", nome).maybeSingle()
  ]);
  let idFornecedor = porCnpj?.id ?? porNome?.id ?? null;
  if (!porCnpj && porNome?.cnpj && porNome.cnpj !== nota.fornecedor_cnpj) {
    retorno(idNota, "Já existe um fornecedor com esse nome e outro CNPJ. Faça o vínculo manualmente.", true);
  }

  if (idFornecedor) {
    const { error } = await supabase.from("fornecedores").update({ cnpj: nota.fornecedor_cnpj, ativo: true }).eq("id", idFornecedor);
    if (error) retorno(idNota, "Não foi possível atualizar o fornecedor existente.", true);
  } else {
    const { data: novo, error } = await supabase.from("fornecedores").insert({
      nome,
      cnpj: nota.fornecedor_cnpj,
      observacoes: nota.fornecedor_inscricao_estadual ? `Inscrição estadual: ${nota.fornecedor_inscricao_estadual}` : null
    }).select("id").single();
    if (error || !novo) retorno(idNota, "Não foi possível cadastrar o fornecedor da nota.", true);
    idFornecedor = novo.id;
  }

  const { error: erroNota } = await supabase.from("notas_entrada").update({ id_fornecedor: idFornecedor }).eq("id", idNota);
  if (erroNota) retorno(idNota, "O fornecedor foi criado, mas não pôde ser vinculado à nota.", true);
  await memorizarVinculosDaNota(supabase, criadoPor, idNota, idFornecedor);
  await aplicarMapeamentosDoFornecedor(supabase, idNota, idFornecedor);
  revalidatePath(`/estoque/notas/${idNota}`);
  retorno(idNota, "Fornecedor cadastrado e vinculado à nota.");
}

export async function salvarConferenciaItem(formData: FormData) {
  const idNota = texto(formData, "id_nota");
  const idItemNota = texto(formData, "id_item_nota");
  if (!isUuid(idNota) || !isUuid(idItemNota)) retorno(idNota || "invalida", "Item da nota inválido.", true);
  const { supabase, criadoPor } = await autenticado(idNota);
  const nota = await buscarNotaEmConferencia(supabase, idNota);
  if (!nota) retorno(idNota, "A nota não está disponível para conferência.", true, idItemNota);
  const { data: linha, error: erroLinha } = await supabase
    .from("itens_notas_entrada")
    .select("id,codigo_produto_fornecedor,descricao_produto,unidade_comercial,quantidade_comercial,valor_liquido")
    .eq("id", idItemNota)
    .eq("id_nota_entrada", idNota)
    .maybeSingle();
  if (erroLinha || !linha) retorno(idNota, "Item não encontrado nesta nota.", true, idItemNota);

  const ignorado = texto(formData, "ignorado") === "on";
  if (ignorado) {
    const { error } = await supabase.from("itens_notas_entrada").update({
      ignorado: true,
      id_item: null,
      codigo_unidade_destino: null,
      fator_conversao: 1,
      quantidade_convertida: null,
      custo_unitario_convertido: null
    }).eq("id", idItemNota).eq("id_nota_entrada", idNota);
    if (error) retorno(idNota, "Não foi possível ignorar este item.", true, idItemNota);
    revalidatePath(`/estoque/notas/${idNota}`);
    retorno(idNota, "Item marcado para não entrar no estoque.", false, idItemNota);
  }

  const idItem = texto(formData, "id_item");
  const fator = numero(formData, "fator_conversao");
  if (!isUuid(idItem) || fator === null || fator <= 0) retorno(idNota, "Selecione o item e informe um fator maior que zero.", true, idItemNota);
  const { data: item, error: erroItem } = await supabase
    .from("itens")
    .select("id,codigo_unidade,ativo")
    .eq("id", idItem)
    .maybeSingle();
  if (erroItem || !item || !item.ativo) retorno(idNota, "O item selecionado não existe ou está inativo.", true, idItemNota);
  const unidadeInformada = texto(formData, "codigo_unidade_destino");
  if (unidadeInformada !== item.codigo_unidade) retorno(idNota, "A unidade de destino deve ser a unidade cadastrada no item.", true, idItemNota);

  const quantidadeConvertida = Number(linha.quantidade_comercial) * fator;
  const custoConvertido = quantidadeConvertida > 0 ? Number(linha.valor_liquido) / quantidadeConvertida : null;
  const { error } = await supabase.from("itens_notas_entrada").update({
    id_item: item.id,
    codigo_unidade_destino: item.codigo_unidade,
    fator_conversao: fator,
    quantidade_convertida: quantidadeConvertida,
    custo_unitario_convertido: custoConvertido,
    ignorado: false
  }).eq("id", idItemNota).eq("id_nota_entrada", idNota);
  if (error) retorno(idNota, "Não foi possível salvar o vínculo deste item.", true, idItemNota);

  const erroMapeamento = await memorizarMapeamento(supabase, criadoPor, nota.id_fornecedor, linha, item.id, item.codigo_unidade, fator);
  revalidatePath(`/estoque/notas/${idNota}`);
  retorno(
    idNota,
    erroMapeamento ? "Vínculo salvo, mas o mapeamento automático precisará ser tentado novamente." : "Item vinculado e conversão salva.",
    Boolean(erroMapeamento),
    idItemNota
  );
}

export async function criarItemDaNota(formData: FormData) {
  const idNota = texto(formData, "id_nota");
  const idItemNota = texto(formData, "id_item_nota");
  if (!isUuid(idNota) || !isUuid(idItemNota)) retorno(idNota || "invalida", "Item da nota inválido.", true);
  const { supabase, criadoPor } = await autenticado(idNota);
  const nota = await buscarNotaEmConferencia(supabase, idNota);
  if (!nota) retorno(idNota, "A nota não está disponível para conferência.", true, idItemNota);
  const { data: linha } = await supabase
    .from("itens_notas_entrada")
    .select("id,codigo_produto_fornecedor,descricao_produto,unidade_comercial,quantidade_comercial,valor_liquido")
    .eq("id", idItemNota)
    .eq("id_nota_entrada", idNota)
    .maybeSingle();
  if (!linha) retorno(idNota, "Item não encontrado nesta nota.", true, idItemNota);

  const nome = texto(formData, "nome");
  const codigoItem = texto(formData, "codigo_item");
  const codigoGrupo = texto(formData, "codigo_grupo").toUpperCase();
  const codigoUnidade = texto(formData, "codigo_unidade");
  const estoqueMinimo = numero(formData, "estoque_minimo");
  const fator = numero(formData, "fator_conversao");
  if (!nome || !/^\d{4,12}$/.test(codigoItem) || !codigoGrupo || !codigoUnidade || estoqueMinimo === null || fator === null || fator <= 0) {
    retorno(idNota, "Preencha nome, código, grupo, unidade e conversão válidos.", true, idItemNota);
  }

  const [{ data: grupo }, { data: unidade }] = await Promise.all([
    supabase.from("grupos_itens").select("codigo,nome,codigo_categoria,ativo").eq("codigo", codigoGrupo).maybeSingle(),
    supabase.from("unidades").select("codigo").eq("codigo", codigoUnidade).maybeSingle()
  ]);
  if (!grupo?.ativo || !unidade) retorno(idNota, "Grupo ou unidade inválidos.", true, idItemNota);
  const tipo = grupo.codigo_categoria === "EMB" ? "embalagem" : grupo.codigo_categoria === "PA" ? "produto_acabado" : "ingrediente";
  const quantidadeConvertida = Number(linha.quantidade_comercial) * fator;
  const custoUnitario = quantidadeConvertida > 0 ? Number(linha.valor_liquido) / quantidadeConvertida : 0;
  const { data: item, error: erroCriacao } = await supabase.from("itens").insert({
    nome,
    tipo,
    codigo_item: codigoItem,
    codigo_grupo: grupo.codigo,
    categoria: grupo.nome,
    codigo_unidade: codigoUnidade,
    estoque_minimo: estoqueMinimo,
    custo_referencia: custoUnitario,
    observacoes: `Criado durante a conferência da NF ${texto(formData, "numero_nota") || "importada"}.`
  }).select("id").single();
  if (erroCriacao || !item) retorno(idNota, "Não foi possível criar o item. Verifique se o código ou o nome já existem.", true, idItemNota);

  const { error: erroVinculo } = await supabase.from("itens_notas_entrada").update({
    id_item: item.id,
    codigo_unidade_destino: codigoUnidade,
    fator_conversao: fator,
    quantidade_convertida: quantidadeConvertida,
    custo_unitario_convertido: custoUnitario,
    ignorado: false
  }).eq("id", idItemNota).eq("id_nota_entrada", idNota);
  if (erroVinculo) {
    await supabase.from("itens").delete().eq("id", item.id);
    retorno(idNota, "O item não foi criado porque não pôde ser vinculado à nota.", true, idItemNota);
  }
  const erroMapeamento = await memorizarMapeamento(supabase, criadoPor, nota.id_fornecedor, linha, item.id, codigoUnidade, fator);
  revalidatePath(`/estoque/notas/${idNota}`);
  retorno(
    idNota,
    erroMapeamento ? "Item criado e vinculado, mas o mapeamento do fornecedor ficou pendente." : "Item criado, vinculado e memorizado para próximas notas.",
    Boolean(erroMapeamento),
    idItemNota
  );
}
