select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'app_users',
    'suppliers',
    'units',
    'items',
    'item_lots',
    'stock_movements',
    'recipes',
    'recipe_versions',
    'recipe_inputs',
    'brew_batches',
    'brew_batch_consumptions',
    'brew_batch_extra_costs',
    'brew_batch_events'
  )
order by table_name;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'app_users',
    'suppliers',
    'units',
    'items',
    'item_lots',
    'stock_movements',
    'recipes',
    'recipe_versions',
    'recipe_inputs',
    'brew_batches',
    'brew_batch_consumptions',
    'brew_batch_extra_costs',
    'brew_batch_events'
  )
order by tablename;

select code, name
from public.units
order by code;

select item_name, lot_code, balance_quantity, stock_status
from public.v_stock_balances
order by item_name, lot_code;

select batch_number, status, planned_volume_liters, final_volume_liters, cost_per_liter
from public.v_brew_batch_costs
order by batch_number;
