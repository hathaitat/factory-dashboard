-- Create a storage bucket for 'documents' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Allow public read access to documents
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

-- Allow authenticated users to upload documents
create policy "Authenticated users can upload documents"
  on storage.objects for insert
  with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their own documents
create policy "Authenticated users can update documents"
  on storage.objects for update
  with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete documents
create policy "Authenticated users can delete documents"
  on storage.objects for delete
  using ( bucket_id = 'documents' and auth.role() = 'authenticated' );
