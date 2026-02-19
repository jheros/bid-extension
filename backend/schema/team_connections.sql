-- Team sharing requests and accepted connections.
create table if not exists public.team_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  constraint team_connections_no_self_request check (requester_id <> receiver_id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- Ensure only one row exists for an exact direction.
create unique index if not exists idx_team_connections_pair_direction
  on public.team_connections (requester_id, receiver_id);

create index if not exists idx_team_connections_requester_status
  on public.team_connections (requester_id, status);

create index if not exists idx_team_connections_receiver_status
  on public.team_connections (receiver_id, status);

alter table public.team_connections enable row level security;

create policy "Users can view own team rows"
  on public.team_connections for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);
