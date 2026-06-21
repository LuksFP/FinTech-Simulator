-- Anexo de comprovante nas transações.
-- 1) Coluna para guardar o caminho do comprovante no Storage
alter table public.transactions add column if not exists receipt_url text;

-- 2) Bucket privado de comprovantes
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 3) RLS no Storage: cada usuário só acessa arquivos na pasta dele
--    (caminho no formato: <auth.uid>/<arquivo>)
create policy "receipts_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
