-- Prepara consumos para brassagens demonstrativas antigas que foram criadas
-- antes da abertura de brassagens passar a copiar a receita automaticamente.
insert into public.consumos_brassagem (
  id_brassagem,
  id_insumo_receita,
  id_item,
  etapa,
  quantidade_prevista
)
select
  b.id,
  ir.id,
  ir.id_item,
  ir.etapa,
  ir.quantidade_prevista
from public.brassagens b
join public.insumos_receita ir on ir.id_versao_receita = b.id_versao_receita
where not exists (
  select 1
  from public.consumos_brassagem cb
  where cb.id_brassagem = b.id
);
