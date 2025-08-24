create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  text text not null,
  tag_ids jsonb not null default '[]',
  status text not null default 'action',
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;
alter table public.notes enable row level security;
create policy if not exists "tags_select_own" on public.tags for select using (auth.uid() = user_id);
create policy if not exists "tags_modify_own" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy if not exists "notes_modify_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
