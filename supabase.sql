
-- Supabase schema for Yadarm (with RLS)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_modify_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags_select_own" on public.tags for select using (auth.uid() = user_id);
create policy "tags_modify_own" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "note_tags_select_own" on public.note_tags for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "note_tags_modify_own" on public.note_tags for all using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
) with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
