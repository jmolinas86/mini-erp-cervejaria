-- Fase 10: índices para as referências de item/grupo usadas por estoque e relatórios.
create index if not exists idx_itens_codigo_grupo on public.itens (codigo_grupo);
create index if not exists idx_lotes_itens_codigo_grupo on public.lotes_itens (codigo_grupo);
create index if not exists idx_lotes_itens_codigo_item on public.lotes_itens (codigo_item);
create index if not exists idx_movimentacoes_estoque_codigo_grupo on public.movimentacoes_estoque (codigo_grupo);
create index if not exists idx_movimentacoes_estoque_codigo_item on public.movimentacoes_estoque (codigo_item);
