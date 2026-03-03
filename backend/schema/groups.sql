-- Admin-managed user groups. Members can see each other's applications.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index idx_group_members_group_id on public.group_members (group_id);
create index idx_group_members_user_id on public.group_members (user_id);

-- Tables are admin-only; backend uses service role.
