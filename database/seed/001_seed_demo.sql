-- Dados de demonstracao.
-- Rodar depois das migracoes em database/migrations.

insert into public.unidades (codigo, nome, tipo, casas_decimais) values
  ('kg', 'Quilograma', 'mass', 3),
  ('g', 'Grama', 'mass', 3),
  ('l', 'Litro', 'volume', 3),
  ('ml', 'Mililitro', 'volume', 3),
  ('un', 'Unidade', 'count', 0),
  ('pct', 'Pacote', 'count', 0),
  ('cil', 'Cilindro', 'count', 0)
on conflict (codigo) do nothing;

insert into public.usuarios_app (nome, email, perfil) values
  ('Jose Manuel', 'jmolinas86@gmail.com', 'admin')
on conflict (email) do nothing;

insert into public.categorias_itens (codigo, nome) values
  ('ING', 'Ingredientes'), ('EMB', 'Embalagens'), ('PA', 'Produtos acabados')
on conflict (codigo) do nothing;

insert into public.grupos_itens (codigo, nome, codigo_categoria) values
  ('MAL', 'Malte', 'ING'), ('LUP', 'Lúpulo', 'ING'), ('LEV', 'Levedura', 'ING'),
  ('SAN', 'Sanitizante', 'ING'), ('DIV', 'Diversos', 'ING'),
  ('EMB', 'Embalagem', 'EMB'), ('PA', 'Produto acabado', 'PA')
on conflict (codigo) do nothing;

insert into public.fornecedores (nome, nome_contato, email, observacoes) values
  ('BestMalz Brasil', 'Comercial', null, 'Fornecedor simples para maltes'),
  ('YCH Hops Brasil', 'Comercial', null, 'Fornecedor simples para lupulos'),
  ('Fermentis', 'Comercial', null, 'Fornecedor simples para leveduras')
on conflict (nome) do nothing;

insert into public.itens (codigo_item, codigo_grupo, nome, tipo, categoria, codigo_unidade, estoque_minimo, custo_referencia) values
  ('MAL-0001', 'MAL', 'Malte Pilsen', 'ingrediente', 'Malte', 'kg', 10.000, 7.2000),
  ('LUP-0001', 'LUP', 'Lupulo Citra', 'ingrediente', 'Lupulo', 'g', 500.000, 0.1550),
  ('LEV-0001', 'LEV', 'Levedura US-05', 'ingrediente', 'Levedura', 'pct', 2.000, 28.0000),
  ('EMB-0001', 'EMB', 'Garrafa 600 ml', 'embalagem', 'Embalagem', 'un', 100.000, 1.1000)
on conflict (nome, tipo) do nothing;

insert into public.lotes_itens (id_item, codigo_item, codigo_grupo, id_fornecedor, codigo_lote, validade, custo_unitario, recebido_em)
select i.id, i.codigo_item, i.codigo_grupo, f.id, x.codigo_lote, x.validade::date, x.custo_unitario, current_date
from (
  values
    ('Malte Pilsen', 'ingrediente'::public.tipo_item, 'PIL-2406', '2026-06-30', 7.2000, 'BestMalz Brasil'),
    ('Lupulo Citra', 'ingrediente'::public.tipo_item, 'CIT-2407', '2026-08-15', 0.1550, 'YCH Hops Brasil'),
    ('Levedura US-05', 'ingrediente'::public.tipo_item, 'LEV-2405', '2026-12-12', 28.0000, 'Fermentis'),
    ('Garrafa 600 ml', 'embalagem'::public.tipo_item, 'GAR-2404', null, 1.1000, null)
) as x(nome_item, tipo_item, codigo_lote, validade, custo_unitario, nome_fornecedor)
join public.itens i on i.nome = x.nome_item and i.tipo = x.tipo_item
left join public.fornecedores f on f.nome = x.nome_fornecedor
on conflict (id_item, codigo_lote) do nothing;

insert into public.movimentacoes_estoque (id_item, codigo_item, codigo_grupo, id_lote, tipo_movimentacao, quantidade, custo_unitario, observacoes)
select i.id, i.codigo_item, i.codigo_grupo, l.id, 'compra', x.quantidade, l.custo_unitario, 'Estoque inicial de demonstracao'
from (
  values
    ('Malte Pilsen', 'ingrediente'::public.tipo_item, 'PIL-2406', 25.000),
    ('Lupulo Citra', 'ingrediente'::public.tipo_item, 'CIT-2407', 1000.000),
    ('Levedura US-05', 'ingrediente'::public.tipo_item, 'LEV-2405', 5.000),
    ('Garrafa 600 ml', 'embalagem'::public.tipo_item, 'GAR-2404', 120.000)
) as x(nome_item, tipo_item, codigo_lote, quantidade)
join public.itens i on i.nome = x.nome_item and i.tipo = x.tipo_item
join public.lotes_itens l on l.id_item = i.id and l.codigo_lote = x.codigo_lote
where not exists (
  select 1
  from public.movimentacoes_estoque me
  where me.id_lote = l.id
    and me.tipo_movimentacao = 'compra'
    and me.observacoes = 'Estoque inicial de demonstracao'
);

insert into public.receitas (nome, estilo, volume_previsto_litros, observacoes) values
  ('IPA Citra 20 L', 'American IPA', 20.000, 'Receita demonstrativa para validar estoque, brassagem e custo real')
on conflict (nome) do nothing;

insert into public.versoes_receitas (id_receita, numero_versao, og_previsto, fg_previsto, abv_previsto, ibu_previsto, observacoes)
select r.id, 1, 1.060, 1.012, 6.30, 60.00, 'Versao inicial demonstrativa'
from public.receitas r
where r.nome = 'IPA Citra 20 L'
on conflict (id_receita, numero_versao) do nothing;

insert into public.insumos_receita (id_versao_receita, id_item, etapa, quantidade_prevista, ordem)
select vr.id, i.id, x.etapa, x.quantidade_prevista, x.ordem
from (
  values
    ('Malte Pilsen', 'ingrediente'::public.tipo_item, 'mostura'::public.etapa_brassagem, 5.000, 10),
    ('Lupulo Citra', 'ingrediente'::public.tipo_item, 'fervura'::public.etapa_brassagem, 100.000, 20),
    ('Levedura US-05', 'ingrediente'::public.tipo_item, 'fermentacao'::public.etapa_brassagem, 1.000, 30)
) as x(nome_item, tipo_item, etapa, quantidade_prevista, ordem)
join public.receitas r on r.nome = 'IPA Citra 20 L'
join public.versoes_receitas vr on vr.id_receita = r.id and vr.numero_versao = 1
join public.itens i on i.nome = x.nome_item and i.tipo = x.tipo_item
on conflict (id_versao_receita, id_item, etapa, ordem) do nothing;

insert into public.brassagens (
  numero_brassagem,
  id_versao_receita,
  status,
  etapa_atual,
  volume_previsto_litros,
  iniciada_em,
  observacoes
)
select
  'BR-0001',
  vr.id,
  'em_andamento',
  'fermentacao',
  20.000,
  now(),
  'Brassagem demonstrativa ainda sem desconto de estoque. O desconto ocorre ao finalizar.'
from public.receitas r
join public.versoes_receitas vr on vr.id_receita = r.id and vr.numero_versao = 1
where r.nome = 'IPA Citra 20 L'
on conflict (numero_brassagem) do nothing;
