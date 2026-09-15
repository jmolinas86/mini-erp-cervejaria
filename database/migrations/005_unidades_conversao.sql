-- Define a unidade-base e o fator usado para converter entradas de estoque.
-- Massas usam kg como base; volumes usam l; contagens permanecem na própria unidade.

alter table public.unidades add column if not exists unidade_base text;
alter table public.unidades add column if not exists fator_para_base numeric;

update public.unidades
set
  unidade_base = case
    when tipo = 'mass' then 'kg'
    when tipo = 'volume' then 'l'
    else codigo
  end,
  fator_para_base = case
    when codigo in ('g', 'ml') then 0.001
    else 1
  end
where unidade_base is null or fator_para_base is null;

alter table public.unidades alter column unidade_base set not null;
alter table public.unidades alter column fator_para_base set not null;
alter table public.unidades alter column fator_para_base set default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_unidades_fator_para_base_positivo'
  ) then
    alter table public.unidades
      add constraint chk_unidades_fator_para_base_positivo
      check (fator_para_base > 0);
  end if;
end $$;
