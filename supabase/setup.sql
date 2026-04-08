-- ============================================
-- RAYDR - Complete Supabase Setup
-- ============================================
-- Paste this ENTIRE script into Supabase SQL Editor and run it once.
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste > Run

-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  department text not null default '',
  title text default '',
  total_xp integer default 0,
  level integer default 1,
  streak integer default 0,
  created_at timestamptz default now()
);

-- Seasons
create table if not exists seasons (
  id serial primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false
);

-- Projects
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  problem_statement text not null default '',
  solution_summary text not null default '',
  demo_url text,
  repo_url text,
  screenshot_urls text[] default '{}',
  video_url text,
  tech_stack text[] default '{}',
  ai_tools_used text[] default '{}',
  replaces_tool text,
  annual_cost_replaced numeric default 0,
  estimated_hours_saved_weekly numeric default 0,
  team_members uuid[] default '{}',
  submitted_by uuid references profiles(id),
  season integer references seasons(id),
  week integer not null default 1,
  status text default 'submitted' check (status in ('draft', 'submitted', 'featured')),
  adoption_count integer default 0,
  tool_request_id uuid references tool_requests(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Achievements
create table if not exists achievements (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  icon text not null,
  criteria text not null,
  xp_reward integer default 0
);

-- User Achievements (join table)
create table if not exists user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- Tool Requests
create table if not exists tool_requests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  requested_by uuid references profiles(id),
  current_tool text,
  current_cost numeric default 0,
  upvotes integer default 0,
  status text default 'open' check (status in ('open', 'claimed', 'completed')),
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  bonus_xp integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================
-- When a user signs up via Auth, this automatically creates their profile row.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    ''
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 3. RESTRICT SIGNUPS TO @christex.foundation
-- ============================================
-- This blocks any signup that doesn't use a @christex.foundation email.

create or replace function public.check_email_domain()
returns trigger as $$
begin
  if new.email not like '%@christex.foundation' then
    raise exception 'Only @christex.foundation emails are allowed to sign up.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_email_domain on auth.users;
create trigger enforce_email_domain
  before insert on auth.users
  for each row execute function public.check_email_domain();

-- ============================================
-- 4. RPC FUNCTIONS (used by the dashboard)
-- ============================================

-- Dashboard totals
create or replace function get_totals()
returns json as $$
  select json_build_object(
    'total_cost_saved', coalesce(sum(annual_cost_replaced), 0),
    'total_hours_saved', coalesce(sum(estimated_hours_saved_weekly), 0),
    'total_adoptions', coalesce(sum(adoption_count), 0),
    'total_projects', count(*),
    'active_builders', (select count(*) from profiles)
  )
  from projects
  where status in ('submitted', 'featured');
$$ language sql;

-- Department breakdown
create or replace function get_department_stats()
returns table(
  department text,
  total_projects bigint,
  total_cost_saved numeric,
  total_hours_saved numeric,
  active_builders bigint
) as $$
  select
    p.department,
    count(distinct pr.id) as total_projects,
    coalesce(sum(pr.annual_cost_replaced), 0) as total_cost_saved,
    coalesce(sum(pr.estimated_hours_saved_weekly), 0) as total_hours_saved,
    count(distinct p.id) as active_builders
  from profiles p
  left join projects pr on pr.submitted_by = p.id
  group by p.department
  order by total_cost_saved desc;
$$ language sql;

-- Upvote a tool request
create or replace function increment_upvote(request_id uuid)
returns void as $$
  update tool_requests
  set upvotes = upvotes + 1
  where id = request_id;
$$ language sql;

-- Add XP to a user
create or replace function add_xp(user_id uuid, amount integer)
returns void as $$
  update profiles
  set total_xp = total_xp + amount
  where id = user_id;
$$ language sql security definer;

-- Deduct XP from a user (clamped to 0)
create or replace function deduct_xp(user_id uuid, amount integer)
returns void as $$
  update profiles
  set total_xp = greatest(total_xp - amount, 0)
  where id = user_id;
$$ language sql security definer;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table projects enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table tool_requests enable row level security;
alter table seasons enable row level security;

-- Profiles: anyone can read, users can insert their own, users update own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Projects: anyone can read, auth users insert own, owners update
create policy "projects_read" on projects for select using (true);
create policy "projects_insert" on projects for insert with check (auth.uid() = submitted_by);
create policy "projects_update" on projects for update using (auth.uid() = submitted_by);

-- Achievements: public read
create policy "achievements_read" on achievements for select using (true);
create policy "user_achievements_read" on user_achievements for select using (true);

-- Tool Requests: anyone reads, auth users create/update
create policy "requests_read" on tool_requests for select using (true);
create policy "requests_insert" on tool_requests for insert with check (auth.uid() = requested_by);
create policy "requests_update" on tool_requests for update using (true);

-- Seasons: public read
create policy "seasons_read" on seasons for select using (true);

-- ============================================
-- 6. SEED DATA
-- ============================================

-- Create first season
insert into seasons (name, start_date, end_date, is_active)
values ('Season 1', '2026-02-01', '2026-04-30', true);

-- Seed achievements
insert into achievements (name, description, icon, criteria, xp_reward) values
  ('First Ship', 'Submit your first Raydr project', '🚀', 'first_submission', 100),
  ('10x Saver', 'Save 10x more than the tool costs', '💰', 'cost_saved_10x', 500),
  ('Serial Builder', 'Submit 5 weeks in a row', '🔥', 'streak_5', 300),
  ('Team Player', 'Collaborate with 3+ departments', '🤝', 'cross_dept_3', 250),
  ('AI Polyglot', 'Use 5+ different AI tools', '🧠', 'ai_tools_5', 200),
  ('Crowd Favorite', 'Get the most votes in a week', '⭐', 'weekly_winner', 400),
  ('Adopted!', 'Your project gets adopted by 5+ teams', '📦', 'adoption_5', 500),
  ('Speed Demon', 'Build and submit in under 24 hours', '⚡', 'fast_ship', 150);

-- ============================================
-- 7. STORAGE (for avatar uploads)
-- ============================================
-- Run this in the SQL editor to create an avatars bucket:

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "avatars_upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
create policy "avatars_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to read avatars (public bucket)
create policy "avatars_read" on storage.objects for select
  using (bucket_id = 'avatars');

-- ============================================
-- DONE! Now go set up your .env file:
--   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
-- ============================================
