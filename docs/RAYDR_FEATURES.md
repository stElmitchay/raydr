# Raydr Tracker — Feature Brainstorm & Roadmap

> The ultimate internal AI competition platform. Built with SvelteKit + Supabase + Tailwind.
> Meta play: winning Raydr by building the tool that tracks Raydr.

---

## What is Raydr?

An internal weekly competition where employees use AI tools to vibe-code internal tools — tools that replace expensive SaaS subscriptions or enhance internal processes, saving the company real money.

---

## Core Module: Project Submissions
- Submit projects with title, description, team/individual, tech stack used, AI tools used
- Record a **short demo video** or upload screenshots directly in-app
- Auto-detect and tag which AI tools were used (Cursor, Claude, Copilot, etc.)
- **Before/After comparison** — what was the old tool/process vs the new vibe-coded solution
- Git repo linking — pull in commit stats, lines of code, time to build

## The Money Shot: Impact Dashboard
- **Cost calculator** — each project logs what tool/service it replaces and the annual cost. Roll it up into a company-wide "Total Saved by Raydr" counter that ticks up in real time like a stock ticker
- **Time saved tracker** — estimate hours saved per week per user, multiply across teams
- **ROI leaderboard** — rank projects by dollars saved, hours saved, adoption rate
- **Executive summary view** — a single page a CEO can look at and immediately see the program's value. Charts, big numbers, trends over time

## Gamification & Competition Engine
- **Weekly leaderboards** with rankings by votes, impact score, creativity
- **Season system** — group weeks into seasons/quarters with overall champions
- **Achievement badges** — "First Submission", "10x Saver" (saved 10x the cost), "Serial Builder" (5 weeks in a row), "Team Player" (collaborated across departments), "AI Polyglot" (used 5+ different AI tools)
- **ELO-style rating system** — projects get rated against each other, builders accumulate a skill rating over time
- **Streak tracking** — consecutive weeks of submissions
- **XP and leveling** — gamify participation itself

## AI-Powered Features
- **AI project summarizer** — paste a repo URL or description, AI generates a polished project card
- **AI impact estimator** — describe what your tool replaces, AI estimates cost/time savings based on market data
- **Smart matching** — "Your project is similar to X built by Team Y last month" to prevent duplicate effort and encourage collaboration
- **AI-generated weekly newsletter** — auto-summarize the week's submissions, winners, stats into a company-wide email/Slack digest
- **Idea generator** — feed in your team's current paid tools and workflows, AI suggests what could be vibe-coded next
- **Sentiment analysis** on feedback/comments

## Knowledge Base & Reuse
- **Project catalog** — searchable archive of every Raydr project ever built
- **Adoption tracker** — after a project wins, track if teams actually adopt it. "Built in Raydr, now used by 3 teams daily"
- **Tech stack trends** — what AI tools and frameworks are people gravitating toward
- **Template library** — winning patterns that others can fork and build on
- **"Request a Tool"** board — anyone in the company can post "I wish someone would build X" and builders can claim requests

## Social & Culture
- **Builder profiles** — portfolio pages showing all your Raydr projects, win rate, total impact
- **Team pages** — see which departments are shipping the most
- **Activity feed** — real-time stream of submissions, votes, comments, achievements
- **Shoutout wall** — give kudos to other builders
- **Hall of Fame** — all-time greatest Raydr projects prominently displayed
- **Rivalry system** — friendly team vs team competition with head-to-head stats

## Live Event Mode
- **Presentation timer** — built-in countdown for demo day
- **Queue manager** — who's presenting next, auto-advance
- **Live dashboard** on a big screen during demo day showing votes streaming in
- **Confetti/celebration animations** when winners are announced

## Analytics & Insights
- **Participation trends** — is engagement growing week over week?
- **Department breakdown** — which teams participate the most/least
- **Tool replacement map** — visual graph of what paid tools have been replaced by Raydr projects
- **Cumulative impact over time** — big line going up and to the right
- **Individual growth tracking** — how builders improve over time

## Integrations
- **Slack bot** — submit projects, vote, get notifications, weekly reminders
- **Calendar integration** — auto-schedule demo days
- **GitHub/GitLab** — auto-pull project stats
- **SSO** — company login

---

## Why This Wins

1. **It's meta** — using Raydr to build the Raydr tracker is the most on-brand move possible
2. **It sells the program** — the impact dashboard alone justifies the entire Raydr competition to leadership
3. **It has legs** — this isn't a one-week novelty, it becomes essential infrastructure
4. **It showcases AI** — bake AI features into the tool itself to demonstrate what's possible
5. **It drives participation** — gamification and social features create a flywheel

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| **Framework** | SvelteKit | Less boilerplate, blazing fast, great DX |
| **Styling** | Tailwind CSS | Rapid UI development, consistent design |
| **Database + Auth** | Supabase | Free tier: Postgres, auth, real-time, file storage |
| **AI Features** | Claude API / Vercel AI SDK | Summarizers, impact estimator, newsletter |
| **Deploy** | Vercel | Free, instant deploys |
| **Realtime** | Supabase Realtime | Live activity feeds, dashboards |

**Total cost: $0**

---

## Implementation Priority

### MVP (Week 1 — Demo Day)
- [x] Project submission flow
- [x] Impact dashboard (cost-saved ticker)
- [x] Leaderboard with gamification
- [x] Builder profiles with XP/achievements
- [x] Project catalog with search
- [x] Tool request board
- [x] Analytics page with charts
- [ ] Supabase auth integration
- [ ] Real data persistence

### Phase 2
- [ ] AI-powered project summarizer
- [ ] AI impact estimator
- [ ] Slack bot integration
- [ ] Achievement system with auto-unlock
- [ ] Season system with archive

### Phase 3
- [ ] Live event mode for demo days
- [ ] AI-generated weekly newsletter
- [ ] Smart project matching
- [ ] Template library
- [ ] GitHub integration for auto-stats

---

## Database Schema (Supabase)

```sql
-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text not null,
  avatar_url text,
  department text not null,
  title text,
  total_xp integer default 0,
  level integer default 1,
  streak integer default 0,
  created_at timestamptz default now()
);

-- Seasons
create table seasons (
  id serial primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false
);

-- Projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  problem_statement text not null,
  solution_summary text not null,
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
  week integer not null,
  status text default 'draft' check (status in ('draft', 'submitted', 'featured')),
  adoption_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Achievements
create table achievements (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  icon text not null,
  criteria text not null,
  xp_reward integer default 0
);

-- User Achievements
create table user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  achievement_id uuid references achievements(id),
  earned_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- Tool Requests
create table tool_requests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  requested_by uuid references profiles(id),
  current_tool text,
  current_cost numeric default 0,
  upvotes integer default 0,
  status text default 'open' check (status in ('open', 'claimed', 'completed')),
  claimed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- RPC Functions (create these in Supabase SQL editor)

-- Get aggregate totals for dashboard
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

-- Get department stats
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

-- Increment upvote on tool request
create or replace function increment_upvote(request_id uuid)
returns void as $$
  update tool_requests
  set upvotes = upvotes + 1
  where id = request_id;
$$ language sql;

-- Enable Row Level Security
alter table profiles enable row level security;
alter table projects enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table tool_requests enable row level security;
alter table seasons enable row level security;

-- RLS Policies (allow read for all authenticated, write for own)
create policy "Public read" on profiles for select using (true);
create policy "Own update" on profiles for update using (auth.uid() = id);

create policy "Public read" on projects for select using (true);
create policy "Own insert" on projects for insert with check (auth.uid() = submitted_by);
create policy "Own update" on projects for update using (auth.uid() = submitted_by);

create policy "Public read" on achievements for select using (true);
create policy "Public read" on user_achievements for select using (true);

create policy "Public read" on tool_requests for select using (true);
create policy "Auth insert" on tool_requests for insert with check (auth.uid() = requested_by);
create policy "Auth update" on tool_requests for update using (auth.uid() = requested_by or auth.uid() = claimed_by);

create policy "Public read" on seasons for select using (true);
```
