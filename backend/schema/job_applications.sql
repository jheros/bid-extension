-- job_applications table
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_title text not null,
  company text not null,
  location text,
  work_type text,
  job_type text,
  salary text,
  security_clearance text,
  url text not null,
  platform text not null default 'other',
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes for common filters and ordering
create index idx_job_applications_user_id on public.job_applications (user_id);
create index idx_job_applications_applied_at on public.job_applications (user_id, applied_at desc);
create index idx_job_applications_platform on public.job_applications (user_id, platform);
create index idx_job_applications_job_type on public.job_applications (user_id, job_type);
create index idx_job_applications_work_type on public.job_applications (user_id, work_type);

-- Optional: unique constraint to support your duplicate check
create unique index idx_job_applications_user_url_title_company
  on public.job_applications (user_id, url, job_title, company);

-- Row Level Security (recommended with Supabase Auth)
alter table public.job_applications enable row level security;

create policy "Users can read own applications"
  on public.job_applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.job_applications for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.job_applications for delete
  using (auth.uid() = user_id);