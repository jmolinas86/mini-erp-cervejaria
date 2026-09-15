-- Adiciona imagem opcional aos itens e configura o bucket público do catálogo.

alter table public.itens
  add column if not exists imagem_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens-itens',
  'imagens-itens',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagens_itens_select_publico" on storage.objects;
drop policy if exists "imagens_itens_insert_autenticado" on storage.objects;
drop policy if exists "imagens_itens_update_autenticado" on storage.objects;
drop policy if exists "imagens_itens_delete_autenticado" on storage.objects;

create policy "imagens_itens_select_publico"
  on storage.objects for select to public
  using (bucket_id = 'imagens-itens');

create policy "imagens_itens_insert_autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens-itens');

create policy "imagens_itens_update_autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'imagens-itens')
  with check (bucket_id = 'imagens-itens');

create policy "imagens_itens_delete_autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'imagens-itens');
