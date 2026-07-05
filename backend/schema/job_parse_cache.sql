-- Shared, cross-user cache of LLM-parsed job postings.
-- Keyed by a normalized job URL; entries are considered valid for 7 days
-- (freshness enforced in the /api/job-parse route, which also reaps stale rows on read).
create table if not exists public.job_parse_cache (
  id           bigserial primary key,
  url_key      text unique not null,   -- normalized URL (cache key)
  url          text,                    -- original URL as received
  description  text,                    -- cleaned job description that was parsed
  fields       jsonb not null,          -- { jobTitle, company, location, workType, jobType, salary, securityClearance }
  model        text,                    -- model that produced the parse
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_job_parse_cache_url_key    on public.job_parse_cache (url_key);
create index if not exists idx_job_parse_cache_created_at on public.job_parse_cache (created_at);

alter table public.job_parse_cache enable row level security;

-- The backend accesses this table with the service role key (bypasses RLS).
-- Allow authenticated users to read the shared cache directly if ever needed.
create policy "Authenticated users can read job parse cache"
  on public.job_parse_cache for select
  to authenticated using (true);
