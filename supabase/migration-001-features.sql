-- ============================================
-- SINAI TRACKER - Feature Migration 001
-- ============================================
-- Run this in Supabase SQL Editor AFTER the initial setup.sql

-- ============================================
-- 1. COMMENTS TABLE
-- ============================================

create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at timestamptz default now()
);

create index if not exists idx_comments_project_id on comments(project_id);
create index if not exists idx_comments_created_at on comments(created_at);

alter table comments enable row level security;

create policy "comments_read" on comments for select using (true);
create policy "comments_insert" on comments for insert
  with check (auth.uid() = user_id);
create policy "comments_delete" on comments for delete
  using (auth.uid() = user_id);

-- ============================================
-- 2. ADOPTIONS TABLE
-- ============================================

create table if not exists adoptions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  adopted_at timestamptz default now(),
  unique(project_id, user_id)
);

create index if not exists idx_adoptions_project_id on adoptions(project_id);

alter table adoptions enable row level security;

create policy "adoptions_read" on adoptions for select using (true);
create policy "adoptions_insert" on adoptions for insert
  with check (auth.uid() = user_id);

-- ============================================
-- 3. CHALLENGES TABLE
-- ============================================

create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  season integer references seasons(id),
  title text not null,
  description text not null default '',
  metric text not null check (metric in ('cost_saved', 'projects', 'hours_saved')),
  target numeric not null default 0,
  start_date date not null,
  end_date date not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table challenges enable row level security;

create policy "challenges_read" on challenges for select using (true);

-- ============================================
-- 4. UPDATED XP RPCS (auto-update level)
-- ============================================
-- Level formula: floor(total_xp / 500) + 1

create or replace function add_xp(user_id uuid, amount integer)
returns void as $$
  update profiles
  set
    total_xp = total_xp + amount,
    level = floor((total_xp + amount) / 500) + 1
  where id = user_id;
$$ language sql security definer;

create or replace function deduct_xp(user_id uuid, amount integer)
returns void as $$
  update profiles
  set
    total_xp = greatest(total_xp - amount, 0),
    level = floor(greatest(total_xp - amount, 0) / 500) + 1
  where id = user_id;
$$ language sql security definer;

-- ============================================
-- 5. STREAK CALCULATION
-- ============================================

create or replace function calculate_streak(p_user_id uuid)
returns integer as $$
declare
  season_start date;
  current_week integer;
  check_week integer;
  has_submission boolean;
  streak integer := 0;
begin
  select s.start_date into season_start
  from seasons s where s.is_active = true limit 1;

  if season_start is null then
    update profiles set streak = 0 where id = p_user_id;
    return 0;
  end if;

  current_week := greatest(1, ceil(extract(epoch from (now() - season_start::timestamptz)) / (7 * 24 * 3600)));
  check_week := current_week;

  loop
    select exists(
      select 1 from projects
      where submitted_by = p_user_id and week = check_week
        and status in ('submitted', 'featured')
    ) into has_submission;

    if has_submission then
      streak := streak + 1;
      check_week := check_week - 1;
      if check_week < 1 then exit; end if;
    else
      exit;
    end if;
  end loop;

  update profiles set streak = calculate_streak.streak where id = p_user_id;
  return streak;
end;
$$ language plpgsql security definer;

-- ============================================
-- 6. INCREMENT ADOPTION COUNT
-- ============================================

create or replace function increment_adoption(p_project_id uuid)
returns void as $$
  update projects
  set adoption_count = adoption_count + 1
  where id = p_project_id;
$$ language sql security definer;

-- ============================================
-- 7. PROJECT MEDIA STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

create policy "project_media_upload" on storage.objects for insert
  with check (bucket_id = 'project-media' and auth.uid() is not null);

create policy "project_media_update" on storage.objects for update
  using (bucket_id = 'project-media' and auth.uid() is not null);

create policy "project_media_read" on storage.objects for select
  using (bucket_id = 'project-media');

-- ============================================
-- DONE! All 7 features are now supported.
-- ============================================
