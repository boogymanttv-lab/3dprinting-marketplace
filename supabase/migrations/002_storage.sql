-- =============================================
-- Storage bucket за снимки на обяви
-- Изпълни в SQL Editor на Supabase
-- =============================================

-- Създай bucket
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Позволи публично четене
create policy "Public read listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

-- Позволи upload само за логнати потребители
create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images' and
    auth.role() = 'authenticated'
  );

-- Позволи изтриване само на собственика
create policy "Users can delete own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
