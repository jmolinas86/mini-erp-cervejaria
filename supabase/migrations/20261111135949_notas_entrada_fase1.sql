-- Fase 1 do modulo de notas de entrada.
-- Estrutura os documentos, suas linhas e o mapeamento recorrente de produtos
-- de fornecedores. A confirmacao no estoque sera implementada em fase posterior.

alter table public.fornecedores
  add column cnpj text;

alter table public.fornecedores
  add constraint chk_fornecedores_cnpj_formato
  check (cnpj is null or cnpj ~ '^[0-9]{14}$');

alter table public.fornecedores
  add constraint uq_fornecedores_cnpj unique (cnpj);

create table public.notas_entrada (
  id uuid primary key default gen_random_uuid(),
  id_fornecedor uuid references public.fornecedores(id) on delete restrict,
  origem_documento text not null default 'xml',
  status text not null default 'rascunho',
  chave_acesso text,
  modelo_documento text,
  numero_documento text,
  serie_documento text,
  emitida_em timestamptz,
  fornecedor_cnpj text,
  fornecedor_razao_social text,
  fornecedor_inscricao_estadual text,
  valor_produtos numeric(14, 2) not null default 0,
  valor_frete numeric(14, 2) not null default 0,
  valor_seguro numeric(14, 2) not null default 0,
  valor_desconto numeric(14, 2) not null default 0,
  valor_outras_despesas numeric(14, 2) not null default 0,
  valor_total numeric(14, 2) not null default 0,
  arquivo_nome text,
  arquivo_caminho text,
  arquivo_hash_sha256 text,
  observacoes text,
  criado_por uuid references public.usuarios_app(id) on delete set null,
  confirmado_por uuid references public.usuarios_app(id) on delete set null,
  confirmado_em timestamptz,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_notas_entrada_chave_acesso unique (chave_acesso),
  constraint chk_notas_entrada_origem check (origem_documento in ('xml', 'pdf', 'manual')),
  constraint chk_notas_entrada_status check (status in ('rascunho', 'em_conferencia', 'confirmada', 'cancelada', 'revertida')),
  constraint chk_notas_entrada_chave_acesso check (chave_acesso is null or chave_acesso ~ '^[0-9]{44}$'),
  constraint chk_notas_entrada_cnpj_emitente check (fornecedor_cnpj is null or fornecedor_cnpj ~ '^[0-9]{14}$'),
  constraint chk_notas_entrada_hash check (arquivo_hash_sha256 is null or arquivo_hash_sha256 ~ '^[0-9a-fA-F]{64}$'),
  constraint chk_notas_entrada_valores check (
    valor_produtos >= 0
    and valor_frete >= 0
    and valor_seguro >= 0
    and valor_desconto >= 0
    and valor_outras_despesas >= 0
    and valor_total >= 0
  ),
  constraint chk_notas_entrada_confirmacao check (status <> 'confirmada' or confirmado_em is not null),
  constraint chk_notas_entrada_cancelamento check (
    status not in ('cancelada', 'revertida')
    or (cancelada_em is not null and nullif(btrim(motivo_cancelamento), '') is not null)
  )
);

create unique index uq_notas_entrada_identificacao_documento
  on public.notas_entrada (fornecedor_cnpj, modelo_documento, serie_documento, numero_documento)
  where fornecedor_cnpj is not null
    and modelo_documento is not null
    and serie_documento is not null
    and numero_documento is not null;

create index idx_notas_entrada_id_fornecedor on public.notas_entrada(id_fornecedor);
create index idx_notas_entrada_status_emitida_em on public.notas_entrada(status, emitida_em desc);
create index idx_notas_entrada_criado_por on public.notas_entrada(criado_por);
create index idx_notas_entrada_confirmado_por on public.notas_entrada(confirmado_por);

create table public.itens_notas_entrada (
  id uuid primary key default gen_random_uuid(),
  id_nota_entrada uuid not null references public.notas_entrada(id) on delete cascade,
  numero_item integer not null,
  codigo_produto_fornecedor text,
  ean_gtin text,
  descricao_produto text not null,
  ncm text,
  cfop text,
  unidade_comercial text not null,
  quantidade_comercial numeric(18, 6) not null,
  valor_unitario_comercial numeric(18, 8) not null default 0,
  valor_produtos numeric(14, 2) not null default 0,
  valor_frete numeric(14, 2) not null default 0,
  valor_seguro numeric(14, 2) not null default 0,
  valor_desconto numeric(14, 2) not null default 0,
  valor_outras_despesas numeric(14, 2) not null default 0,
  valor_liquido numeric(14, 2) generated always as (
    valor_produtos + valor_frete + valor_seguro + valor_outras_despesas - valor_desconto
  ) stored,
  id_item uuid references public.itens(id) on delete restrict,
  codigo_unidade_destino text references public.unidades(codigo) on delete restrict,
  fator_conversao numeric(18, 8) not null default 1,
  quantidade_convertida numeric(18, 6),
  custo_unitario_convertido numeric(18, 8),
  ignorado boolean not null default false,
  id_lote uuid references public.lotes_itens(id) on delete set null,
  id_movimentacao_estoque uuid unique references public.movimentacoes_estoque(id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_itens_notas_entrada_nota_numero unique (id_nota_entrada, numero_item),
  constraint chk_itens_notas_entrada_numero check (numero_item > 0),
  constraint chk_itens_notas_entrada_quantidade check (quantidade_comercial > 0),
  constraint chk_itens_notas_entrada_valores check (
    valor_unitario_comercial >= 0
    and valor_produtos >= 0
    and valor_frete >= 0
    and valor_seguro >= 0
    and valor_desconto >= 0
    and valor_outras_despesas >= 0
    and valor_liquido >= 0
  ),
  constraint chk_itens_notas_entrada_fator check (fator_conversao > 0),
  constraint chk_itens_notas_entrada_quantidade_convertida check (quantidade_convertida is null or quantidade_convertida > 0),
  constraint chk_itens_notas_entrada_custo_convertido check (custo_unitario_convertido is null or custo_unitario_convertido >= 0),
  constraint chk_itens_notas_entrada_ncm check (ncm is null or ncm ~ '^[0-9]{8}$'),
  constraint chk_itens_notas_entrada_cfop check (cfop is null or cfop ~ '^[0-9]{4}$'),
  constraint chk_itens_notas_entrada_lote_item check (id_lote is null or id_item is not null)
);

create index idx_itens_notas_entrada_id_item on public.itens_notas_entrada(id_item);
create index idx_itens_notas_entrada_codigo_unidade on public.itens_notas_entrada(codigo_unidade_destino);
create index idx_itens_notas_entrada_id_lote on public.itens_notas_entrada(id_lote);

create table public.mapeamentos_itens_fornecedores (
  id uuid primary key default gen_random_uuid(),
  id_fornecedor uuid not null references public.fornecedores(id) on delete cascade,
  codigo_produto_fornecedor text not null,
  descricao_produto_fornecedor text,
  unidade_fornecedor text,
  id_item uuid not null references public.itens(id) on delete cascade,
  codigo_unidade_destino text not null references public.unidades(codigo) on delete restrict,
  fator_conversao numeric(18, 8) not null default 1,
  ativo boolean not null default true,
  criado_por uuid references public.usuarios_app(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_mapeamentos_itens_fornecedores_codigo unique (id_fornecedor, codigo_produto_fornecedor),
  constraint chk_mapeamentos_itens_fornecedores_codigo check (nullif(btrim(codigo_produto_fornecedor), '') is not null),
  constraint chk_mapeamentos_itens_fornecedores_fator check (fator_conversao > 0)
);

create index idx_mapeamentos_itens_fornecedores_id_item on public.mapeamentos_itens_fornecedores(id_item);
create index idx_mapeamentos_itens_fornecedores_codigo_unidade on public.mapeamentos_itens_fornecedores(codigo_unidade_destino);
create index idx_mapeamentos_itens_fornecedores_criado_por on public.mapeamentos_itens_fornecedores(criado_por);

create trigger trg_notas_entrada_atualizado_em
before update on public.notas_entrada
for each row execute function public.definir_atualizado_em();

create trigger trg_itens_notas_entrada_atualizado_em
before update on public.itens_notas_entrada
for each row execute function public.definir_atualizado_em();

create trigger trg_mapeamentos_itens_fornecedores_atualizado_em
before update on public.mapeamentos_itens_fornecedores
for each row execute function public.definir_atualizado_em();

alter table public.notas_entrada enable row level security;
alter table public.itens_notas_entrada enable row level security;
alter table public.mapeamentos_itens_fornecedores enable row level security;

grant select, insert, update, delete on public.notas_entrada to authenticated;
grant select, insert, update, delete on public.itens_notas_entrada to authenticated;
grant select, insert, update, delete on public.mapeamentos_itens_fornecedores to authenticated;

create policy pl_notas_entrada_gerenciar_autenticado
on public.notas_entrada for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy pl_itens_notas_entrada_gerenciar_autenticado
on public.itens_notas_entrada for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy pl_mapeamentos_itens_fornecedores_gerenciar_autenticado
on public.mapeamentos_itens_fornecedores for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

comment on table public.notas_entrada is 'Documentos de compra usados como origem para futuras entradas de estoque.';
comment on table public.itens_notas_entrada is 'Linhas importadas de notas, com vinculo opcional ao cadastro e conversao para a unidade interna.';
comment on table public.mapeamentos_itens_fornecedores is 'Vinculos reutilizaveis entre codigos de produtos dos fornecedores e itens do HopFlow.';
comment on column public.notas_entrada.chave_acesso is 'Chave de acesso de 44 digitos da NF-e, quando a origem for XML.';
comment on column public.itens_notas_entrada.valor_liquido is 'Valor do item com frete, seguro, outras despesas e desconto da propria linha.';

