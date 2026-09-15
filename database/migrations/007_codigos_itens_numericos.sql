-- Padroniza os códigos de item como numéricos, preservando zeros à esquerda.

alter table public.lotes_itens drop constraint if exists fk_lotes_itens_codigo_item;
alter table public.movimentacoes_estoque drop constraint if exists fk_movimentacoes_codigo_item;

create temporary table mapa_codigos_itens on commit drop as
select id, codigo_item as codigo_antigo,
       lpad(row_number() over (order by id)::text, 4, '0') as codigo_novo
from public.itens;

update public.lotes_itens l
set codigo_item = m.codigo_novo
from mapa_codigos_itens m
where l.id_item = m.id;

update public.movimentacoes_estoque mov
set codigo_item = m.codigo_novo
from mapa_codigos_itens m
where mov.id_item = m.id;

update public.itens i
set codigo_item = m.codigo_novo
from mapa_codigos_itens m
where i.id = m.id;

alter table public.lotes_itens
  add constraint fk_lotes_itens_codigo_item
  foreign key (codigo_item) references public.itens(codigo_item);
alter table public.movimentacoes_estoque
  add constraint fk_movimentacoes_codigo_item
  foreign key (codigo_item) references public.itens(codigo_item);

alter table public.itens drop constraint if exists chk_itens_codigo_item_numerico;
alter table public.itens
  add constraint chk_itens_codigo_item_numerico
  check (codigo_item ~ '^[0-9]{4,12}$');
