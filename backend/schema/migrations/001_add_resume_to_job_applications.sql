-- Add optional resume column to job_applications (for existing databases)
alter table public.job_applications
  add column if not exists resume text;
