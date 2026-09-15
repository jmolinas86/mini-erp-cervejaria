-- Normaliza a referência dos cadastros: categoria -> grupo -> item.

create table if not exists public.categorias_itens (
  codigo text primary key,
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.grupos_itens (
  codigo text primary key,
  nome text not null,
  codigo_categoria text not null references public.categorias_itens(codigo),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_grupos_itens_nome_categoria unique (codigo_categoria, nome)
);

insert into public.categorias_itens (codigo, nome) values
  ('ING', 'Ingredientes'), ('EMB', 'Embalagens'), ('PA', 'Produtos acabados')
on conflict (codigo) do nothing;

insert into public.grupos_itens (codigo, nome, codigo_categoria) values
  ('MAL', 'Malte', 'ING'), ('LUP', 'Lúpulo', 'ING'), ('LEV', 'Levedura', 'ING'),
  ('SAN', 'Sanitizante', 'ING'), ('DIV', 'Diversos', 'ING'),
  ('EMB', 'Embalagem', 'EMB'), ('PA', 'Produto acabado', 'PA')
on conflict (codigo) do nothing;

alter table public.itens add column if not exists codigo_item text;
alter table public.itens add column if not exists codigo_grupo text;

with numerados as (
  select id, 'IT-' || lpad(row_number() over (order by id)::text, 4, '0') as novo_codigo
  from public.itens where codigo_item is null
)
update public.itens i set codigo_item = n.novo_codigo
from numerados n where i.id = n.id;

update public.itens
set codigo_grupo = case
  when lower(categoria) like 'malte%' then 'MAL'
  when lower(categoria) like 'lupulo%' or lower(categoria) like 'lúpulo%' then 'LUP'
  when lower(categoria) like 'levedura%' then 'LEV'
  when lower(categoria) like 'sanitizante%' then 'SAN'
  when lower(categoria) like 'embalagem%' then 'EMB'
  else 'DIV'
end
where codigo_grupo is null;

alter table public.itens alter column codigo_item set not null;
alter table public.itens alter column codigo_grupo set not null;
alter table public.itens add constraint uq_itens_codigo_item unique (codigo_item);
alter table public.itens add constraint fk_itens_codigo_grupo foreign key (codigo_grupo) references public.grupos_itens(codigo);

alter table public.lotes_itens add column if not exists codigo_item text;
alter table public.lotes_itens add column if not exists codigo_grupo text;
update public.lotes_itens l set codigo_item=i.codigo_item, codigo_grupo=i.codigo_grupo from public.itens i where l.id_item=i.id;
alter table public.lotes_itens alter column codigo_item set not null;
alter table public.lotes_itens alter column codigo_grupo set not null;
alter table public.lotes_itens add constraint fk_lotes_itens_codigo_item foreign key (codigo_item) references public.itens(codigo_item);
alter table public.lotes_itens add constraint fk_lotes_itens_codigo_grupo foreign key (codigo_grupo) references public.grupos_itens(codigo);

alter table public.movimentacoes_estoque add column if not exists codigo_item text;
alter table public.movimentacoes_estoque add column if not exists codigo_grupo text;
update public.movimentacoes_estoque m set codigo_item=i.codigo_item, codigo_grupo=i.codigo_grupo from public.itens i where m.id_item=i.id;
alter table public.movimentacoes_estoque alter column codigo_item set not null;
alter table public.movimentacoes_estoque alter column codigo_grupo set not null;
alter table public.movimentacoes_estoque add constraint fk_movimentacoes_codigo_item foreign key (codigo_item) references public.itens(codigo_item);
alter table public.movimentacoes_estoque add constraint fk_movimentacoes_codigo_grupo foreign key (codigo_grupo) references public.grupos_itens(codigo);

alter table public.categorias_itens enable row level security;
alter table public.grupos_itens enable row level security;
grant select, insert, update on public.categorias_itens to authenticated;
grant select, insert, update on public.grupos_itens to authenticated;
create policy pl_categorias_itens_gerenciar_autenticado on public.categorias_itens for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy pl_grupos_itens_gerenciar_autenticado on public.grupos_itens for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
