select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'usuarios_app',
    'fornecedores',
    'unidades',
    'categorias_itens',
    'grupos_itens',
    'itens',
    'lotes_itens',
    'movimentacoes_estoque',
    'receitas',
    'versoes_receitas',
    'insumos_receita',
    'brassagens',
    'consumos_brassagem',
    'custos_extras_brassagem',
    'eventos_brassagem'
  )
order by table_name;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'usuarios_app',
    'fornecedores',
    'unidades',
    'categorias_itens',
    'grupos_itens',
    'itens',
    'lotes_itens',
    'movimentacoes_estoque',
    'receitas',
    'versoes_receitas',
    'insumos_receita',
    'brassagens',
    'consumos_brassagem',
    'custos_extras_brassagem',
    'eventos_brassagem'
  )
order by tablename;

select codigo, nome
from public.unidades
order by codigo;

select nome_item, codigo_lote, quantidade_saldo, status_estoque
from public.vw_saldos_estoque
order by nome_item, codigo_lote;

select numero_brassagem, status, volume_previsto_litros, volume_final_litros, custo_por_litro
from public.vw_custos_brassagem
order by numero_brassagem;

-- Deve retornar zero linhas quando a traducao do modelo estiver completa.
select 'constraint' as tipo, c.relname as tabela, con.conname as nome_antigo
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and con.conname ~ '(app_users|suppliers|units|items|item_lots|stock_movements|stock_movement|recipes|recipe_versions|recipe_inputs|brew_batches|brew_batch|finalized|stock_posted)'
union all
select 'index', tablename, indexname
from pg_indexes
where schemaname = 'public'
  and indexname ~ '(app_users|suppliers|units|items|item_lots|stock_movements|stock_movement|recipes|recipe_versions|recipe_inputs|brew_batches|brew_batch|finalized|stock_posted)'
union all
select 'trigger', event_object_table, trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name ~ '(app_users|suppliers|units|items|item_lots|stock_movements|stock_movement|recipes|recipe_versions|recipe_inputs|brew_batches|brew_batch|finalized|stock_posted)'
union all
select 'policy', tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname ~ '(app_users|suppliers|units|items|item_lots|stock_movements|stock_movement|recipes|recipe_versions|recipe_inputs|brew_batches|brew_batch|finalized|stock_posted)'
order by tipo, tabela, nome_antigo;
