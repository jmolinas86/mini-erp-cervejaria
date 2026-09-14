-- Traduz tabelas, colunas, tipos e views para portugues.
-- Mantem nomes sem acentos e em snake_case para facilitar uso em SQL e no codigo.

drop view if exists public.v_brew_batch_costs;
drop view if exists public.v_stock_balances;

alter type public.item_type rename to tipo_item;
alter type public.stock_movement_type rename to tipo_movimentacao_estoque;
alter type public.brew_batch_status rename to status_brassagem;
alter type public.batch_stage rename to etapa_brassagem;
alter type public.batch_extra_cost_type rename to tipo_custo_extra_brassagem;

alter type public.tipo_item rename value 'ingredient' to 'ingrediente';
alter type public.tipo_item rename value 'packaging' to 'embalagem';
alter type public.tipo_item rename value 'finished_product' to 'produto_acabado';

alter type public.tipo_movimentacao_estoque rename value 'purchase' to 'compra';
alter type public.tipo_movimentacao_estoque rename value 'manual_in' to 'entrada_manual';
alter type public.tipo_movimentacao_estoque rename value 'manual_out' to 'saida_manual';
alter type public.tipo_movimentacao_estoque rename value 'adjustment_in' to 'ajuste_entrada';
alter type public.tipo_movimentacao_estoque rename value 'adjustment_out' to 'ajuste_saida';
alter type public.tipo_movimentacao_estoque rename value 'batch_consumption' to 'consumo_brassagem';
alter type public.tipo_movimentacao_estoque rename value 'loss' to 'perda';

alter type public.status_brassagem rename value 'draft' to 'rascunho';
alter type public.status_brassagem rename value 'in_progress' to 'em_andamento';
alter type public.status_brassagem rename value 'finalized' to 'finalizada';
alter type public.status_brassagem rename value 'cancelled' to 'cancelada';

alter type public.etapa_brassagem rename value 'planning' to 'planejamento';
alter type public.etapa_brassagem rename value 'mash' to 'mostura';
alter type public.etapa_brassagem rename value 'boil' to 'fervura';
alter type public.etapa_brassagem rename value 'fermentation' to 'fermentacao';
alter type public.etapa_brassagem rename value 'packaging' to 'envase';
alter type public.etapa_brassagem rename value 'finalized' to 'finalizada';

alter type public.tipo_custo_extra_brassagem rename value 'packaging' to 'embalagem';
alter type public.tipo_custo_extra_brassagem rename value 'utilities' to 'utilidades';
alter type public.tipo_custo_extra_brassagem rename value 'sanitizer' to 'sanitizante';
alter type public.tipo_custo_extra_brassagem rename value 'labor' to 'mao_de_obra';
alter type public.tipo_custo_extra_brassagem rename value 'other' to 'outro';

alter table public.app_users rename column auth_user_id to id_usuario_auth;
alter table public.app_users rename column name to nome;
alter table public.app_users rename column role to perfil;
alter table public.app_users rename column is_active to ativo;
alter table public.app_users rename column created_at to criado_em;
alter table public.app_users rename column updated_at to atualizado_em;

alter table public.suppliers rename column name to nome;
alter table public.suppliers rename column contact_name to nome_contato;
alter table public.suppliers rename column phone to telefone;
alter table public.suppliers rename column notes to observacoes;
alter table public.suppliers rename column is_active to ativo;
alter table public.suppliers rename column created_at to criado_em;
alter table public.suppliers rename column updated_at to atualizado_em;

alter table public.units rename column code to codigo;
alter table public.units rename column name to nome;
alter table public.units rename column kind to tipo;
alter table public.units rename column decimal_places to casas_decimais;
alter table public.units rename column created_at to criado_em;

alter table public.items rename column name to nome;
alter table public.items rename column type to tipo;
alter table public.items rename column category to categoria;
alter table public.items rename column unit_code to codigo_unidade;
alter table public.items rename column minimum_stock to estoque_minimo;
alter table public.items rename column reference_cost to custo_referencia;
alter table public.items rename column notes to observacoes;
alter table public.items rename column is_active to ativo;
alter table public.items rename column created_at to criado_em;
alter table public.items rename column updated_at to atualizado_em;

alter table public.item_lots rename column item_id to id_item;
alter table public.item_lots rename column supplier_id to id_fornecedor;
alter table public.item_lots rename column lot_code to codigo_lote;
alter table public.item_lots rename column expires_on to validade;
alter table public.item_lots rename column unit_cost to custo_unitario;
alter table public.item_lots rename column received_at to recebido_em;
alter table public.item_lots rename column notes to observacoes;
alter table public.item_lots rename column created_at to criado_em;
alter table public.item_lots rename column updated_at to atualizado_em;

alter table public.stock_movements rename column item_id to id_item;
alter table public.stock_movements rename column lot_id to id_lote;
alter table public.stock_movements rename column movement_type to tipo_movimentacao;
alter table public.stock_movements rename column quantity to quantidade;
alter table public.stock_movements rename column unit_cost to custo_unitario;
alter table public.stock_movements rename column occurred_at to ocorrido_em;
alter table public.stock_movements rename column source_table to tabela_origem;
alter table public.stock_movements rename column source_id to id_origem;
alter table public.stock_movements rename column notes to observacoes;
alter table public.stock_movements rename column created_by to criado_por;
alter table public.stock_movements rename column created_at to criado_em;

alter table public.recipes rename column name to nome;
alter table public.recipes rename column style to estilo;
alter table public.recipes rename column target_volume_liters to volume_previsto_litros;
alter table public.recipes rename column notes to observacoes;
alter table public.recipes rename column is_active to ativo;
alter table public.recipes rename column created_at to criado_em;
alter table public.recipes rename column updated_at to atualizado_em;

alter table public.recipe_versions rename column recipe_id to id_receita;
alter table public.recipe_versions rename column version_number to numero_versao;
alter table public.recipe_versions rename column target_og to og_previsto;
alter table public.recipe_versions rename column target_fg to fg_previsto;
alter table public.recipe_versions rename column target_abv to abv_previsto;
alter table public.recipe_versions rename column target_ibu to ibu_previsto;
alter table public.recipe_versions rename column notes to observacoes;
alter table public.recipe_versions rename column is_active to ativo;
alter table public.recipe_versions rename column created_at to criado_em;
alter table public.recipe_versions rename column updated_at to atualizado_em;

alter table public.recipe_inputs rename column recipe_version_id to id_versao_receita;
alter table public.recipe_inputs rename column item_id to id_item;
alter table public.recipe_inputs rename column stage to etapa;
alter table public.recipe_inputs rename column planned_quantity to quantidade_prevista;
alter table public.recipe_inputs rename column sort_order to ordem;
alter table public.recipe_inputs rename column notes to observacoes;
alter table public.recipe_inputs rename column created_at to criado_em;

alter table public.brew_batches rename column batch_number to numero_brassagem;
alter table public.brew_batches rename column recipe_version_id to id_versao_receita;
alter table public.brew_batches rename column current_stage to etapa_atual;
alter table public.brew_batches rename column planned_volume_liters to volume_previsto_litros;
alter table public.brew_batches rename column final_volume_liters to volume_final_litros;
alter table public.brew_batches rename column started_at to iniciada_em;
alter table public.brew_batches rename column finalized_at to finalizada_em;
alter table public.brew_batches rename column stock_posted_at to estoque_baixado_em;
alter table public.brew_batches rename column notes to observacoes;
alter table public.brew_batches rename column created_by to criado_por;
alter table public.brew_batches rename column created_at to criado_em;
alter table public.brew_batches rename column updated_at to atualizado_em;

alter table public.brew_batch_consumptions rename column brew_batch_id to id_brassagem;
alter table public.brew_batch_consumptions rename column recipe_input_id to id_insumo_receita;
alter table public.brew_batch_consumptions rename column item_id to id_item;
alter table public.brew_batch_consumptions rename column lot_id to id_lote;
alter table public.brew_batch_consumptions rename column stage to etapa;
alter table public.brew_batch_consumptions rename column planned_quantity to quantidade_prevista;
alter table public.brew_batch_consumptions rename column actual_quantity to quantidade_real;
alter table public.brew_batch_consumptions rename column stock_movement_id to id_movimentacao_estoque;
alter table public.brew_batch_consumptions rename column notes to observacoes;
alter table public.brew_batch_consumptions rename column created_at to criado_em;
alter table public.brew_batch_consumptions rename column updated_at to atualizado_em;

alter table public.brew_batch_extra_costs rename column brew_batch_id to id_brassagem;
alter table public.brew_batch_extra_costs rename column cost_type to tipo_custo;
alter table public.brew_batch_extra_costs rename column description to descricao;
alter table public.brew_batch_extra_costs rename column amount to valor;
alter table public.brew_batch_extra_costs rename column occurred_at to ocorrido_em;
alter table public.brew_batch_extra_costs rename column notes to observacoes;
alter table public.brew_batch_extra_costs rename column created_at to criado_em;

alter table public.brew_batch_events rename column brew_batch_id to id_brassagem;
alter table public.brew_batch_events rename column stage to etapa;
alter table public.brew_batch_events rename column event_at to evento_em;
alter table public.brew_batch_events rename column description to descricao;
alter table public.brew_batch_events rename column created_by to criado_por;
alter table public.brew_batch_events rename column created_at to criado_em;

alter table public.app_users rename to usuarios_app;
alter table public.suppliers rename to fornecedores;
alter table public.units rename to unidades;
alter table public.items rename to itens;
alter table public.item_lots rename to lotes_itens;
alter table public.stock_movements rename to movimentacoes_estoque;
alter table public.recipes rename to receitas;
alter table public.recipe_versions rename to versoes_receitas;
alter table public.recipe_inputs rename to insumos_receita;
alter table public.brew_batches rename to brassagens;
alter table public.brew_batch_consumptions rename to consumos_brassagem;
alter table public.brew_batch_extra_costs rename to custos_extras_brassagem;
alter table public.brew_batch_events rename to eventos_brassagem;

alter function public.set_updated_at() rename to definir_atualizado_em;

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

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
left join public.lotes_itens l on l.id_item = i.id
left join public.movimentacoes_estoque me on me.id_item = i.id and me.id_lote is not distinct from l.id
group by i.id, i.nome, i.tipo, i.categoria, i.codigo_unidade, i.estoque_minimo, l.id, l.codigo_lote, l.validade, l.custo_unitario;

create or replace view public.vw_custos_brassagem
with (security_invoker = true) as
select
  b.id as id_brassagem,
  b.numero_brassagem,
  b.status,
  b.volume_previsto_litros,
  b.volume_final_litros,
  greatest(b.volume_previsto_litros - coalesce(b.volume_final_litros, 0), 0) as perda_litros,
  case
    when b.volume_previsto_litros > 0 and b.volume_final_litros is not null
      then greatest(b.volume_previsto_litros - b.volume_final_litros, 0) / b.volume_previsto_litros
    else null
  end as percentual_perda,
  coalesce(sum(c.quantidade_real * l.custo_unitario), 0) as custo_insumos,
  coalesce(extra.custo_extra, 0) as custo_extra,
  coalesce(sum(c.quantidade_real * l.custo_unitario), 0) + coalesce(extra.custo_extra, 0) as custo_total,
  case
    when b.volume_final_litros is not null and b.volume_final_litros > 0
      then (coalesce(sum(c.quantidade_real * l.custo_unitario), 0) + coalesce(extra.custo_extra, 0)) / b.volume_final_litros
    else null
  end as custo_por_litro
from public.brassagens b
left join public.consumos_brassagem c on c.id_brassagem = b.id
left join public.lotes_itens l on l.id = c.id_lote
left join (
  select id_brassagem, sum(valor) as custo_extra
  from public.custos_extras_brassagem
  group by id_brassagem
) extra on extra.id_brassagem = b.id
group by b.id, b.numero_brassagem, b.status, b.volume_previsto_litros, b.volume_final_litros, extra.custo_extra;

grant usage on type public.tipo_item to authenticated;
grant usage on type public.tipo_movimentacao_estoque to authenticated;
grant usage on type public.status_brassagem to authenticated;
grant usage on type public.etapa_brassagem to authenticated;
grant usage on type public.tipo_custo_extra_brassagem to authenticated;
grant select on public.vw_saldos_estoque to authenticated;
grant select on public.vw_custos_brassagem to authenticated;

comment on table public.brassagens is 'Produto acabado e controlado em volume_final_litros na brassagem, sem estoque separado no MVP.';
comment on column public.brassagens.estoque_baixado_em is 'A baixa de estoque acontece somente quando a brassagem e finalizada.';
