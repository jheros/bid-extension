create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- RLS: users can only access their own profiles
alter table public.profiles enable row level security;

create policy "Users can select own profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profiles"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profiles"
  on public.profiles for delete
  using (auth.uid() = user_id);
