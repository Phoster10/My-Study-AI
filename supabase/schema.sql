-- Study AI database schema. Run this in the Supabase SQL editor for your project.
-- Tables: user_stats (XP) and summaries (History). Both cascade-delete with the user.

-- XP tracking. In the original app this table's equivalent (a jsonb "memory"
-- blob on a user_memory table) existed and was displayed, but the endpoint
-- that was supposed to increment it (app/api/xp/update) was never actually
-- called anywhere in the original frontend — it was dead code. This table
-- restores real, working XP tracking.
create table if not exists user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table user_stats enable row level security;

create policy "Users can read their own XP"
  on user_stats for select
  using (auth.uid() = user_id);

-- Saved summaries, backing the History page. A saved summary keeps the
-- original source text too, since History lets you generate a fresh exam
-- from a past note.
create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary_type text not null,
  source_text text not null,
  summary_text text not null,
  created_at timestamptz not null default now()
);

alter table summaries enable row level security;

create policy "Users can read their own summaries"
  on summaries for select
  using (auth.uid() = user_id);

create policy "Users can modify their own summaries"
  on summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
