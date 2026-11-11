-- Fase 2 do modulo de notas de entrada.
-- Protege o XML original em um bucket privado e impede a importacao repetida
-- do mesmo arquivo, mesmo quando duas requisicoes chegam simultaneamente.

create unique index uq_notas_entrada_arquivo_hash_sha256
  on public.notas_entrada (arquivo_hash_sha256)
  where arquivo_hash_sha256 is not null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documentos-notas-entrada',
  'documentos-notas-entrada',
  false,
  5242880,
  array['application/xml', 'text/xml']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy pl_documentos_notas_entrada_ler_autenticado
on storage.objects for select to authenticated
using (bucket_id = 'documentos-notas-entrada');

create policy pl_documentos_notas_entrada_inserir_autenticado
on storage.objects for insert to authenticated
with check (bucket_id = 'documentos-notas-entrada');

create policy pl_documentos_notas_entrada_excluir_autenticado
on storage.objects for delete to authenticated
using (bucket_id = 'documentos-notas-entrada');

comment on index public.uq_notas_entrada_arquivo_hash_sha256 is
  'Impede a importacao repetida do mesmo conteudo XML.';
