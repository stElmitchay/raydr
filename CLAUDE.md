# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Raydr — an open platform where both Christex Foundation employees (internal) and the broader community submit software projects, get AI-powered progress analysis via GitHub integration, and earn XP through monthly demo cycles. Gamification layer includes XP/leveling, milestones, leaderboards, and achievement badges.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run check` — Svelte type checking (`svelte-check`)
- No test runner is configured

## Tech Stack

- **SvelteKit** (Svelte 5 with runes: `$state`, `$props`, `$derived`) + TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, no `tailwind.config` — uses CSS-based config in `app.css`)
- **Supabase** for auth, database, storage, and RPC functions
- **Claude API** (direct fetch, no SDK) for AI analysis and README generation
- **GitHub API** (direct fetch, no Octokit) for repo stats, commit analysis, and PR creation
- `@sveltejs/adapter-auto` for deployment

## Architecture

### Auth & Session

Server hook (`src/hooks.server.ts`) creates a Supabase server client per request via `@supabase/ssr` and eagerly loads session/user into `event.locals`. The layout server load auto-creates profiles on first login via upsert. Users have a `role` field: `'internal'` (auto-set for `@christex.foundation` emails) or `'community'` (everyone else). Signups are open to all.

### GitHub OAuth

Separate from Supabase auth — GitHub is a secondary connection for API access, not an identity provider. OAuth flow uses `+server.ts` routes (the only non-form-action server routes in the app):
- `src/routes/auth/github/+server.ts` — redirects to GitHub with CSRF state
- `src/routes/auth/github/callback/+server.ts` — exchanges code, stores token in `github_connections` table via service-role client

Tokens are stored in `github_connections` table. Service-role Supabase client (`src/lib/server/supabase-admin.ts`) bypasses RLS for writing tokens/analyses.

### Key Data Model (see `src/lib/types.ts`)

- **Profile** — user with XP, level, streak, department, role (internal/community), GitHub connection
- **Project** — submitted project with optional cost/hours metrics, tied to season + demo_cycle, tagged as internal/community
- **AIAnalysis** — AI-generated analysis of repo progress per demo cycle, includes DPG evaluation
- **Milestone** — individual achievement detected by AI (feature, bugfix, docs, etc.)
- **NextStep** — AI-recommended goals for upcoming demo cycles
- **DPGEvaluation** — Digital Public Goods compliance assessment (9 indicators)
- **Newsletter** — auto-generated recap of a demo cycle
- **GitHubConnection** — OAuth tokens for GitHub API access
- **ToolRequest** — bounty board: users request tools, others claim and fulfill for bonus XP
- **Challenge** — time-bound goals (cost saved, projects built, hours saved)
- **Season** — time periods that scope projects and leaderboards

### AI Features (src/lib/server/)

- `claude.ts` — `callClaude()` (exported), `analyzeRepoProgress()` (returns milestones + next steps), `generateReadme()`
- `dpg.ts` — `evaluateDPGCompliance()` evaluates repos against 9 DPG Standard indicators
- `newsletter.ts` — `generateNewsletter()` auto-generates demo cycle recaps via Claude
- AI analysis route: `src/routes/projects/[id]/analyze/` — runs progress analysis + DPG evaluation + next steps
- README generation route: `src/routes/projects/[id]/generate-readme/` (includes PR push to GitHub)

### GitHub Integration (src/lib/server/github.ts)

Helper functions using direct `fetch`: `parseRepoUrl`, `getRepoInfo`, `getCommitsSince`, `getReadmeContent`, `getLicenseInfo`, `createBranch`, `createOrUpdateFile`, `createPullRequest`. Error handling distinguishes 401/403/404.

### Demo Day Mode

On the last Thursday of each month, the platform auto-detects demo day via `isDemoDay()` in `src/lib/server/demo-day.ts`. When active: dashboard redirects to `/demo-day`, a persistent banner appears across the app, and a live dashboard shows cycle projects, milestones, and leaderboard. The `/demo-day` route works on any day for testing.

### Newsletter System

Newsletters are auto-generated on first visit to `/recaps/[cycle]/newsletter` after the demo day has ended. Uses Claude to summarize: top projects, milestones, leaderboard, department highlights. Stored in `newsletters` table with markdown content.

### Gamification System

XP constants in `src/lib/constants.ts`. XP awarded via Supabase RPCs (`add_xp`, `deduct_xp`). AI analysis can suggest XP (capped at 500/cycle). Streaks now count consecutive monthly demo cycles (`calculate_monthly_streak`). Tool request claims expire after 14 days with penalty (`src/lib/server/expire-claims.ts`).

### Monthly Demo Cadence

Projects are submitted on monthly demo cycles (last Thursday of each month). Utilities in `src/lib/server/demo-cycle.ts`: `getCurrentDemoCycle`, `getNextDemoDay`, `daysUntilDemoDay`, `getLastThursday`. Projects have both `week` (legacy) and `demo_cycle` fields.

### Database

Supabase schema: `supabase/setup.sql`, `supabase/migration-001-features.sql`, `supabase/migration-002-platform-evolution.sql`, `supabase/migration-003-next-features.sql`. Key RPCs: `get_department_stats`, `get_totals`, `add_xp`, `deduct_xp`, `calculate_monthly_streak`, `award_analysis_xp`. Storage buckets: `project-media`, `avatars`.

### Filtering

Projects, leaderboard, and analytics support `type` filter param (`all`, `internal`, `community`) via URL query string.

### UI Structure

- Layout: `NavBar.svelte` + `FullScreenMenu.svelte` + `CommandPalette.svelte` with editorial dark theme
- Shared UI components in `src/lib/components/ui/`
- Most pages use SvelteKit form actions for mutations
- GitHub OAuth uses `+server.ts` routes (GET-based redirects)
- Navigation: Home, Projects, Community (Leaderboard/Builders/Challenges), Recaps, Profile
- Removed from primary nav: Catalog, Requests, Submit, Analytics (routes still accessible, analytics embedded in dashboard)

### Environment Variables

**Public** (via `$env/static/public`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`

**Private** (via `$env/static/private`): `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, `ANTHROPIC_API_KEY`
