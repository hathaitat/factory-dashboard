-- Drop the existing policy
drop policy if exists "Authenticated users can upload documents" on storage.objects;

-- Create a more permissive policy for the test environment
create policy "Anyone can upload documents"
  on storage.objects for insert
  with check ( bucket_id = 'documents' );
