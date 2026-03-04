-- Profiles table: stores display name and role for each user
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Note: inserts are done by the backend using the service role key (bypasses RLS)
