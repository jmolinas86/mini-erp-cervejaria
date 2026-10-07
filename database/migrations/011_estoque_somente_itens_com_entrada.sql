-- Exibe no estoque apenas lotes que possuem ao menos uma entrada registrada.
create or replace view public.vw_saldos_estoque
with (security_invoker = true) as
select
  i.id as id_item,
  i.nome as nome_item,
  i.tipo as tipo_item,
  i.categoria,
  i.codigo_unidade,
  l.id as id_lote,
  l.codigo_lote,
  l.validade,
  l.custo_unitario,
  coalesce(sum(
    case
      when me.tipo_movimentacao in ('compra', 'entrada_manual', 'ajuste_entrada') then me.quantidade
      when me.tipo_movimentacao in ('saida_manual', 'ajuste_saida', 'consumo_brassagem', 'perda') then -me.quantidade
      else 0
    end
  ), 0) as quantidade_saldo,
  i.estoque_minimo,
  case
    when coalesce(sum(
      case
        when me.tipo_movimentacao in ('compra', 'entrada_manual', 'ajuste_entrada') then me.quantidade
        when me.tipo_movimentacao in ('saida_manual', 'ajuste_saida', 'consumo_brassagem', 'perda') then -me.quantidade
        else 0
      end
    ), 0) <= 0 then 'vazio'
    when coalesce(sum(
      case
        when me.tipo_movimentacao in ('compra', 'entrada_manual', 'ajuste_entrada') then me.quantidade
        when me.tipo_movimentacao in ('saida_manual', 'ajuste_saida', 'consumo_brassagem', 'perda') then -me.quantidade
        else 0
      end
    ), 0) < i.estoque_minimo then 'abaixo_minimo'
    else 'ok'
  end as status_estoque
from public.itens i
join public.lotes_itens l on l.id_item = i.id
left join public.movimentacoes_estoque me on me.id_item = i.id and me.id_lote = l.id
where exists (
  select 1
  from public.movimentacoes_estoque me_entrada
  where me_entrada.id_lote = l.id
    and me_entrada.tipo_movimentacao in ('compra', 'entrada_manual', 'ajuste_entrada')
)
group by i.id, i.nome, i.tipo, i.categoria, i.codigo_unidade, i.estoque_minimo, l.id, l.codigo_lote, l.validade, l.custo_unitario;

grant select on public.vw_saldos_estoque to authenticated;
