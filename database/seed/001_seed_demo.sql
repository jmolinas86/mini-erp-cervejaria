-- Demo data for local review.
-- Safe to run after database/migrations/001_initial_schema.sql.

insert into public.units (code, name, kind, decimal_places) values
  ('kg', 'Quilograma', 'mass', 3),
  ('g', 'Grama', 'mass', 3),
  ('l', 'Litro', 'volume', 3),
  ('ml', 'Mililitro', 'volume', 3),
  ('un', 'Unidade', 'count', 0),
  ('pct', 'Pacote', 'count', 0),
  ('cil', 'Cilindro', 'count', 0)
on conflict (code) do nothing;

insert into public.app_users (name, email, role) values
  ('Jose Manuel', 'jmolinas86@gmail.com', 'admin')
on conflict (email) do nothing;

insert into public.suppliers (name, contact_name, email, notes) values
  ('BestMalz Brasil', 'Comercial', null, 'Fornecedor simples para maltes'),
  ('YCH Hops Brasil', 'Comercial', null, 'Fornecedor simples para lupulos'),
  ('Fermentis', 'Comercial', null, 'Fornecedor simples para leveduras')
on conflict (name) do nothing;

insert into public.items (name, type, category, unit_code, minimum_stock, reference_cost) values
  ('Malte Pilsen', 'ingredient', 'Malte', 'kg', 10.000, 7.2000),
  ('Lupulo Citra', 'ingredient', 'Lupulo', 'g', 500.000, 0.1550),
  ('Levedura US-05', 'ingredient', 'Levedura', 'pct', 2.000, 28.0000),
  ('Garrafa 600 ml', 'packaging', 'Embalagem', 'un', 100.000, 1.1000)
on conflict (name, type) do nothing;

insert into public.item_lots (item_id, supplier_id, lot_code, expires_on, unit_cost, received_at)
select i.id, s.id, x.lot_code, x.expires_on::date, x.unit_cost, current_date
from (
  values
    ('Malte Pilsen', 'ingredient'::public.item_type, 'PIL-2406', '2026-06-30', 7.2000, 'BestMalz Brasil'),
    ('Lupulo Citra', 'ingredient'::public.item_type, 'CIT-2407', '2026-08-15', 0.1550, 'YCH Hops Brasil'),
    ('Levedura US-05', 'ingredient'::public.item_type, 'LEV-2405', '2026-12-12', 28.0000, 'Fermentis'),
    ('Garrafa 600 ml', 'packaging'::public.item_type, 'GAR-2404', null, 1.1000, null)
) as x(item_name, item_type, lot_code, expires_on, unit_cost, supplier_name)
join public.items i on i.name = x.item_name and i.type = x.item_type
left join public.suppliers s on s.name = x.supplier_name
on conflict (item_id, lot_code) do nothing;

insert into public.stock_movements (item_id, lot_id, movement_type, quantity, unit_cost, notes)
select i.id, l.id, 'purchase', x.quantity, l.unit_cost, 'Estoque inicial de demonstracao'
from (
  values
    ('Malte Pilsen', 'ingredient'::public.item_type, 'PIL-2406', 25.000),
    ('Lupulo Citra', 'ingredient'::public.item_type, 'CIT-2407', 1000.000),
    ('Levedura US-05', 'ingredient'::public.item_type, 'LEV-2405', 5.000),
    ('Garrafa 600 ml', 'packaging'::public.item_type, 'GAR-2404', 120.000)
) as x(item_name, item_type, lot_code, quantity)
join public.items i on i.name = x.item_name and i.type = x.item_type
join public.item_lots l on l.item_id = i.id and l.lot_code = x.lot_code
where not exists (
  select 1
  from public.stock_movements sm
  where sm.lot_id = l.id
    and sm.movement_type = 'purchase'
    and sm.notes = 'Estoque inicial de demonstracao'
);

insert into public.recipes (name, style, target_volume_liters, notes) values
  ('IPA Citra 20 L', 'American IPA', 20.000, 'Receita demonstrativa para validar estoque, brassagem e custo real')
on conflict (name) do nothing;

insert into public.recipe_versions (recipe_id, version_number, target_og, target_fg, target_abv, target_ibu, notes)
select r.id, 1, 1.060, 1.012, 6.30, 60.00, 'Versao inicial demonstrativa'
from public.recipes r
where r.name = 'IPA Citra 20 L'
on conflict (recipe_id, version_number) do nothing;

insert into public.recipe_inputs (recipe_version_id, item_id, stage, planned_quantity, sort_order)
select rv.id, i.id, x.stage, x.planned_quantity, x.sort_order
from (
  values
    ('Malte Pilsen', 'ingredient'::public.item_type, 'mash'::public.batch_stage, 5.000, 10),
    ('Lupulo Citra', 'ingredient'::public.item_type, 'boil'::public.batch_stage, 100.000, 20),
    ('Levedura US-05', 'ingredient'::public.item_type, 'fermentation'::public.batch_stage, 1.000, 30)
) as x(item_name, item_type, stage, planned_quantity, sort_order)
join public.recipes r on r.name = 'IPA Citra 20 L'
join public.recipe_versions rv on rv.recipe_id = r.id and rv.version_number = 1
join public.items i on i.name = x.item_name and i.type = x.item_type
on conflict (recipe_version_id, item_id, stage, sort_order) do nothing;

insert into public.brew_batches (
  batch_number,
  recipe_version_id,
  status,
  current_stage,
  planned_volume_liters,
  started_at,
  notes
)
select
  'BR-0001',
  rv.id,
  'in_progress',
  'fermentation',
  20.000,
  now(),
  'Brassagem demonstrativa ainda sem desconto de estoque. O desconto ocorre ao finalizar.'
from public.recipes r
join public.recipe_versions rv on rv.recipe_id = r.id and rv.version_number = 1
where r.name = 'IPA Citra 20 L'
on conflict (batch_number) do nothing;
