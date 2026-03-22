-- Private bucket for job application resumes (path: {user_id}/{uuid}.ext)
insert into storage.buckets (id, name, public)
values ('job-resumes', 'job-resumes', false)
on conflict (id) do nothing;

-- Authenticated users can upload only under their own user_id folder
drop policy if exists "job_resumes_insert_own" on storage.objects;
create policy "job_resumes_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read only their own folder (signed URLs / download)
drop policy if exists "job_resumes_select_own" on storage.objects;
create policy "job_resumes_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to remove their own uploads (optional cleanup)
drop policy if exists "job_resumes_delete_own" on storage.objects;
create policy "job_resumes_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'job-resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
