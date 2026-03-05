-- Migration 004: Replace the global unique index on job_applications with
-- two profile-aware partial indexes so the same application can be saved
-- under different profiles.

drop index if exists public.idx_job_applications_user_url_title_company;

-- Applications WITH a profile: unique per (user, url, title, company, profile)
create unique index if not exists idx_job_applications_unique_with_profile
  on public.job_applications (user_id, url, job_title, company, profile_id)
  where profile_id is not null;

-- Applications WITHOUT a profile: unique per (user, url, title, company)
create unique index if not exists idx_job_applications_unique_no_profile
  on public.job_applications (user_id, url, job_title, company)
  where profile_id is null;
