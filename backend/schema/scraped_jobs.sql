create table if not exists public.scraped_jobs (
  id              bigserial primary key,
  external_id     text unique not null,
  title           text,
  company_name    text,
  location        text,
  job_url         text,
  description     text,
  posted_date     timestamptz,
  salary_min      text,
  salary_max      text,
  experience      text,
  work_type       text,
  remote_location text,
  company_domain  text,
  employment_type text,
  ai_core_responsibilities text,
  ai_requirements_summary  text,
  enriched_data   jsonb,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create index if not exists idx_scraped_jobs_posted_date  on public.scraped_jobs (posted_date desc);
create index if not exists idx_scraped_jobs_company_name on public.scraped_jobs (company_name);
create index if not exists idx_scraped_jobs_is_active    on public.scraped_jobs (is_active);

alter table public.scraped_jobs enable row level security;

create policy "Authenticated users can read scraped jobs"
  on public.scraped_jobs for select
  to authenticated using (true);

-- Track which scraped jobs each user has viewed
create table if not exists public.user_viewed_scraped_jobs (
  user_id   uuid references auth.users (id) on delete cascade,
  job_id    bigint references public.scraped_jobs (id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (user_id, job_id)
);

create index if not exists idx_user_viewed_scraped_jobs_user on public.user_viewed_scraped_jobs (user_id);

alter table public.user_viewed_scraped_jobs enable row level security;

create policy "Users can manage their own viewed scraped jobs"
  on public.user_viewed_scraped_jobs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
