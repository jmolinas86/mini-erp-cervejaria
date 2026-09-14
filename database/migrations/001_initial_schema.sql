-- Mini ERP Cervejaria - Initial PostgreSQL schema
-- Phase 2 decision summary:
-- 1. Suppliers are included as a simple MVP cadastro.
-- 2. Finished product is tracked as final volume on the brewing batch, not as separate stock.
-- 3. Stock is deducted only when the brewing batch is finalized.

create extension if not exists pgcrypto;

create type public.item_type as enum (
  'ingredient',
  'packaging',
  'finished_product'
);

create type public.stock_movement_type as enum (
  'purchase',
  'manual_in',
  'manual_out',
  'adjustment_in',
  'adjustment_out',
  'batch_consumption',
  'loss'
);

create type public.brew_batch_status as enum (
  'draft',
  'in_progress',
  'finalized',
  'cancelled'
);

create type public.batch_stage as enum (
  'planning',
  'mash',
  'boil',
  'fermentation',
  'packaging',
  'finalized'
);

create type public.batch_extra_cost_type as enum (
  'packaging',
  'utilities',
  'sanitizer',
  'labor',
  'other'
);

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text unique not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_unique unique (name)
);

create table public.units (
  code text primary key,
  name text not null,
  kind text not null,
  decimal_places int not null default 3,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.item_type not null,
  category text not null,
  unit_code text not null references public.units(code),
  minimum_stock numeric(14, 3) not null default 0 check (minimum_stock >= 0),
  reference_cost numeric(14, 4) check (reference_cost is null or reference_cost >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_name_type_unique unique (name, type)
);

create table public.item_lots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  supplier_id uuid references public.suppliers(id),
  lot_code text not null,
  expires_on date,
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  received_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_lots_item_code_unique unique (item_id, lot_code)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  lot_id uuid references public.item_lots(id),
  movement_type public.stock_movement_type not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 4) check (unit_cost is null or unit_cost >= 0),
  occurred_at timestamptz not null default now(),
  source_table text,
  source_id uuid,
  notes text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  constraint stock_movement_lot_item_required check (
    lot_id is null or item_id is not null
  )
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  style text,
  target_volume_liters numeric(12, 3) not null check (target_volume_liters > 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id),
  version_number int not null check (version_number > 0),
  target_og numeric(8, 3),
  target_fg numeric(8, 3),
  target_abv numeric(5, 2),
  target_ibu numeric(8, 2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_versions_unique unique (recipe_id, version_number)
);

create table public.recipe_inputs (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  item_id uuid not null references public.items(id),
  stage public.batch_stage not null default 'planning',
  planned_quantity numeric(14, 3) not null check (planned_quantity > 0),
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint recipe_inputs_unique unique (recipe_version_id, item_id, stage, sort_order)
);

create table public.brew_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  recipe_version_id uuid not null references public.recipe_versions(id),
  status public.brew_batch_status not null default 'draft',
  current_stage public.batch_stage not null default 'planning',
  planned_volume_liters numeric(12, 3) not null check (planned_volume_liters > 0),
  final_volume_liters numeric(12, 3) check (final_volume_liters is null or final_volume_liters >= 0),
  started_at timestamptz,
  finalized_at timestamptz,
  stock_posted_at timestamptz,
  notes text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finalized_batches_need_final_volume check (
    status <> 'finalized' or final_volume_liters is not null
  ),
  constraint stock_posted_only_after_finalized check (
    stock_posted_at is null or status = 'finalized'
  )
);

create table public.brew_batch_consumptions (
  id uuid primary key default gen_random_uuid(),
  brew_batch_id uuid not null references public.brew_batches(id) on delete cascade,
  recipe_input_id uuid references public.recipe_inputs(id),
  item_id uuid not null references public.items(id),
  lot_id uuid references public.item_lots(id),
  stage public.batch_stage not null default 'planning',
  planned_quantity numeric(14, 3) check (planned_quantity is null or planned_quantity >= 0),
  actual_quantity numeric(14, 3) check (actual_quantity is null or actual_quantity >= 0),
  stock_movement_id uuid unique references public.stock_movements(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brew_batch_extra_costs (
  id uuid primary key default gen_random_uuid(),
  brew_batch_id uuid not null references public.brew_batches(id) on delete cascade,
  cost_type public.batch_extra_cost_type not null,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  occurred_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.brew_batch_events (
  id uuid primary key default gen_random_uuid(),
  brew_batch_id uuid not null references public.brew_batches(id) on delete cascade,
  stage public.batch_stage not null,
  event_at timestamptz not null default now(),
  description text not null,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);

create index idx_items_type on public.items(type);
create index idx_item_lots_item_id on public.item_lots(item_id);
create index idx_item_lots_expires_on on public.item_lots(expires_on);
create index idx_stock_movements_item_id on public.stock_movements(item_id);
create index idx_stock_movements_lot_id on public.stock_movements(lot_id);
create index idx_stock_movements_occurred_at on public.stock_movements(occurred_at);
create index idx_recipe_versions_recipe_id on public.recipe_versions(recipe_id);
create index idx_recipe_inputs_version_id on public.recipe_inputs(recipe_version_id);
create index idx_brew_batches_status on public.brew_batches(status);
create index idx_brew_batch_consumptions_batch_id on public.brew_batch_consumptions(brew_batch_id);
create index idx_brew_batch_extra_costs_batch_id on public.brew_batch_extra_costs(brew_batch_id);
create index idx_brew_batch_events_batch_id on public.brew_batch_events(brew_batch_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger set_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create trigger set_item_lots_updated_at
before update on public.item_lots
for each row execute function public.set_updated_at();

create trigger set_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create trigger set_recipe_versions_updated_at
before update on public.recipe_versions
for each row execute function public.set_updated_at();

create trigger set_brew_batches_updated_at
before update on public.brew_batches
for each row execute function public.set_updated_at();

create trigger set_brew_batch_consumptions_updated_at
before update on public.brew_batch_consumptions
for each row execute function public.set_updated_at();

create or replace view public.v_stock_balances
with (security_invoker = true) as
select
  i.id as item_id,
  i.name as item_name,
  i.type as item_type,
  i.category,
  i.unit_code,
  l.id as lot_id,
  l.lot_code,
  l.expires_on,
  l.unit_cost,
  coalesce(sum(
    case
      when sm.movement_type in ('purchase', 'manual_in', 'adjustment_in') then sm.quantity
      when sm.movement_type in ('manual_out', 'adjustment_out', 'batch_consumption', 'loss') then -sm.quantity
      else 0
    end
  ), 0) as balance_quantity,
  i.minimum_stock,
  case
    when coalesce(sum(
      case
        when sm.movement_type in ('purchase', 'manual_in', 'adjustment_in') then sm.quantity
        when sm.movement_type in ('manual_out', 'adjustment_out', 'batch_consumption', 'loss') then -sm.quantity
        else 0
      end
    ), 0) <= 0 then 'empty'
    when coalesce(sum(
      case
        when sm.movement_type in ('purchase', 'manual_in', 'adjustment_in') then sm.quantity
        when sm.movement_type in ('manual_out', 'adjustment_out', 'batch_consumption', 'loss') then -sm.quantity
        else 0
      end
    ), 0) < i.minimum_stock then 'below_minimum'
    else 'ok'
  end as stock_status
from public.items i
left join public.item_lots l on l.item_id = i.id
left join public.stock_movements sm on sm.item_id = i.id and sm.lot_id is not distinct from l.id
group by i.id, i.name, i.type, i.category, i.unit_code, i.minimum_stock, l.id, l.lot_code, l.expires_on, l.unit_cost;

create or replace view public.v_brew_batch_costs
with (security_invoker = true) as
select
  b.id as brew_batch_id,
  b.batch_number,
  b.status,
  b.planned_volume_liters,
  b.final_volume_liters,
  greatest(b.planned_volume_liters - coalesce(b.final_volume_liters, 0), 0) as loss_liters,
  case
    when b.planned_volume_liters > 0 and b.final_volume_liters is not null
      then greatest(b.planned_volume_liters - b.final_volume_liters, 0) / b.planned_volume_liters
    else null
  end as loss_percent,
  coalesce(sum(c.actual_quantity * l.unit_cost), 0) as ingredients_cost,
  coalesce(extra.extra_cost, 0) as extra_cost,
  coalesce(sum(c.actual_quantity * l.unit_cost), 0) + coalesce(extra.extra_cost, 0) as total_cost,
  case
    when b.final_volume_liters is not null and b.final_volume_liters > 0
      then (coalesce(sum(c.actual_quantity * l.unit_cost), 0) + coalesce(extra.extra_cost, 0)) / b.final_volume_liters
    else null
  end as cost_per_liter
from public.brew_batches b
left join public.brew_batch_consumptions c on c.brew_batch_id = b.id
left join public.item_lots l on l.id = c.lot_id
left join (
  select brew_batch_id, sum(amount) as extra_cost
  from public.brew_batch_extra_costs
  group by brew_batch_id
) extra on extra.brew_batch_id = b.id
group by b.id, b.batch_number, b.status, b.planned_volume_liters, b.final_volume_liters, extra.extra_cost;

comment on table public.brew_batches is 'Finished product is tracked as final_volume_liters on the batch, not as separate inventory in the MVP.';
comment on column public.brew_batches.stock_posted_at is 'Stock deduction is posted only when the brew batch is finalized.';

-- Supabase access model for the single-user MVP.
-- The frontend uses the publishable key and logged-in users use the authenticated role.
-- Anonymous users receive no table policy here.

alter table public.app_users enable row level security;
alter table public.suppliers enable row level security;
alter table public.units enable row level security;
alter table public.items enable row level security;
alter table public.item_lots enable row level security;
alter table public.stock_movements enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_inputs enable row level security;
alter table public.brew_batches enable row level security;
alter table public.brew_batch_consumptions enable row level security;
alter table public.brew_batch_extra_costs enable row level security;
alter table public.brew_batch_events enable row level security;

grant usage on schema public to authenticated;
grant usage on type public.item_type to authenticated;
grant usage on type public.stock_movement_type to authenticated;
grant usage on type public.brew_batch_status to authenticated;
grant usage on type public.batch_stage to authenticated;
grant usage on type public.batch_extra_cost_type to authenticated;

grant select, insert, update on public.app_users to authenticated;
grant select on public.units to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.item_lots to authenticated;
grant select, insert, update, delete on public.stock_movements to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_versions to authenticated;
grant select, insert, update, delete on public.recipe_inputs to authenticated;
grant select, insert, update, delete on public.brew_batches to authenticated;
grant select, insert, update, delete on public.brew_batch_consumptions to authenticated;
grant select, insert, update, delete on public.brew_batch_extra_costs to authenticated;
grant select, insert, update, delete on public.brew_batch_events to authenticated;
grant select on public.v_stock_balances to authenticated;
grant select on public.v_brew_batch_costs to authenticated;

create policy app_users_select_own on public.app_users
for select to authenticated
using (auth_user_id = (select auth.uid()));

create policy app_users_insert_own on public.app_users
for insert to authenticated
with check (auth_user_id = (select auth.uid()));

create policy app_users_update_own on public.app_users
for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

create policy units_read_authenticated on public.units
for select to authenticated
using ((select auth.uid()) is not null);

create policy suppliers_manage_authenticated on public.suppliers
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy items_manage_authenticated on public.items
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy item_lots_manage_authenticated on public.item_lots
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy stock_movements_manage_authenticated on public.stock_movements
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy recipes_manage_authenticated on public.recipes
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy recipe_versions_manage_authenticated on public.recipe_versions
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy recipe_inputs_manage_authenticated on public.recipe_inputs
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy brew_batches_manage_authenticated on public.brew_batches
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy brew_batch_consumptions_manage_authenticated on public.brew_batch_consumptions
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy brew_batch_extra_costs_manage_authenticated on public.brew_batch_extra_costs
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy brew_batch_events_manage_authenticated on public.brew_batch_events
for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);
