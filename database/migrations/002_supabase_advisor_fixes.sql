-- Supabase advisor fixes after initial schema validation.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index idx_items_unit_code on public.items(unit_code);
create index idx_item_lots_supplier_id on public.item_lots(supplier_id);
create index idx_stock_movements_created_by on public.stock_movements(created_by);
create index idx_recipe_inputs_item_id on public.recipe_inputs(item_id);
create index idx_brew_batches_recipe_version_id on public.brew_batches(recipe_version_id);
create index idx_brew_batches_created_by on public.brew_batches(created_by);
create index idx_brew_batch_consumptions_recipe_input_id on public.brew_batch_consumptions(recipe_input_id);
create index idx_brew_batch_consumptions_item_id on public.brew_batch_consumptions(item_id);
create index idx_brew_batch_consumptions_lot_id on public.brew_batch_consumptions(lot_id);
create index idx_brew_batch_events_created_by on public.brew_batch_events(created_by);
